import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useBuyerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get purchases count and total spent
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('buyer_id', user.id)
        .eq('payment_status', 'completed');

      if (error) throw error;

      const totalPurchases = transactions?.length || 0;
      const totalSpent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get cart items count
      const { count: cartCount } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get favorites count
      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        totalPurchases,
        totalSpent,
        cartItems: cartCount || 0,
        favorites: favoritesCount || 0,
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

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          songs (
            id,
            title,
            cover_image_url,
            artwork_cropped_url,
            audio_url,
            full_lyrics,
            seller_id,
            profiles:seller_id (full_name)
          ),
          license_tiers (
            license_type,
            terms
          )
        `)
        .eq('buyer_id', user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          songs (
            id,
            title,
            cover_image_url,
            artwork_cropped_url
          ),
          license_tiers (
            license_type
          )
        `)
        .eq('buyer_id', user.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          songs (
            id,
            title,
            cover_image_url,
            artwork_cropped_url,
            seller_id,
            profiles:seller_id (full_name)
          ),
          license_tiers (
            id,
            license_type,
            price,
            terms
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single();

      if (existing) {
        // Update license tier
        const { error } = await supabase
          .from('cart_items')
          .update({ license_tier_id: licenseTierId })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Add new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            song_id: songId,
            license_tier_id: licenseTierId,
          });
        if (error) throw error;
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

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          songs (
            id,
            title,
            cover_image_url,
            artwork_cropped_url,
            base_price,
            seller_id,
            genre_id,
            mood_id,
            has_audio,
            has_lyrics,
            play_count,
            profiles:seller_id (full_name),
            genres:genre_id (name),
            moods:mood_id (name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single();

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add favorite
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            song_id: songId,
          });
        if (error) throw error;
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

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single();

      return !!data;
    },
    enabled: !!user && !!songId,
  });
}
