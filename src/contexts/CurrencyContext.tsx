import React, { createContext, useContext, ReactNode } from 'react';
import { useBuyerCountry, useCountryPricing, formatLocalizedPrice } from '@/hooks/useBuyerPricing';

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AUD': 'A$',
  'CAD': 'C$',
  'SGD': 'S$',
  'AED': 'د.إ',
  'JPY': '¥',
  'KRW': '₩',
  'BRL': 'R$',
  'MXN': 'MX$',
  'NZD': 'NZ$',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'THB': '฿',
  'IDR': 'Rp',
  'MYR': 'RM',
  'PHP': '₱',
  'VND': '₫',
  'ZAR': 'R',
  'HKD': 'HK$',
  'TWD': 'NT$',
  'RUB': '₽',
  'TRY': '₺',
  'SAR': '﷼',
  'PKR': 'Rs',
  'BDT': '৳',
  'LKR': 'Rs',
  'NPR': 'Rs',
};

interface CurrencyContextValue {
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number;
  isLoading: boolean;
  formatPrice: (amountInr: number, options?: FormatPriceOptions) => string;
}

interface FormatPriceOptions {
  showOriginal?: boolean; // Show original INR price as well
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: countryData, isLoading: countryLoading } = useBuyerCountry();
  const { data: pricing, isLoading: pricingLoading } = useCountryPricing(countryData?.country_code);

  const countryCode = countryData?.country_code || 'IN';
  const currencyCode = pricing?.currency_code || 'INR';
  const currencySymbol = pricing?.currency_symbol || CURRENCY_SYMBOLS[currencyCode] || '₹';
  const exchangeRate = pricing?.exchange_rate || 1;
  const isLoading = countryLoading || pricingLoading;

  const formatPrice = (amountInr: number, options?: FormatPriceOptions): string => {
    const convertedAmount = amountInr * exchangeRate;
    
    // Format based on currency
    let formatted: string;
    
    if (currencyCode === 'INR') {
      // Indian formatting with lakhs/crores
      formatted = `${currencySymbol}${convertedAmount.toLocaleString('en-IN', {
        minimumFractionDigits: amountInr % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2,
      })}`;
    } else if (['JPY', 'KRW', 'VND', 'IDR'].includes(currencyCode)) {
      // Currencies without decimals
      formatted = `${currencySymbol}${Math.round(convertedAmount).toLocaleString()}`;
    } else {
      // Standard formatting with 2 decimals
      formatted = `${currencySymbol}${convertedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return formatted;
  };

  return (
    <CurrencyContext.Provider
      value={{
        countryCode,
        currencyCode,
        currencySymbol,
        exchangeRate,
        isLoading,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Optional hook that returns undefined if not in provider (for optional usage)
export function useCurrencyOptional() {
  return useContext(CurrencyContext);
}
