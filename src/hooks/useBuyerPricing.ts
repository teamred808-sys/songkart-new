import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

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

      const data = await apiFetch('/rpc/get_country_pricing', {
        method: 'POST',
        body: JSON.stringify({ country_code: countryCode }),
      });

      if (Array.isArray(data) && data.length > 0) {
        return data[0] as CountryPricing;
      }

      return data as CountryPricing || null;
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

      const data = await apiFetch('/rpc/calculate_dynamic_price', {
        method: 'POST',
        body: JSON.stringify({
          base_price_inr: basePriceInr,
          country_code: countryCode,
          seller_id: sellerId,
          has_audio: hasAudio,
        }),
      });

      if (Array.isArray(data) && data.length > 0) {
        return data[0] as LocalizedPrice;
      }

      return data as LocalizedPrice || null;
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
      try {
        const data = await apiFetch('/detect-buyer-country', { method: 'POST' });
        return data || { country_code: 'IN', detection_method: 'fallback' };
      } catch (error) {
        console.error('Error detecting buyer country:', error);
        return { country_code: 'IN', detection_method: 'fallback' };
      }
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
export function usePricingZones(countryCode?: string) {
  return useQuery({
    queryKey: ['pricing-zones', countryCode],
    queryFn: async () => {
      const data = await apiFetch(`/pricing_zone_countries?country_code=${countryCode}`);
      return data?.[0] || null;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}

// Get all exchange rates (for reference)
export function useExchangeRates(countryCode?: string) {
  return useQuery({
    queryKey: ['exchange-rates', countryCode],
    queryFn: async () => {
      const data = await apiFetch(`/currency_exchange_rates?currency_code=${countryCode}`);
      return data?.[0] || null;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}
