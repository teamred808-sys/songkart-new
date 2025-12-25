import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewUploadSong {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  preview_audio_url: string | null;
  base_price: number;
  has_audio: boolean;
  has_lyrics: boolean;
  play_count: number;
  approved_at: string;
  seller_id: string;
  seller_name: string | null;
  seller_avatar: string | null;
  seller_verified: boolean;
  seller_tier_level: number;
  seller_tier_name: string;
  seller_tier_badge_color: string;
  genre_name: string | null;
  mood_name: string | null;
  is_pinned: boolean;
  ranking_score: number;
}

export interface NewUploadsSettings {
  visibility_hours: number;
  max_per_seller: number;
  upload_rate_limit: number;
  section_enabled: boolean;
  scoring_weights: {
    freshness: number;
    tier: number;
    verification: number;
    engagement: number;
    quality: number;
  };
}

export function useNewUploads(limit: number = 8) {
  return useQuery({
    queryKey: ['new-uploads', limit],
    queryFn: async (): Promise<NewUploadSong[]> => {
      const { data, error } = await supabase.rpc('get_new_uploads', {
        p_limit: limit
      });

      if (error) {
        console.error('Error fetching new uploads:', error);
        throw error;
      }

      return (data || []) as NewUploadSong[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
}

export function useNewUploadsSectionEnabled() {
  return useQuery({
    queryKey: ['new-uploads-enabled'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'new_uploads_section_enabled')
        .single();

      if (error) {
        console.error('Error fetching new uploads enabled setting:', error);
        return true; // Default to enabled
      }

      return data?.value === true || data?.value === 'true';
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useNewUploadsSettings() {
  return useQuery({
    queryKey: ['new-uploads-settings'],
    queryFn: async (): Promise<NewUploadsSettings> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'new_uploads_visibility_hours',
          'new_uploads_max_per_seller',
          'new_uploads_upload_rate_limit',
          'new_uploads_section_enabled',
          'new_uploads_scoring_weights'
        ]);

      if (error) {
        console.error('Error fetching new uploads settings:', error);
        throw error;
      }

      const settings: NewUploadsSettings = {
        visibility_hours: 72,
        max_per_seller: 2,
        upload_rate_limit: 5,
        section_enabled: true,
        scoring_weights: {
          freshness: 0.4,
          tier: 0.2,
          verification: 0.15,
          engagement: 0.15,
          quality: 0.1
        }
      };

      data?.forEach((item) => {
        switch (item.key) {
          case 'new_uploads_visibility_hours':
            settings.visibility_hours = typeof item.value === 'number' ? item.value : parseInt(String(item.value), 10) || 72;
            break;
          case 'new_uploads_max_per_seller':
            settings.max_per_seller = typeof item.value === 'number' ? item.value : parseInt(String(item.value), 10) || 2;
            break;
          case 'new_uploads_upload_rate_limit':
            settings.upload_rate_limit = typeof item.value === 'number' ? item.value : parseInt(String(item.value), 10) || 5;
            break;
          case 'new_uploads_section_enabled':
            settings.section_enabled = item.value === true || item.value === 'true';
            break;
          case 'new_uploads_scoring_weights':
            if (typeof item.value === 'object' && item.value !== null) {
              settings.scoring_weights = item.value as NewUploadsSettings['scoring_weights'];
            }
            break;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateNewUploadsSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value: value as never, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-uploads-settings'] });
      queryClient.invalidateQueries({ queryKey: ['new-uploads-enabled'] });
      queryClient.invalidateQueries({ queryKey: ['new-uploads'] });
    },
  });
}

export function useManageNewUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      songId, 
      action, 
      pinUntil 
    }: { 
      songId: string; 
      action: 'pin' | 'unpin' | 'exclude' | 'include'; 
      pinUntil?: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_manage_new_upload', {
        p_song_id: songId,
        p_action: action,
        p_pin_until: pinUntil || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-new-uploads'] });
    },
  });
}

export function useAdminNewUploadsEligible() {
  return useQuery({
    queryKey: ['admin-new-uploads-eligible'],
    queryFn: async () => {
      // Get visibility hours setting
      const { data: settingData } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'new_uploads_visibility_hours')
        .single();

      const visibilityHours = settingData?.value ? 
        (typeof settingData.value === 'number' ? settingData.value : parseInt(String(settingData.value), 10)) : 72;

      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - visibilityHours);

      const { data, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          approved_at,
          new_uploads_excluded,
          new_uploads_pinned,
          new_uploads_pinned_until,
          base_price,
          has_audio,
          has_lyrics,
          play_count,
          cover_image_url,
          seller_id,
          profiles!songs_seller_id_fkey (
            full_name,
            is_verified
          )
        `)
        .eq('status', 'approved')
        .not('approved_at', 'is', null)
        .gte('approved_at', cutoffDate.toISOString())
        .order('approved_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });
}
