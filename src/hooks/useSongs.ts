import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      const { data, error } = await supabase
        .from("genres")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
}

export function useMoods() {
  return useQuery({
    queryKey: ["moods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moods")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
}

async function fetchSongsWithSellers(songs: any[]) {
  if (!songs.length) return [];
  
  // Filter out invalid seller IDs to prevent UUID errors
  const sellerIds = [...new Set(songs.map(s => s.seller_id).filter(isValidUUID))];
  
  if (sellerIds.length === 0) {
    return songs.map(song => ({ ...song, seller: null }));
  }
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, is_verified")
    .in("id", sellerIds);
  
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  
  return songs.map(song => ({
    ...song,
    seller: isValidUUID(song.seller_id) ? profileMap.get(song.seller_id) || null : null
  }));
}

export function useSongs(filters?: SongFiltersState) {
  return useQuery({
    queryKey: ["songs", filters],
    queryFn: async () => {
      let query = supabase
        .from("songs")
        .select(`
          *,
          genres (id, name),
          moods (id, name)
        `)
        .eq("status", "approved");

      if (filters) {
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        if (filters.genre && filters.genre !== "all") {
          query = query.eq("genre_id", filters.genre);
        }
        if (filters.mood && filters.mood !== "all") {
          query = query.eq("mood_id", filters.mood);
        }
        if (filters.language && filters.language !== "all") {
          query = query.eq("language", filters.language);
        }
        if (filters.hasAudio) {
          query = query.eq("has_audio", true);
        }
        if (filters.hasLyrics) {
          query = query.eq("has_lyrics", true);
        }
        if (filters.priceRange) {
          query = query.gte("base_price", filters.priceRange[0]).lte("base_price", filters.priceRange[1]);
        }
        if (filters.bpmRange) {
          query = query.gte("bpm", filters.bpmRange[0]).lte("bpm", filters.bpmRange[1]);
        }

        switch (filters.sortBy) {
          case "popular":
            query = query.order("play_count", { ascending: false });
            break;
          case "price-low":
            query = query.order("base_price", { ascending: true });
            break;
          case "price-high":
            query = query.order("base_price", { ascending: false });
            break;
          default:
            query = query.order("created_at", { ascending: false });
        }
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return fetchSongsWithSellers(data);
    },
  });
}

export function useFeaturedSongs() {
  return useQuery({
    queryKey: ["songs", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select(`
          *,
          genres (id, name),
          moods (id, name)
        `)
        .eq("status", "approved")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return fetchSongsWithSellers(data);
    },
  });
}

export function useSong(id: string) {
  return useQuery({
    queryKey: ["song", id],
    queryFn: async () => {
      // Validate UUID before querying
      if (!isValidUUID(id)) {
        throw new Error("Invalid song ID");
      }
      
      const { data, error } = await supabase
        .from("songs")
        .select(`
          *,
          genres (id, name),
          moods (id, name)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Fetch seller profile only if seller_id is valid
      let seller = null;
      if (isValidUUID(data.seller_id)) {
        const { data: sellerData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio, is_verified")
          .eq("id", data.seller_id)
          .maybeSingle();
        seller = sellerData;
      }
      
      // Increment view count
      await supabase.rpc("increment_view_count", { song_uuid: id });
      
      return { ...data, seller } as Song;
    },
    enabled: isValidUUID(id),
  });
}

export function useLicenseTiers(songId: string) {
  return useQuery({
    queryKey: ["license_tiers", songId],
    queryFn: async () => {
      // Validate UUID before querying
      if (!isValidUUID(songId)) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("license_tiers")
        .select("*")
        .eq("song_id", songId)
        .eq("is_available", true)
        .order("price");
      
      if (error) throw error;
      return data;
    },
    enabled: isValidUUID(songId),
  });
}
