import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { isValidUUID, filterValidUUIDs } from '@/lib/validation';

// Fetch commission rate from platform settings
async function getCommissionRate(): Promise<number> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'commission_rate')
    .single();
  
  // Default to 15% if not set, convert percentage to decimal
  return ((data?.value as { rate?: number })?.rate || 15) / 100;
}

// Declare Cashfree global type
declare global {
  interface Window {
    Cashfree: (config: { mode: string }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: string }) => Promise<void>;
    };
  }
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
      const { data: licenseTier, error: tierError } = await supabase
        .from('license_tiers')
        .select('license_type, price, is_available, max_sales, current_sales, song_id')
        .eq('id', licenseTierId)
        .single();

      if (tierError || !licenseTier) throw new Error('License tier not found');
      if (!licenseTier.is_available) throw new Error('This license is no longer available');

      const isExclusive = licenseTier.license_type === 'exclusive';

      // For EXCLUSIVE licenses, use the edge function (handles reservations)
      if (isExclusive) {
        const { data, error } = await supabase.functions.invoke('validate-cart-item', {
          body: { song_id: songId, license_tier_id: licenseTierId },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data;
      }

      // For NON-EXCLUSIVE licenses, use fast direct database operations
      // Check max sales limit if applicable
      if (licenseTier.max_sales && licenseTier.current_sales >= licenseTier.max_sales) {
        throw new Error('Maximum sales limit reached for this license');
      }

      // Get seller_id from the song
      const { data: song, error: songError } = await supabase
        .from('songs')
        .select('seller_id')
        .eq('id', songId)
        .single();

      if (songError || !song) throw new Error('Song not found');

      // Fetch commission rate and calculate prices
      const commissionRate = await getCommissionRate();
      const basePrice = Number(licenseTier.price);
      const platformCommission = basePrice * commissionRate;

      // Upsert cart item (insert or update if exists)
      const { error: upsertError } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          song_id: songId,
          license_tier_id: licenseTierId,
          seller_id: song.seller_id,
          base_price: basePrice,
          platform_commission: platformCommission,
          final_price: basePrice,
          is_exclusive: false,
        }, {
          onConflict: 'user_id,song_id',
          ignoreDuplicates: false
        });

      if (upsertError) throw new Error('Failed to add to cart');

      return { success: true, message: 'Added to cart', is_exclusive: false };
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
  return useQuery({
    queryKey: ['cart-with-totals'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          song_id,
          license_tier_id,
          is_exclusive,
          base_price,
          final_price,
          songs (
            id,
            title,
            cover_image_url,
            seller_id
          ),
          license_tiers (
            id,
            license_type,
            price
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get unique seller IDs
      const sellerIds = [...new Set(cartItems?.map(item => item.songs?.seller_id).filter(Boolean))] as string[];
      
      // Fetch seller profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.username || 'Unknown Artist']));

      // Fetch active exclusive reservations for items that are exclusive
      const exclusiveItems = cartItems?.filter(item => item.is_exclusive) || [];
      const exclusiveSongIds = exclusiveItems.map(item => item.song_id);
      
      let reservationsMap = new Map<string, { expires_at: string }>();
      
      if (exclusiveSongIds.length > 0) {
        const { data: reservations } = await supabase
          .from('exclusive_reservations')
          .select('song_id, expires_at')
          .in('song_id', exclusiveSongIds)
          .eq('buyer_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());
        
        reservationsMap = new Map(reservations?.map(r => [r.song_id, { expires_at: r.expires_at }]));
      }

      // Get commission rate for split fee calculation
      const commissionRate = await getCommissionRate();

      // Map items with seller names, reservations, own song flag, and split fees
      const items = cartItems?.map(item => {
        const isOwnSong = item.songs?.seller_id === user.id;
        const songPrice = item.final_price || item.license_tiers?.price || 0;
        
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
      const subtotal = items.reduce((sum, item) => sum + item.songPrice, 0);
      const buyerPlatformFee = items.reduce((sum, item) => sum + item.platformFeeBuyer, 0);
      const total = subtotal + buyerPlatformFee;

      return {
        items,
        subtotal,         // Song prices only
        buyerPlatformFee, // Buyer's portion of platform fee (50%)
        total,            // What buyer actually pays (subtotal + buyerPlatformFee)
        itemCount: items.length,
        hasExclusiveItems: items.some(item => item.is_exclusive),
        hasOwnSongs: items.some(item => item.isOwnSong),
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

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          acknowledgment_accepted: acknowledgmentAccepted,
          return_url: returnUrl,
          promo_code_id: promoCodeId || null,
          promo_discount: promoDiscount || 0,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      // Use Cashfree SDK to open checkout
      if (data.payment_session_id) {
        try {
          // Initialize Cashfree SDK - production mode for live payments
          const cashfree = window.Cashfree({
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

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { order_id: orderId },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!orderId && !!user,
    refetchInterval: (query) => {
      // Keep polling until payment is confirmed or failed
      const data = query.state.data;
      if (data?.is_paid || data?.payment_status === 'FAILED') {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
  });
}

export function useRemoveFromCartWithReservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ cartItemId, songId, isExclusive }: { 
      cartItemId: string; 
      songId: string; 
      isExclusive: boolean;
    }) => {
      // Release reservation if exclusive
      if (isExclusive) {
        await supabase.functions.invoke('release-reservation', {
          body: { song_id: songId, reason: 'cart_removal' },
        });
      }

      // Remove from cart
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            songs:song_id (
              id,
              title,
              cover_image_url,
              audio_url,
              full_lyrics,
              has_audio,
              has_lyrics
            )
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            songs:song_id (
              id,
              title,
              cover_image_url,
              audio_url
            )
          )
        `)
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });
}
