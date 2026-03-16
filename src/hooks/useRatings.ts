import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api';

export interface SongRating {
  id: string;
  rating: number;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
}

export interface RatingAbuseFlag {
  id: string;
  rating_id: string;
  flagged_by: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  created_at: string;
}

// Fetch user's rating for a specific song
export function useUserRating(songId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-rating", songId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const dataArr = await apiFetch(`/song_ratings?song_id=${songId}&user_id=${user.id}`);
      return dataArr?.[0] || null;
    },
    enabled: !!songId && !!user?.id,
  });
}

// Submit or update a rating
export function useSubmitRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      songId,
      rating,
    }: {
      songId: string;
      rating: number;
    }) => {
      const result = await apiFetch('/rpc/submit_rating', {
        method: 'POST',
        body: JSON.stringify({ song_id: songId, rating }),
      });

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-rating", variables.songId] });
      queryClient.invalidateQueries({ queryKey: ["song-ratings", variables.songId] });
      queryClient.invalidateQueries({ queryKey: ["song", variables.songId] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      
      toast.success(data.is_update ? "Rating updated!" : "Thanks for rating!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch all ratings for a song (paginated)
export function useSongRatings(songId: string, limit = 10, offset = 0) {
  return useQuery({
    queryKey: ["song-ratings", songId, limit, offset],
    queryFn: async () => {
      const data = await apiFetch('/rpc/get_song_ratings', {
        method: 'POST',
        body: JSON.stringify({ song_id: songId, limit, offset }),
      });

      return (data || []) as SongRating[];
    },
    enabled: !!songId,
  });
}

// Check if user has purchased a song
export function useHasPurchased(songId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-purchased", songId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const data = await apiFetch(`/order_items/full?song_id=${songId}&orders.buyer_id=${user.id}&orders.payment_status=completed&limit=1`);
      return data && data.length > 0;
    },
    enabled: !!songId && !!user?.id,
  });
}

// Flag a rating for review
export function useFlagRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ratingId,
      reason,
    }: {
      ratingId: string;
      reason: string;
    }) => {
      const result = await apiFetch('/rpc/flag_rating', {
        method: 'POST',
        body: JSON.stringify({ rating_id: ratingId, reason }),
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating-abuse-flags"] });
      toast.success("Rating flagged for review");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Get all ratings with optional filters
export function useAllRatings(filters?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ["all-ratings", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const data = await apiFetch(`/song_ratings/full?${params.toString()}`);
      return data;
    },
  });
}

// Admin: Get flagged ratings
export function useFlaggedRatings() {
  return useQuery({
    queryKey: ["rating-abuse-flags"],
    queryFn: async () => {
      const data = await apiFetch('/rating_abuse_flags/full');
      return data;
    },
  });
}

// Admin: Remove a rating
export function useAdminRemoveRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ratingId,
      reason,
    }: {
      ratingId: string;
      reason: string;
    }) => {
      const result = await apiFetch('/rpc/admin_remove_rating', {
        method: 'POST',
        body: JSON.stringify({ rating_id: ratingId }),
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["rating-abuse-flags"] });
      queryClient.invalidateQueries({ queryKey: ["song-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Rating removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Update flag status
export function useUpdateFlagStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flagId,
      status,
      actionTaken,
    }: {
      flagId: string;
      status: string;
      actionTaken?: string;
    }) => {
      await apiFetch(`/rating_abuse_flags/${flagId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          action_taken: actionTaken,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating-abuse-flags"] });
      toast.success("Flag status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete user's own rating
export function useDeleteMyRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ songId }: { songId: string }) => {
      const result = await apiFetch('/rpc/delete_my_rating', {
        method: 'POST',
        body: JSON.stringify({ song_id: songId }),
      });

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-rating", variables.songId] });
      queryClient.invalidateQueries({ queryKey: ["song-ratings", variables.songId] });
      queryClient.invalidateQueries({ queryKey: ["song", variables.songId] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Rating removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Seller: Get ratings for seller's songs
export function useSellerRatings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["seller-ratings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const data = await apiFetch(`/song_ratings/full?songs.seller_id=${user.id}`);
      return data;
    },
    enabled: !!user?.id,
  });
}

// Seller: Get rating statistics
export function useSellerRatingStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["seller-rating-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all songs with ratings for this seller
      const songs = await apiFetch(`/songs?seller_id=${user.id}&total_ratings=gt.0`);

      if (!songs || songs.length === 0) {
        return {
          totalRatings: 0,
          averageRating: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          songCount: 0,
        };
      }

      // Calculate overall stats
      const totalRatings = songs.reduce((sum: number, s: any) => sum + (s.total_ratings || 0), 0);
      const weightedSum = songs.reduce(
        (sum: number, s: any) => sum + (s.average_rating || 0) * (s.total_ratings || 0),
        0
      );
      const averageRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

      // Get distribution
      const allRatings = await apiFetch(`/song_ratings/full?songs.seller_id=${user.id}`);

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allRatings?.forEach((r: any) => {
        if (r.rating >= 1 && r.rating <= 5) {
          distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
        }
      });

      return {
        totalRatings,
        averageRating: Math.round(averageRating * 10) / 10,
        distribution,
        songCount: songs.length,
      };
    },
    enabled: !!user?.id,
  });
}
