import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

interface FreeCheckoutParams {
  songId: string;
  licenseTierId: string;
  acknowledgmentAccepted: boolean;
}

interface FreeCheckoutResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  song_title: string;
  license_type: string;
  is_exclusive: boolean;
  error?: string;
}

export function useFreeCheckout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ songId, licenseTierId, acknowledgmentAccepted }: FreeCheckoutParams): Promise<FreeCheckoutResponse> => {
      if (!user) throw new Error('Not authenticated');

      const data = await apiFetch('/free-checkout', {
        method: 'POST',
        body: JSON.stringify({
          song_id: songId,
          license_tier_id: licenseTierId,
          acknowledgment_accepted: acknowledgmentAccepted,
        }),
      });

      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-purchases'] });

      toast.success('License claimed successfully!');

      // Navigate to success page with details
      const params = new URLSearchParams({
        song: data.song_title,
        license: data.license_type,
        exclusive: data.is_exclusive ? 'true' : 'false',
      });
      navigate(`/buyer/free-checkout-success?${params.toString()}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useFreeCheckoutFromCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ acknowledgmentAccepted, promoCodeId, promoDiscount }: { acknowledgmentAccepted: boolean; promoCodeId?: string; promoDiscount?: number }): Promise<FreeCheckoutResponse> => {
      if (!user) throw new Error('Not authenticated');

      // Get cart items first
      const cartItems = await apiFetch(`/cart_items/full?user_id=${user.id}`);

      if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');

      // For free checkout from cart, we only support single items
      // (multi-item free checkout would need more complex handling)
      if (cartItems.length > 1) {
        throw new Error('Free checkout only supports single items. Please remove other items from cart.');
      }

      const item = cartItems[0];
      
      // Allow free checkout if price is 0 OR if promo discount brings total to 0
      const isPromoFree = promoCodeId && promoDiscount && promoDiscount > 0;
      if (Number(item.license_tiers?.price) !== 0 && !isPromoFree) {
        throw new Error('This is not a free license');
      }

      const data = await apiFetch('/free-checkout', {
        method: 'POST',
        body: JSON.stringify({
          song_id: item.song_id,
          license_tier_id: item.license_tier_id,
          acknowledgment_accepted: acknowledgmentAccepted,
          promo_code_id: promoCodeId,
          promo_discount: promoDiscount,
        }),
      });

      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-purchases'] });

      toast.success('License claimed successfully!');

      const params = new URLSearchParams({
        song: data.song_title,
        license: data.license_type,
        exclusive: data.is_exclusive ? 'true' : 'false',
      });
      navigate(`/buyer/free-checkout-success?${params.toString()}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
