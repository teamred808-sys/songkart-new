import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { apiFetch, API_BASE } from '@/lib/api';

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
      const params = new URLSearchParams();
      if (status && status !== "all") params.append('status', status);

      const data = await apiFetch(`/content_review_queue?${params.toString()}`);

      // Fetch song details for each queue item
      const enrichedData = await Promise.all(
        (data || []).map(async (item: any) => {
          // Fetch main song
          const songData = await apiFetch(`/songs/${item.song_id}`).catch(() => null);

          let song = null;
          if (songData) {
            const sellerData = await apiFetch(`/profiles/${songData.seller_id}`).catch(() => null);
            song = {
              ...songData,
              seller_name: sellerData?.full_name || null,
              seller_email: sellerData?.email || null,
            };
          }

          // Fetch matched song if exists
          let matched_song = null;
          if (item.matched_song_id) {
            const matchedSongData = await apiFetch(`/songs/${item.matched_song_id}`).catch(() => null);
            if (matchedSongData) {
              const matchedSellerData = await apiFetch(`/profiles/${matchedSongData.seller_id}`).catch(() => null);
              matched_song = {
                ...matchedSongData,
                seller_name: matchedSellerData?.full_name || null,
              };
            }
          }

          return { ...item, song, matched_song };
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
      const data = await apiFetch('/content_review_queue');

      const stats = {
        pending: 0,
        in_review: 0,
        resolved: 0,
        copyright: 0,
        plagiarism: 0,
      };

      (data || []).forEach((item: any) => {
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
      await apiFetch(`/content_review_queue/${queueId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: "resolved",
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution,
          resolution_notes: notes,
        }),
      });

      // Update song based on resolution
      let songUpdate: Record<string, unknown> = {};
      if (resolution === "approved") {
        songUpdate = { content_check_status: "clear", requires_ownership_proof: false };
      } else if (resolution === "rejected") {
        songUpdate = { content_check_status: "blocked", status: "rejected", rejection_reason: notes || "Copyright/plagiarism violation" };
      } else if (resolution === "needs_proof") {
        songUpdate = { content_check_status: "flagged", requires_ownership_proof: true };
      }

      await apiFetch(`/songs/${songId}`, {
        method: 'PATCH',
        body: JSON.stringify(songUpdate),
      });

      // Update fingerprint review info
      await apiFetch(`/content_fingerprints?song_id=${songId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        }),
      }).catch(() => {/* non-critical */});
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

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', fileName);

      const token = localStorage.getItem('auth_token');
      const uploadRes = await fetch(`${API_BASE}/storage/license-documents/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      const publicUrl = uploadData.public_url;

      await apiFetch(`/songs/${songId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ownership_proof_url: publicUrl }),
      });

      return publicUrl;
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

      const data = await apiFetch(`/songs?seller_id=${sellerId}`);
      return (data || []).filter((s: any) => s.content_check_status === 'flagged' || s.content_check_status === 'blocked');
    },
    enabled: !!sellerId,
  });
}