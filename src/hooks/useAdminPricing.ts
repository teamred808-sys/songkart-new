import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const { data, error } = await supabase
        .from('pricing_zones')
        .select('*')
        .order('multiplier', { ascending: true });

      if (error) throw error;
      return data as PricingZone[];
    },
  });
}

// Get all country mappings for admin
export function useAdminCountryMappings() {
  return useQuery({
    queryKey: ['admin-country-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_zone_countries')
        .select(`
          *,
          pricing_zones (
            zone_code,
            zone_name,
            multiplier
          )
        `)
        .order('country_name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

// Get all exchange rates for admin
export function useAdminExchangeRates() {
  return useQuery({
    queryKey: ['admin-exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .select('*')
        .order('currency_code', { ascending: true });

      if (error) throw error;
      return data as CurrencyExchangeRate[];
    },
  });
}

// Get dynamic pricing enabled status
export function useDynamicPricingEnabled() {
  return useQuery({
    queryKey: ['dynamic-pricing-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'dynamic_pricing_enabled')
        .maybeSingle();

      if (error) throw error;
      return (data?.value as { enabled: boolean })?.enabled ?? true;
    },
  });
}

// Toggle dynamic pricing
export function useToggleDynamicPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'dynamic_pricing_enabled',
          value: { enabled },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('pricing_zones')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('pricing_zones')
        .insert(zone)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('pricing_zone_countries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .update({
          rate_from_inr,
          last_updated: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('order_pricing_snapshots')
        .select(`
          *,
          orders (
            order_number,
            buyer_id,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}
