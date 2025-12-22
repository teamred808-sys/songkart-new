import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

      const { data, error } = await supabase.functions.invoke('admin-review-content', {
        body: { songId }
      });

      if (error) {
        console.error('Admin review fetch error:', error);
        throw error;
      }

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
      const { error } = await supabase
        .from('songs')
        .update({ status: 'approved', rejection_reason: null })
        .eq('id', songId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-song-review'] });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      toast({
        title: 'Song Approved',
        description: 'The song has been approved and is now live.',
      });
    },
    onError: (error) => {
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
      
      const { error } = await supabase
        .from('songs')
        .update({ 
          status: 'rejected', 
          rejection_reason: formattedReason 
        })
        .eq('id', songId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-song-review'] });
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      toast({
        title: 'Song Rejected',
        description: 'The song has been rejected and the seller will be notified.',
      });
    },
    onError: (error) => {
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
