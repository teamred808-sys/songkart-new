import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

      const { data, error } = await supabase
        .from("song_ratings")
        .select("*")
        .eq("song_id", songId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase.rpc("submit_rating", {
        p_song_id: songId,
        p_rating: rating,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        rating?: number;
        is_update?: boolean;
        is_verified_purchase?: boolean;
        average_rating?: number;
        total_ratings?: number;
      };

      if (!result.success) {
        throw new Error(result.error || "Failed to submit rating");
      }

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
      const { data, error } = await supabase.rpc("get_song_ratings", {
        p_song_id: songId,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
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

      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          orders!inner (
            buyer_id,
            payment_status
          )
        `)
        .eq("song_id", songId)
        .eq("orders.buyer_id", user.id)
        .eq("orders.payment_status", "completed")
        .limit(1);

      if (error) throw error;
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
      const { data, error } = await supabase.rpc("flag_rating", {
        p_rating_id: ratingId,
        p_reason: reason,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to flag rating");
      }

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
      let query = supabase
        .from("song_ratings")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          songs:song_id (title, seller_id)
        `)
        .order("created_at", { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Admin: Get flagged ratings
export function useFlaggedRatings() {
  return useQuery({
    queryKey: ["rating-abuse-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rating_abuse_flags")
        .select(`
          *,
          song_ratings (
            *,
            profiles:user_id (full_name, avatar_url),
            songs:song_id (title)
          ),
          flagged_by_profile:flagged_by (full_name),
          reviewed_by_profile:reviewed_by (full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
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
      const { data, error } = await supabase.rpc("admin_remove_rating", {
        p_rating_id: ratingId,
        p_reason: reason,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to remove rating");
      }

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
      const { error } = await supabase
        .from("rating_abuse_flags")
        .update({
          status,
          action_taken: actionTaken,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", flagId);

      if (error) throw error;
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

// Seller: Get ratings for seller's songs
export function useSellerRatings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["seller-ratings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("song_ratings")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          songs:song_id!inner (
            id,
            title,
            seller_id,
            cover_image_url
          )
        `)
        .eq("songs.seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
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
      const { data: songs, error } = await supabase
        .from("songs")
        .select("id, title, average_rating, total_ratings")
        .eq("seller_id", user.id)
        .gt("total_ratings", 0);

      if (error) throw error;

      if (!songs || songs.length === 0) {
        return {
          totalRatings: 0,
          averageRating: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          songCount: 0,
        };
      }

      // Calculate overall stats
      const totalRatings = songs.reduce((sum, s) => sum + (s.total_ratings || 0), 0);
      const weightedSum = songs.reduce(
        (sum, s) => sum + (s.average_rating || 0) * (s.total_ratings || 0),
        0
      );
      const averageRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

      // Get distribution
      const { data: allRatings } = await supabase
        .from("song_ratings")
        .select("rating, songs!inner(seller_id)")
        .eq("songs.seller_id", user.id);

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allRatings?.forEach((r) => {
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
