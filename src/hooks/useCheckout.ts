import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { isValidUUID, filterValidUUIDs } from '@/lib/validation';
import { apiFetch } from '@/lib/api';

// Fetch commission rate from platform settings
async function getCommissionRate(): Promise<number> {
  const data = await apiFetch('/platform_settings?key=commission_rate');
  
  // API returns array — get first item's value
  const setting = Array.isArray(data) ? data[0] : data;
  const rateValue = setting?.value?.rate ?? setting?.value ?? 15;
  return Number(rateValue) / 100;
}

export function useValidatedAddToCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ songId, licenseTierId }: { songId: string; licenseTierId: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!isValidUUID(songId)) throw new Error('Invalid song ID');
      if (!isValidUUID(licenseTierId)) throw new Error('Invalid license tier ID');

      // Fast path: First check the license tier type client-side
      const licenseTier = await apiFetch(`/license_tiers/${licenseTierId}`);
      if (!licenseTier) throw new Error('License tier not found');
      if (!licenseTier.is_available) throw new Error('This license is no longer available');

      const isExclusive = licenseTier.license_type === 'exclusive';

      // For EXCLUSIVE licenses, use the edge function (handles reservations)
      if (isExclusive) {
        const data = await apiFetch('/validate-cart-item', {
          method: 'POST',
          body: JSON.stringify({ song_id: songId, license_tier_id: licenseTierId })
        });
        if (data?.error) throw new Error(data.error);
        return data;
      }

      // For NON-EXCLUSIVE licenses, use fast direct database operations
      // Check max sales limit if applicable
      if (licenseTier.max_sales && licenseTier.current_sales >= licenseTier.max_sales) {
        throw new Error('Maximum sales limit reached for this license');
      }

      // Get seller_id from the song
      const song = await apiFetch(`/songs/${songId}`);
      if (!song) throw new Error('Song not found');

      // Fetch commission rate and calculate prices
      const commissionRate = await getCommissionRate();
      const basePrice = Number(licenseTier.price);
      const platformCommission = basePrice * commissionRate;

      // Upsert cart item (insert or update if exists)
      const data = await apiFetch('/cart_items', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          song_id: songId,
          license_tier_id: licenseTierId,
          seller_id: song.seller_id,
          base_price: basePrice,
          platform_commission: platformCommission,
          final_price: basePrice,
          is_exclusive: false,
        })
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      toast.success(data.message || 'Added to cart');
      
      if (data.is_exclusive) {
        toast.info('Exclusive license reserved for 30 minutes', {
          description: 'Complete checkout before reservation expires',
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCartWithTotals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart-with-totals'],
    queryFn: async () => {
      if (!user) {
        return { 
          items: [], 
          subtotal: 0, 
          buyerPlatformFee: 0, 
          total: 0, 
          itemCount: 0, 
          hasExclusiveItems: false, 
          hasOwnSongs: false 
        };
      }

      // Fetch cart items with related data
      const cartItems = await apiFetch(`/cart_items/full?user_id=${user.id}`);

      // Get unique seller IDs
      const sellerIds = [...new Set(cartItems?.map((item: any) => item.songs?.seller_id).filter(Boolean))] as string[];
      
      // Fetch seller profiles
      const profiles = await apiFetch(`/profiles?ids=${sellerIds.join(',')}`);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name || p.username || 'Unknown Artist']));

      // Fetch active exclusive reservations for items that are exclusive
      const exclusiveItems = cartItems?.filter((item: any) => item.is_exclusive) || [];
      const exclusiveSongIds = exclusiveItems.map((item: any) => item.song_id);
      
      let reservationsMap = new Map<string, { expires_at: string }>();
      
      if (exclusiveSongIds.length > 0) {
        const reservations = await apiFetch(`/exclusive_reservations?song_ids=${exclusiveSongIds.join(',')}&buyer_id=${user.id}&status=active`);
        reservationsMap = new Map(reservations?.map((r: any) => [r.song_id, { expires_at: r.expires_at }]));
      }

      // Get commission rate for split fee calculation
      const commissionRate = await getCommissionRate();

      // Map items with seller names, reservations, own song flag, and split fees
      const items = cartItems?.map((item: any) => {
        const isOwnSong = item.songs?.seller_id === user.id;
        const songPrice = Number(item.final_price || item.license_tiers?.price || item.license_tier?.price || 0);
        
        // Calculate split platform fee (50/50)
        const platformFeeTotal = Math.round(songPrice * commissionRate);
        const platformFeeBuyer = Math.round(platformFeeTotal / 2);
        const buyerTotalPaid = songPrice + platformFeeBuyer;
        
        return {
          ...item,
          seller_name: profileMap.get(item.songs?.seller_id) || 'Unknown Artist',
          price: songPrice,
          songPrice,
          platformFeeBuyer,
          buyerTotalPaid,
          reservation: reservationsMap.get(item.song_id),
          isOwnSong,
        };
      }) || [];

      // Calculate totals with split platform fee
      const subtotal = items.reduce((sum: number, item: any) => sum + item.songPrice, 0);
      const buyerPlatformFee = items.reduce((sum: number, item: any) => sum + item.platformFeeBuyer, 0);
      const total = subtotal + buyerPlatformFee;

      return {
        items,
        subtotal,         // Song prices only
        buyerPlatformFee, // Buyer's portion of platform fee (50%)
        total,            // What buyer actually pays (subtotal + buyerPlatformFee)
        itemCount: items.length,
        hasExclusiveItems: items.some((item: any) => item.is_exclusive),
        hasOwnSongs: items.some((item: any) => item.isOwnSong),
      };
    },
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ acknowledgmentAccepted, promoCodeId, promoDiscount }: { 
      acknowledgmentAccepted: boolean;
      promoCodeId?: string;
      promoDiscount?: number;
    }) => {
      const returnUrl = `${window.location.origin}/buyer/order-confirmation`;

      const data = await apiFetch('/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ 
          acknowledgment_accepted: acknowledgmentAccepted,
          return_url: returnUrl,
          promo_code_id: promoCodeId || null,
          promo_discount: promoDiscount || 0,
        }),
      });

      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      // Use Cashfree SDK to open checkout
      if (data.payment_session_id) {
        try {
          // Initialize Cashfree SDK - production mode for live payments
          const cashfree = (window as any).Cashfree({
            mode: "production"
          });
          
          cashfree.checkout({
            paymentSessionId: data.payment_session_id,
            redirectTarget: "_self", // Redirect in the same tab
          });
        } catch (sdkError) {
          console.error('Cashfree SDK error:', sdkError);
          toast.error('Failed to initialize payment. Please try again.');
        }
      } else {
        toast.error('Payment session not received');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useVerifyPayment(orderId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['verify-payment', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID');

      const data = await apiFetch('/verify-payment', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
      });

      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!orderId && !!user,
    refetchInterval: (query) => {
      // Keep polling until payment is confirmed or failed
      const data = query.state.data as any;
      if (data?.is_paid || data?.payment_status === 'FAILED') {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
  });
}

export function useRemoveFromCartWithReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cartItemId, songId, isExclusive }: {
      cartItemId: string; 
      songId: string; 
      isExclusive: boolean;
    }) => {
      // Release reservation if exclusive
      if (isExclusive) {
        await apiFetch('/release-reservation', {
          method: 'POST',
          body: JSON.stringify({ song_id: songId, reason: 'cart_removal' }),
        });
      }

      // Remove from cart
      await apiFetch(`/cart_items/${cartItemId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      toast.success('Removed from cart');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });
}

export function useOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const data = await apiFetch(`/orders?buyer_id=${user.id}`);
      return data;
    },
    enabled: !!user,
  });
}

export function useOrder(orderId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId || !user) throw new Error('No order ID');
      
      const data = await apiFetch(`/orders/${orderId}?buyer_id=${user.id}`);
      return data;
    },
    enabled: !!orderId && !!user,
  });
}
