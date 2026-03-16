import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';

interface AdminSongReview {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  base_price: number;
  bpm: number | null;
  duration: number | null;
  language: string | null;
  has_audio: boolean;
  has_lyrics: boolean;
  full_lyrics: string | null;
  preview_lyrics: string | null;
  audio_url: string | null;
  preview_audio_url: string | null;
  cover_image_url: string | null;
  created_at: string;
  seller_id: string;
  full_audio_url: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  genres: {
    id: string;
    name: string;
  } | null;
  moods: {
    id: string;
    name: string;
  } | null;
  license_tiers: Array<{
    id: string;
    license_type: string;
    price: number;
    description: string | null;
    is_available: boolean;
    max_sales: number | null;
    current_sales: number;
  }>;
}

export function useAdminSongReview(songId: string | undefined) {
  return useQuery({
    queryKey: ['admin-song-review', songId],
    queryFn: async (): Promise<AdminSongReview> => {
      if (!songId) throw new Error('Song ID is required');

      const data = await apiFetch('/admin-review-content', {
        method: 'POST',
        body: JSON.stringify({ songId })
      });

      if (!data?.song) {
        throw new Error('Song not found');
      }

      return data.song;
    },
    enabled: !!songId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useAdminApproveSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (songId: string) => {
      // First check if song already has approved_at (resubmission case)
      const song = await apiFetch(`/songs/${songId}`);

      // Only set approved_at if it's the first approval
      const updateData: { status: 'approved'; rejection_reason: null; approved_at?: string } = {
        status: 'approved',
        rejection_reason: null,
      };

      if (!song?.approved_at) {
        updateData.approved_at = new Date().toISOString();
      }

      await apiFetch(`/songs/${songId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-song-review'] });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['new-uploads'] });
      toast({
        title: 'Song Approved',
        description: 'The song has been approved and is now live.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to approve song. Please try again.',
        variant: 'destructive',
      });
      console.error('Approve song error:', error);
    },
  });
}

export function useAdminRejectSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ songId, category, reason }: { songId: string; category: string; reason: string }) => {
      const formattedReason = `[${category}]: ${reason}`;

      await apiFetch(`/songs/${songId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'rejected', 
          rejection_reason: formattedReason 
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-song-review'] });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      toast({
        title: 'Song Rejected',
        description: 'The song has been rejected and the seller will be notified.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to reject song. Please try again.',
        variant: 'destructive',
      });
      console.error('Reject song error:', error);
    },
  });
}

export const REJECTION_CATEGORIES = [
  { value: 'audio_quality', label: 'Audio Quality Issues' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'copyright_concerns', label: 'Copyright Concerns' },
  { value: 'missing_information', label: 'Missing Required Information' },
  { value: 'technical_issues', label: 'Technical Issues with File' },
  { value: 'lyrics_issues', label: 'Lyrics Quality/Content Issues' },
  { value: 'other', label: 'Other (Specify Below)' },
] as const;
