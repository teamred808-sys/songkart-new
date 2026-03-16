import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface LicenseRights {
  personal_use: boolean;
  youtube: boolean;
  streaming: boolean;
  ads_marketing: boolean;
  full_ownership: boolean;
}

export interface LicenseTierDefinition {
  id: string;
  tier_key: string;
  name: string;
  display_order: number;
  description: string | null;
  rights: LicenseRights;
  is_active: boolean;
}

export interface LicenseRightsLabel {
  id: string;
  right_key: string;
  display_name: string;
  tooltip: string | null;
  display_order: number;
}

export function useLicenseTierDefinitions() {
  return useQuery({
    queryKey: ['license-tier-definitions'],
    queryFn: async (): Promise<LicenseTierDefinition[]> => {
      const data = await apiFetch('/license_tier_definitions?is_active=true');
      const sortedData = (data as any[]).sort((a, b) => a.display_order - b.display_order);

      return (sortedData || []).map(item => ({
        ...item,
        rights: item.rights as unknown as LicenseRights,
      })) as LicenseTierDefinition[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

export function useLicenseRightsLabels() {
  return useQuery({
    queryKey: ['license-rights-labels'],
    queryFn: async (): Promise<LicenseRightsLabel[]> => {
      const data = await apiFetch('/license_rights_labels?is_active=true');
      const sortedData = (data as any[]).sort((a, b) => a.display_order - b.display_order);

      return (sortedData || []) as LicenseRightsLabel[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

// Combined hook for convenience
export function useLicenseSystem() {
  const tiers = useLicenseTierDefinitions();
  const labels = useLicenseRightsLabels();

  return {
    tiers: tiers.data || [],
    labels: labels.data || [],
    isLoading: tiers.isLoading || labels.isLoading,
    error: tiers.error || labels.error,
  };
}
