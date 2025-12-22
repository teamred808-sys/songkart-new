import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const COMMISSION_RATE = 0.15;

export function useValidatedAddToCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ songId, licenseTierId }: { songId: string; licenseTierId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('validate-cart-item', {
        body: { song_id: songId, license_tier_id: licenseTierId },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

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
    queryKey: ['cart-with-totals', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          songs:song_id (
            id,
            title,
            cover_image_url,
            seller_id,
            exclusive_sold
          ),
          license_tiers:license_tier_id (
            id,
            license_type,
            price,
            terms
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get seller profiles
      const sellerIds = [...new Set(cartItems?.map(item => item.songs?.seller_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));

      // Get active reservations for exclusive items
      const exclusiveItems = cartItems?.filter(item => item.is_exclusive) || [];
      let reservationMap = new Map();

      if (exclusiveItems.length > 0) {
        const { data: reservations } = await supabase
          .from('exclusive_reservations')
          .select('*')
          .eq('buyer_id', user.id)
          .eq('status', 'active')
          .in('song_id', exclusiveItems.map(i => i.song_id));

        reservationMap = new Map(reservations?.map(r => [r.song_id, r]));
      }

      // Calculate totals
      let subtotal = 0;
      const items = cartItems?.map(item => {
        const price = Number(item.license_tiers?.price || 0);
        const commission = price * COMMISSION_RATE;
        subtotal += price;

        return {
          ...item,
          seller_name: profileMap.get(item.songs?.seller_id) || 'Unknown Artist',
          price,
          commission,
          reservation: reservationMap.get(item.song_id),
        };
      }) || [];

      const platformFee = subtotal * COMMISSION_RATE;
      const total = subtotal;

      return {
        items,
        subtotal,
        platformFee,
        total,
        itemCount: items.length,
        hasExclusiveItems: items.some(i => i.is_exclusive),
      };
    },
    enabled: !!user,
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ acknowledgmentAccepted }: { acknowledgmentAccepted: boolean }) => {
      const returnUrl = `${window.location.origin}/buyer/order-confirmation`;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          acknowledgment_accepted: acknowledgmentAccepted,
          return_url: returnUrl,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      // Redirect to Cashfree payment page
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error('Payment URL not received');
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
              cover_image_url
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
