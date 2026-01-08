import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface ContentReviewItem {
  id: string;
  song_id: string;
  queue_type: string;
  priority: number;
  status: string;
  detection_type: string | null;
  confidence_score: number | null;
  matched_content: string | null;
  matched_song_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution: string | null;
  resolution_notes: string | null;
  created_at: string;
  song?: {
    id: string;
    title: string;
    seller_id: string;
    cover_image_url: string | null;
    preview_audio_url: string | null;
    full_lyrics: string | null;
    seller_name: string | null;
    seller_email: string | null;
  } | null;
  matched_song?: {
    id: string;
    title: string;
    seller_id: string;
    full_lyrics: string | null;
    seller_name: string | null;
  } | null;
}

export function useContentReviewQueue(status?: string) {
  return useQuery({
    queryKey: ["content-review-queue", status],
    queryFn: async () => {
      let query = supabase
        .from("content_review_queue")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch song details for each queue item
      const enrichedData = await Promise.all(
        (data || []).map(async (item) => {
          // Fetch main song
          const { data: songData } = await supabase
            .from("songs")
            .select("id, title, seller_id, cover_image_url, preview_audio_url, full_lyrics")
            .eq("id", item.song_id)
            .single();

          let song = null;
          if (songData) {
            // Fetch seller info
            const { data: sellerData } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", songData.seller_id)
              .single();

            song = {
              ...songData,
              seller_name: sellerData?.full_name || null,
              seller_email: sellerData?.email || null,
            };
          }

          // Fetch matched song if exists
          let matched_song = null;
          if (item.matched_song_id) {
            const { data: matchedSongData } = await supabase
              .from("songs")
              .select("id, title, seller_id, full_lyrics")
              .eq("id", item.matched_song_id)
              .single();

            if (matchedSongData) {
              const { data: matchedSellerData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", matchedSongData.seller_id)
                .single();

              matched_song = {
                ...matchedSongData,
                seller_name: matchedSellerData?.full_name || null,
              };
            }
          }

          return {
            ...item,
            song,
            matched_song,
          };
        })
      );

      return enrichedData as ContentReviewItem[];
    },
  });
}

export function useContentReviewStats() {
  return useQuery({
    queryKey: ["content-review-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_review_queue")
        .select("status, queue_type");

      if (error) throw error;

      const stats = {
        pending: 0,
        in_review: 0,
        resolved: 0,
        copyright: 0,
        plagiarism: 0,
      };

      data?.forEach((item) => {
        if (item.status === "pending") stats.pending++;
        if (item.status === "in_review") stats.in_review++;
        if (item.status === "resolved") stats.resolved++;
        if (item.queue_type === "copyright") stats.copyright++;
        if (item.queue_type === "plagiarism") stats.plagiarism++;
      });

      return stats;
    },
  });
}

export function useResolveContentReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueId,
      songId,
      resolution,
      notes,
    }: {
      queueId: string;
      songId: string;
      resolution: "approved" | "rejected" | "needs_proof";
      notes?: string;
    }) => {
      // Update queue item
      const { error: queueError } = await supabase
        .from("content_review_queue")
        .update({
          status: "resolved",
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution,
          resolution_notes: notes,
        })
        .eq("id", queueId);

      if (queueError) throw queueError;

      // Update song based on resolution
      let songUpdate: Record<string, unknown> = {};
      
      if (resolution === "approved") {
        songUpdate = {
          content_check_status: "clear",
          requires_ownership_proof: false,
        };
      } else if (resolution === "rejected") {
        songUpdate = {
          content_check_status: "blocked",
          status: "rejected",
          rejection_reason: notes || "Copyright/plagiarism violation",
        };
      } else if (resolution === "needs_proof") {
        songUpdate = {
          content_check_status: "flagged",
          requires_ownership_proof: true,
        };
      }

      const { error: songError } = await supabase
        .from("songs")
        .update(songUpdate)
        .eq("id", songId);

      if (songError) throw songError;

      // Update fingerprint review info
      await supabase
        .from("content_fingerprints")
        .update({
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("song_id", songId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["content-review-stats"] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      
      const messages = {
        approved: "Content approved as original",
        rejected: "Content rejected for violation",
        needs_proof: "Ownership proof requested from seller",
      };
      toast.success(messages[variables.resolution]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUploadOwnershipProof() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      songId,
      file,
    }: {
      songId: string;
      file: File;
    }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${songId}/ownership-proof-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("license-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("license-documents")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("songs")
        .update({ ownership_proof_url: urlData.publicUrl })
        .eq("id", songId);

      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Ownership proof uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSellerContentFlags(sellerId?: string) {
  return useQuery({
    queryKey: ["seller-content-flags", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from("songs")
        .select(`
          id,
          title,
          cover_image_url,
          content_check_status,
          requires_ownership_proof,
          ownership_proof_url
        `)
        .eq("seller_id", sellerId)
        .in("content_check_status", ["flagged", "blocked"]);

      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });
}