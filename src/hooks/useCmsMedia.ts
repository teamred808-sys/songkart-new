import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const { data, error } = await supabase
        .from('cms_media')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
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
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const storagePath = `uploads/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cms-media')
        .upload(storagePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cms-media')
        .getPublicUrl(storagePath);
      
      // Create media record
      const { data, error } = await supabase
        .from('cms_media')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          alt_text: altText || null,
          uploaded_by: user.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      const mediaRecord = data as CmsMedia;

      // Attempt AVIF compression (non-blocking — original is already saved)
      try {
        const fileType = file.type.toLowerCase();
        if (fileType !== 'image/svg+xml' && fileType !== 'image/gif') {
          const { data: compressData } = await supabase.functions.invoke('compress-image', {
            body: { storagePath },
          });
          if (compressData?.avifUrl) {
            const { data: updated } = await supabase
              .from('cms_media')
              .update({ avif_url: compressData.avifUrl } as any)
              .eq('id', mediaRecord.id)
              .select()
              .single();
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('cms-media')
        .remove([media.storage_path]);
      
      if (storageError) throw storageError;
      
      // Delete record
      const { error } = await supabase
        .from('cms_media')
        .delete()
        .eq('id', media.id);
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('cms_media')
        .update({
          alt_text: altText,
          caption: caption,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
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
