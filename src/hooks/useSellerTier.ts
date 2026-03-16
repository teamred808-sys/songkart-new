import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { isValidUUID } from '@/lib/validation';
import { apiFetch } from '@/lib/api';

export interface SellerTierInfo {
  tier_level: number;
  tier_name: string;
  badge_label: string;
  badge_color: string;
  lifetime_sales: number;
  max_price_lyrics_only: number | null;
  max_price_with_audio: number | null;
  next_tier_threshold: number | null;
  amount_to_next_tier: number | null;
  is_frozen: boolean;
  frozen_reason: string | null;
}

export interface PriceValidationResult {
  valid: boolean;
  max_allowed: number | null;
  requested_price?: number;
  tier_name: string;
  tier_level: number;
  amount_to_next_tier?: number;
  message: string;
}

export function useSellerTier(sellerId?: string) {
  const { user } = useAuth();
  const targetSellerId = sellerId || user?.id;

  return useQuery({
    queryKey: ['seller-tier', targetSellerId],
    queryFn: async (): Promise<SellerTierInfo | null> => {
      // Validate UUID before RPC call to prevent database errors
      if (!isValidUUID(targetSellerId)) {
        return null;
      }

      const data = await apiFetch('/rpc/get_seller_tier', { 
        method: 'POST',
        body: JSON.stringify({ p_seller_id: targetSellerId })
      }).catch((error) => {
        console.error('Error fetching seller tier:', error);
        throw error;
      });

      // RPC returns an array, get first row
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as SellerTierInfo;
      }
      
      return null;
    },
    enabled: isValidUUID(targetSellerId),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useValidateSongPrice() {
  const { user } = useAuth();

  const validatePrice = async (
    price: number,
    hasAudio: boolean
  ): Promise<PriceValidationResult> => {
    if (!isValidUUID(user?.id)) {
      throw new Error('User not authenticated');
    }

    const data = await apiFetch('/rpc/validate_song_price', { 
      method: 'POST',
      body: JSON.stringify({
        p_seller_id: user.id,
        p_price: price,
        p_has_audio: hasAudio
      })
    }).catch((error) => {
      console.error('Error validating price:', error);
      throw error;
    });

    return data as unknown as PriceValidationResult;
  };

  return { validatePrice };
}

export function useTierDefinitions() {
  return useQuery({
    queryKey: ['tier-definitions'],
    queryFn: async () => {
      const data = await apiFetch('/seller_tiers');
      return (data as any[]).sort((a, b) => a.tier_level - b.tier_level);
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}
