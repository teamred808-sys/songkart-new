import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { isValidUUID } from "@/lib/validation";
import type { SongFiltersState } from "@/components/songs/SongFilters";

export interface Song {
  id: string;
  title: string;
  description: string | null;
  seller_id: string;
  genre_id: string | null;
  mood_id: string | null;
  language: string | null;
  bpm: number | null;
  duration: number | null;
  base_price: number;
  cover_image_url: string | null;
  artwork_cropped_url: string | null;
  preview_audio_url: string | null;
  preview_lyrics: string | null;
  has_audio: boolean | null;
  has_lyrics: boolean | null;
  play_count: number | null;
  view_count: number | null;
  is_featured: boolean | null;
  status: string;
  created_at: string;
  average_rating: number | null;
  total_ratings: number | null;
  genres?: { id: string; name: string } | null;
  moods?: { id: string; name: string } | null;
  seller?: { id: string; full_name: string | null; avatar_url: string | null; bio?: string | null; is_verified?: boolean | null } | null;
}

export function useGenres() {
  return useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      return apiFetch("/genres");
    },
  });
}

export function useMoods() {
  return useQuery({
    queryKey: ["moods"],
    queryFn: async () => {
      return apiFetch("/moods");
    },
  });
}

export function useSongs(filters?: SongFiltersState) {
  return useQuery({
    queryKey: ["songs", filters],
    queryFn: async () => {
      let queryUrl = "/songs?";
      
      if (filters) {
        const params = new URLSearchParams();
        if (filters.isFree) params.append("isFree", "true");
        if (filters.search) params.append("search", filters.search);
        if (filters.genre && filters.genre !== "all") params.append("genre", filters.genre);
        if (filters.mood && filters.mood !== "all") params.append("mood", filters.mood);
        if (filters.language && filters.language !== "all") params.append("language", filters.language);
        if (filters.priceRange) {
          params.append("minPrice", filters.priceRange[0].toString());
          params.append("maxPrice", filters.priceRange[1].toString());
        }
        if (filters.bpmRange) {
          params.append("minBpm", filters.bpmRange[0].toString());
          params.append("maxBpm", filters.bpmRange[1].toString());
        }
        if (filters.sortBy) params.append("sortBy", filters.sortBy);

        queryUrl += params.toString();
      }

      return apiFetch(queryUrl);
    },
  });
}

export function useFeaturedSongs() {
  return useQuery({
    queryKey: ["songs", "featured"],
    queryFn: async () => {
      return apiFetch("/songs?isFeatured=true");
    },
  });
}

export function useSong(identifier: string) {
  return useQuery({
    queryKey: ["song", identifier],
    queryFn: async () => {
      return apiFetch(`/songs/${identifier}`);
    },
    enabled: !!identifier,
  });
}

export function useLicenseTiers(songId: string) {
  return useQuery({
    queryKey: ["license_tiers", songId],
    queryFn: async () => {
      if (!isValidUUID(songId)) {
        return [];
      }
      return apiFetch(`/songs/license_tiers/${songId}`);
    },
    enabled: isValidUUID(songId),
  });
}
