import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

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
      const data = await apiFetch(`/license_documents?buyer_id=${user.id}`);
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
      const data = await apiFetch(`/license_documents?order_item_id=${orderItemId}`);
      return (data?.[0] || null) as LicenseDocument | null;
    },
    enabled: !!orderItemId,
  });
}

// Retry fetch with exponential backoff
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (attempt === maxRetries - 1) throw new Error('Failed to fetch license file after retries');
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Failed to fetch license file');
}

export function useDownloadLicense() {
  return useMutation({
    mutationFn: async ({ orderItemId }: { orderItemId: string }) => {
      const data = await apiFetch('/download-license', {
        method: 'POST',
        body: JSON.stringify({ order_item_id: orderItemId }),
      });
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      if (data?.download_url) {
        try {
          const response = await fetchWithRetry(data.download_url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = data.filename || `license_${data.license_number || 'agreement'}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          
          toast.success('License download started');
        } catch (error) {
          console.error('License download error:', error);
          toast.error('Unable to load License. Try regenerating it.');
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to download license');
    },
  });
}

export function useRegenerateLicense() {
  const queryClient = useQueryClient();
  const [cooldown, setCooldown] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ orderItemId }: { orderItemId: string }) => {
      if (cooldown) throw new Error('Please wait before regenerating again');

      const data = await apiFetch('/generate-license-pdf', {
        method: 'POST',
        body: JSON.stringify({ order_item_id: orderItemId }),
      });
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-documents'] });
      toast.success('License regenerated successfully');
      setCooldown(true);
      setTimeout(() => setCooldown(false), 10000);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to regenerate license');
    },
  });

  return { ...mutation, cooldown };
}

export function useRevokeLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ licenseDocumentId, reason }: { licenseDocumentId: string; reason: string }) => {
      const data = await apiFetch('/revoke-license', {
        method: 'POST',
        body: JSON.stringify({ license_document_id: licenseDocumentId, reason }),
      });
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
      const data = await apiFetch('/license_documents');
      return data as LicenseDocument[];
    },
  });
}
