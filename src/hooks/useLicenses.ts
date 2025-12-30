import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LicenseDocument {
  id: string;
  license_number: string;
  order_item_id: string;
  template_id: string;
  template_version: number;
  buyer_id: string;
  seller_id: string;
  song_id: string;
  buyer_name: string;
  seller_name: string;
  song_title: string;
  license_type: string;
  price: number;
  document_hash: string;
  pdf_storage_path: string;
  status: 'active' | 'revoked';
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export function useLicenseDocuments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['license-documents', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('license_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LicenseDocument[];
    },
    enabled: !!user,
  });
}

export function useLicenseByOrderItem(orderItemId: string | undefined) {
  return useQuery({
    queryKey: ['license-document', orderItemId],
    queryFn: async () => {
      if (!orderItemId) return null;

      const { data, error } = await supabase
        .from('license_documents')
        .select('*')
        .eq('order_item_id', orderItemId)
        .maybeSingle();

      if (error) throw error;
      return data as LicenseDocument | null;
    },
    enabled: !!orderItemId,
  });
}

export function useDownloadLicense() {
  return useMutation({
    mutationFn: async ({ orderItemId }: { orderItemId: string }) => {
      const { data, error } = await supabase.functions.invoke('download-license', {
        body: { order_item_id: orderItemId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: async (data) => {
      if (data?.download_url) {
        try {
          // Fetch the file as a blob to force download (bypasses cross-origin restriction)
          const response = await fetch(data.download_url);
          if (!response.ok) throw new Error('Failed to fetch license file');
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          // Create download link with blob URL (same-origin, so download attribute works)
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = data.filename || `license_${data.license_number || 'agreement'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL after a short delay
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          
          toast.success('License download started');
        } catch (error) {
          console.error('License download error:', error);
          toast.error('Failed to download license file');
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to download license');
    },
  });
}

export function useRevokeLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ licenseDocumentId, reason }: { licenseDocumentId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('revoke-license', {
        body: { license_document_id: licenseDocumentId, reason },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-documents'] });
      toast.success('License revoked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke license');
    },
  });
}

export function useAllLicenses() {
  return useQuery({
    queryKey: ['all-licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LicenseDocument[];
    },
  });
}
