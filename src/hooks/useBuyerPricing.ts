import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CountryPricing {
  zone_code: string;
  zone_name: string;
  multiplier: number;
  currency_code: string;
  currency_symbol: string;
  exchange_rate: number;
  is_dynamic_pricing_enabled: boolean;
}

export interface LocalizedPrice {
  base_price_inr: number;
  zone_code: string;
  zone_multiplier: number;
  tier_max_price: number | null;
  calculated_price_inr: number;
  final_price_inr: number;
  buyer_currency_code: string;
  exchange_rate: number;
  final_price_buyer_currency: number;
  is_capped_by_tier: boolean;
  is_dynamic_pricing_enabled: boolean;
}

// Hook to get buyer's country pricing info
export function useCountryPricing(countryCode?: string) {
  return useQuery({
    queryKey: ['country-pricing', countryCode],
    queryFn: async (): Promise<CountryPricing | null> => {
      if (!countryCode) return null;

      const { data, error } = await supabase.rpc('get_country_pricing', {
        p_country_code: countryCode
      });

      if (error) {
        console.error('Error fetching country pricing:', error);
        throw error;
      }

      if (Array.isArray(data) && data.length > 0) {
        return data[0] as CountryPricing;
      }

      return null;
    },
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

// Hook to calculate dynamic price for a specific item
export function useDynamicPrice(
  basePriceInr: number,
  sellerId: string | undefined,
  hasAudio: boolean,
  countryCode?: string
) {
  return useQuery({
    queryKey: ['dynamic-price', basePriceInr, sellerId, hasAudio, countryCode],
    queryFn: async (): Promise<LocalizedPrice | null> => {
      if (!sellerId || !countryCode) return null;

      const { data, error } = await supabase.rpc('calculate_dynamic_price', {
        p_base_price_inr: basePriceInr,
        p_seller_id: sellerId,
        p_has_audio: hasAudio,
        p_country_code: countryCode
      });

      if (error) {
        console.error('Error calculating dynamic price:', error);
        throw error;
      }

      if (Array.isArray(data) && data.length > 0) {
        return data[0] as LocalizedPrice;
      }

      return null;
    },
    enabled: !!sellerId && !!countryCode && basePriceInr > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Hook to detect buyer's country (uses IP geolocation via edge function)
export function useBuyerCountry() {
  return useQuery({
    queryKey: ['buyer-country'],
    queryFn: async (): Promise<{ country_code: string; detection_method: string }> => {
      // Try to get country from edge function
      const { data, error } = await supabase.functions.invoke('detect-buyer-country');

      if (error) {
        console.error('Error detecting buyer country:', error);
        // Default to India if detection fails
        return { country_code: 'IN', detection_method: 'fallback' };
      }

      return data || { country_code: 'IN', detection_method: 'fallback' };
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1,
  });
}

// Format price with currency symbol
export function formatLocalizedPrice(
  amount: number,
  currencySymbol: string,
  currencyCode: string
): string {
  // Handle different currency formatting rules
  if (currencyCode === 'INR') {
    return `${currencySymbol}${amount.toLocaleString('en-IN')}`;
  }
  
  if (['USD', 'CAD', 'AUD', 'NZD', 'SGD'].includes(currencyCode)) {
    return `${currencySymbol}${amount.toFixed(2)}`;
  }
  
  if (['EUR', 'GBP', 'CHF'].includes(currencyCode)) {
    return `${currencySymbol}${amount.toFixed(2)}`;
  }
  
  if (currencyCode === 'JPY' || currencyCode === 'KRW') {
    return `${currencySymbol}${Math.round(amount).toLocaleString()}`;
  }
  
  // Default formatting
  return `${currencySymbol}${amount.toFixed(2)}`;
}

// Get all pricing zones (for reference)
export function usePricingZones() {
  return useQuery({
    queryKey: ['pricing-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_zones')
        .select('*')
        .eq('is_active', true)
        .order('multiplier', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

// Get all exchange rates (for reference)
export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_exchange_rates')
        .select('*')
        .eq('is_active', true)
        .order('currency_code', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}
