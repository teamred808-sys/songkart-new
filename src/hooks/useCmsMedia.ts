import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, API_BASE } from '@/lib/api';

export interface CmsMedia {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  avif_url: string | null;
  alt_text: string | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// Hook to fetch media library
export function useMediaLibrary() {
  return useQuery({
    queryKey: ['cms-media'],
    queryFn: async () => {
      const data = await apiFetch('/cms_media?order=created_at:desc');
      return data as CmsMedia[];
    },
  });
}

// Hook to upload media
export function useUploadMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, altText }: { file: File; altText?: string }) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG');
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File too large. Maximum size is 10MB');
      }
      
      // Upload file using FormData to backend storage endpoint
      const formData = new FormData();
      formData.append('file', file);
      if (altText) formData.append('alt_text', altText);

      const token = localStorage.getItem('auth_token');
      const uploadRes = await fetch(`${API_BASE}/storage/cms-media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const mediaRecord = await uploadRes.json() as CmsMedia;

      // Attempt AVIF compression (non-blocking — original is already saved)
      try {
        const fileType = file.type.toLowerCase();
        if (fileType !== 'image/svg+xml' && fileType !== 'image/gif') {
          const compressData = await apiFetch('/compress-image', {
            method: 'POST',
            body: JSON.stringify({ storagePath: mediaRecord.storage_path }),
          });
          if (compressData?.avifUrl) {
            const updated = await apiFetch(`/cms_media/${mediaRecord.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ avif_url: compressData.avifUrl }),
            });
            if (updated) return updated as CmsMedia;
          }
        }
      } catch (avifErr) {
        console.warn('AVIF compression skipped:', avifErr);
      }

      return mediaRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-media'] });
      toast.success('Image uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload image');
    },
  });
}

// Hook to delete media
export function useDeleteMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (media: CmsMedia) => {
      // Delete both storage file and DB record via backend
      await apiFetch(`/cms_media/${media.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-media'] });
      toast.success('Image deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete image');
    },
  });
}

// Hook to update media metadata
export function useUpdateMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, altText, caption }: { id: string; altText?: string; caption?: string }) => {
      const data = await apiFetch(`/cms_media/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ alt_text: altText, caption }),
      });
      return data as CmsMedia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-media'] });
      toast.success('Media updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update media');
    },
  });
}
