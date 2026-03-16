import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface PromoCode {
  id: string;
  code: string;
  created_by: string;
  creator_role: string;
  discount_type: string;
  discount_value: number;
  song_id: string | null;
  license_type: string | null;
  min_purchase_amount: number;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreatePromoCodeInput {
  code: string;
  creator_role: 'admin' | 'seller';
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  song_id?: string | null;
  license_type?: string | null;
  min_purchase_amount?: number;
  usage_limit?: number | null;
  expires_at?: string | null;
}

interface ValidatePromoResult {
  valid: boolean;
  message: string;
  promo_code_id?: string;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  applied_to_song_id?: string | null;
  applied_to_license_type?: string | null;
}

export function usePromoCodes(role?: 'admin' | 'seller') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promo-codes', role, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (role === 'seller' && user) {
        params.append('created_by', user.id);
        params.append('creator_role', 'seller');
      }
      const data = await apiFetch(`/promo_codes?${params.toString()}`);
      return data as PromoCode[];
    },
    enabled: !!user,
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePromoCodeInput) => {
      if (!user) throw new Error('Not authenticated');

      const data = await apiFetch('/promo_codes', {
        method: 'POST',
        body: JSON.stringify({ ...input, code: input.code.trim().toUpperCase(), created_by: user.id }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Promo code created successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('This promo code already exists');
      } else {
        toast.error(error.message);
      }
    },
  });
}

export function useUpdatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PromoCode> & { id: string }) => {
      const data = await apiFetch(`/promo_codes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Promo code updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useValidatePromoCode() {
  return useMutation({
    mutationFn: async ({ code, cart_items }: {
      code: string;
      cart_items: Array<{ song_id: string; license_type: string; license_price: number }>;
    }): Promise<ValidatePromoResult> => {
      const data = await apiFetch('/validate-promo-code', {
        method: 'POST',
        body: JSON.stringify({ code, cart_items }),
      });
      return data as ValidatePromoResult;
    },
  });
}
