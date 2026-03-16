import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

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
    queryFn: async () => {
      const data = await apiFetch('/rpc/get_new_uploads', { method: 'POST', body: JSON.stringify({ limit_val: limit }) }).catch(() => []);

      const songs = (data || []) as NewUploadSong[];
      
      // Batch-fetch license tiers for all songs
      if (songs.length > 0) {
        const songIds = songs.map(s => s.id);
        const tiers = await apiFetch(`/license_tiers?song_id=in.(${songIds.join(',')})&is_available=true`);
        
        const tierMap = new Map<string, Array<{ license_type: string; price: number }>>();
        tiers?.forEach(t => {
          if (!tierMap.has(t.song_id)) tierMap.set(t.song_id, []);
          tierMap.get(t.song_id)!.push({ license_type: t.license_type, price: t.price });
        });
        
        return songs.map(song => ({
          ...song,
          license_tiers: tierMap.get(song.id) || [],
        }));
      }
      
      return songs.map(song => ({ ...song, license_tiers: [] as Array<{ license_type: string; price: number }> }));
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useNewUploadsSectionEnabled() {
  return useQuery({
    queryKey: ['new-uploads-enabled'],
    queryFn: async (): Promise<boolean> => {
      const data = await apiFetch('/platform_settings?key=new_uploads_section_enabled');
      const setting = data?.[0] || null;

      if (!setting) {
        console.error('Error fetching new uploads enabled setting');
        return true; // Default to enabled
      }

      return setting?.value === true || setting?.value === 'true';
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useNewUploadsSettings() {
  return useQuery({
    queryKey: ['new-uploads-settings'],
    queryFn: async (): Promise<NewUploadsSettings> => {
      const keys = [
        'new_uploads_visibility_hours',
        'new_uploads_max_per_seller',
        'new_uploads_upload_rate_limit',
        'new_uploads_section_enabled',
        'new_uploads_scoring_weights'
      ];
      
      const data = await apiFetch(`/platform_settings?key=in.(${keys.join(',')})`);

      if (!data) {
        console.error('Error fetching new uploads settings');
        throw new Error('Failed to fetch settings');
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
      // First get the setting to get its ID
      const settings = await apiFetch(`/platform_settings?key=${key}`);
      const setting = settings?.[0];
      
      if (setting) {
        await apiFetch(`/platform_settings/${setting.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ value: value as never, updated_at: new Date().toISOString() })
        });
      } else {
        await apiFetch('/platform_settings', {
          method: 'POST',
          body: JSON.stringify({ key, value: value as never, updated_at: new Date().toISOString() })
        });
      }
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
      const data = await apiFetch('/rpc/admin_manage_new_upload', { 
        method: 'POST',
        body: JSON.stringify({ song_id: songId, action, pin_until: pinUntil })
      });

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
      const settingDataArr = await apiFetch('/platform_settings?key=new_uploads_visibility_hours');
      const settingData = settingDataArr?.[0] || null;

      const visibilityHours = settingData?.value ? 
        (typeof settingData.value === 'number' ? settingData.value : parseInt(String(settingData.value), 10)) : 72;

      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - visibilityHours);

      const data = await apiFetch(`/songs/full?status=approved&approved_at=gte.${cutoffDate.toISOString()}`);
      
      // Filter out null approved_at and sort
      return (data || [])
        .filter((s: any) => s.approved_at !== null)
        .sort((a: any, b: any) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime());
    },
    staleTime: 1000 * 60 * 2,
  });
}
