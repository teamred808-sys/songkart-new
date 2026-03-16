import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export function useBuyerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get purchases count and total spent
      const transactions = await apiFetch(`/transactions?buyer_id=${user.id}&payment_status=completed`);
      const totalPurchases = transactions?.length || 0;
      const totalSpent = transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

      // Get cart items count
      const cartItems = await apiFetch(`/cart_items?user_id=${user.id}`);
      const cartCount = cartItems?.length || 0;

      // Get favorites count
      const favorites = await apiFetch(`/favorites?user_id=${user.id}`);
      const favoritesCount = favorites?.length || 0;

      return {
        totalPurchases,
        totalSpent,
        cartItems: cartCount,
        favorites: favoritesCount,
      };
    },
    enabled: !!user,
  });
}

export function useBuyerPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-purchases', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const data = await apiFetch(`/transactions/full?buyer_id=${user.id}&payment_status=completed`);
      return data;
    },
    enabled: !!user,
  });
}

export function useRecentPurchases(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-recent-purchases', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const data = await apiFetch(`/transactions/full?buyer_id=${user.id}&payment_status=completed&limit=${limit}`);
      return data;
    },
    enabled: !!user,
  });
}

export function useCart() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const data = await apiFetch(`/cart_items/full?user_id=${user.id}`);
      return data;
    },
    enabled: !!user,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ songId, licenseTierId }: { songId: string; licenseTierId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if item already in cart
      const existingArr = await apiFetch(`/cart_items?user_id=${user.id}&song_id=${songId}`);
      const existing = existingArr?.[0] || null;

      if (existing) {
        // Update license tier
        await apiFetch(`/cart_items/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ license_tier_id: licenseTierId })
        });
      } else {
        // Add new item
        await apiFetch('/cart_items', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.id,
            song_id: songId,
            license_tier_id: licenseTierId,
          })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      toast.success('Added to cart');
    },
    onError: (error) => {
      toast.error('Failed to add to cart: ' + error.message);
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cartItemId: string) => {
      await apiFetch(`/cart_items/${cartItemId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-count'] });
      queryClient.invalidateQueries({ queryKey: ['cart-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      toast.success('Removed from cart');
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });
}

export function useFavorites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const data = await apiFetch(`/favorites/full?user_id=${user.id}`);
      return data;
    },
    enabled: !!user,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (songId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already favorited
      const existingArr = await apiFetch(`/favorites?user_id=${user.id}&song_id=${songId}`);
      const existing = existingArr?.[0] || null;

      if (existing) {
        // Remove favorite
        await apiFetch(`/favorites/${existing.id}`, { method: 'DELETE' });
        return { action: 'removed' };
      } else {
        // Add favorite
        await apiFetch('/favorites', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.id,
            song_id: songId,
          })
        });
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stats'] });
      toast.success(result.action === 'added' ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (error) => {
      toast.error('Failed: ' + error.message);
    },
  });
}

export function useCheckFavorite(songId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorite-check', user?.id, songId],
    queryFn: async () => {
      if (!user) return false;

      const data = await apiFetch(`/favorites?user_id=${user.id}&song_id=${songId}`);
      return data && data.length > 0;
    },
    enabled: !!user && !!songId,
  });
}
