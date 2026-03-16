import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export interface PricingZone {
  id: string;
  zone_code: string;
  zone_name: string;
  multiplier: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingZoneCountry {
  id: string;
  country_code: string;
  country_name: string;
  zone_id: string;
  currency_code: string;
  is_active: boolean;
  created_at: string;
}

export interface CurrencyExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  rate_from_inr: number;
  last_updated: string;
  is_active: boolean;
}

// Get all pricing zones for admin
export function useAdminPricingZones() {
  return useQuery({
    queryKey: ['admin-pricing-zones'],
    queryFn: async () => {
      const data = await apiFetch('/pricing_zones');
      return (data as PricingZone[]).sort((a, b) => a.multiplier - b.multiplier);
    },
  });
}

// Get all country mappings for admin
export function useAdminCountryMappings() {
  return useQuery({
    queryKey: ['admin-country-mappings'],
    queryFn: async () => {
      const data = await apiFetch('/pricing_zone_countries');
      return (data as PricingZoneCountry[]).sort((a, b) => a.country_name.localeCompare(b.country_name));
    },
  });
}

// Get all exchange rates for admin
export function useAdminExchangeRates() {
  return useQuery({
    queryKey: ['admin-exchange-rates'],
    queryFn: async () => {
      const data = await apiFetch('/currency_exchange_rates');
      return (data as CurrencyExchangeRate[]).sort((a, b) => a.currency_code.localeCompare(b.currency_code));
    },
  });
}

// Get dynamic pricing enabled status
export function useDynamicPricingEnabled() {
  return useQuery({
    queryKey: ['dynamic-pricing-enabled'],
    queryFn: async () => {
      const data = await apiFetch('/platform_settings?key=dynamic_pricing_enabled');
      const setting = Array.isArray(data) ? data[0] : data;
      return (setting?.value as { enabled: boolean })?.enabled ?? true;
    },
  });
}

// Toggle dynamic pricing
export function useToggleDynamicPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiFetch('/platform_settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'dynamic_pricing_enabled',
          value: { enabled },
          updated_at: new Date().toISOString()
        })
      });
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing-enabled'] });
      toast.success(`Dynamic pricing ${enabled ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      console.error('Error toggling dynamic pricing:', error);
      toast.error('Failed to update dynamic pricing setting');
    },
  });
}

// Update pricing zone
export function useUpdatePricingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingZone> & { id: string }) => {
      const data = await apiFetch(`/pricing_zones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString()
        })
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-zones'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-zones'] });
      toast.success('Pricing zone updated');
    },
    onError: (error) => {
      console.error('Error updating pricing zone:', error);
      toast.error('Failed to update pricing zone');
    },
  });
}

// Create pricing zone
export function useCreatePricingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zone: Omit<PricingZone, 'id' | 'created_at' | 'updated_at'>) => {
      const data = await apiFetch('/pricing_zones', {
        method: 'POST',
        body: JSON.stringify(zone)
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-zones'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-zones'] });
      toast.success('Pricing zone created');
    },
    onError: (error) => {
      console.error('Error creating pricing zone:', error);
      toast.error('Failed to create pricing zone');
    },
  });
}

// Update country mapping
export function useUpdateCountryMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingZoneCountry> & { id: string }) => {
      const data = await apiFetch(`/pricing_zone_countries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-country-mappings'] });
      toast.success('Country mapping updated');
    },
    onError: (error) => {
      console.error('Error updating country mapping:', error);
      toast.error('Failed to update country mapping');
    },
  });
}

// Update exchange rate
export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rate_from_inr }: { id: string; rate_from_inr: number }) => {
      const data = await apiFetch(`/currency_exchange_rates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          rate_from_inr,
          last_updated: new Date().toISOString()
        })
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Exchange rate updated');
    },
    onError: (error) => {
      console.error('Error updating exchange rate:', error);
      toast.error('Failed to update exchange rate');
    },
  });
}

// Get pricing analytics/snapshots
export function usePricingAnalytics(limit = 100) {
  return useQuery({
    queryKey: ['pricing-analytics', limit],
    queryFn: async () => {
      const data = await apiFetch(`/order_pricing_snapshots?limit=${limit}`);
      return data;
    },
  });
}
