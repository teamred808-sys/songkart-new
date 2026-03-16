import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export interface PayoutProfile {
  id: string;
  seller_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_encrypted: string;
  account_number_last4: string;
  ifsc_code: string;
  account_type: string;
  country: string;
  currency: string;
  upi_id: string | null;
  verification_status: 'not_added' | 'pending' | 'verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  is_active: boolean;
  is_locked: boolean;
  locked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutProfileInput {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  country?: string;
  currency?: string;
  upi_id?: string;
}

export interface WithdrawEligibility {
  can_withdraw: boolean;
  reason?: string;
  status?: string;
  message?: string;
  has_pending_withdrawal?: boolean;
  account_last4?: string;
  bank_name?: string;
}

// Fetch seller's payout profile
export function usePayoutProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payout-profile', user?.id],
    queryFn: async (): Promise<PayoutProfile | null> => {
      if (!user) return null;

      const data = await apiFetch(`/seller_payout_profiles?seller_id=${user.id}&is_active=true`);
      return (data?.[0] || null) as PayoutProfile | null;
    },
    enabled: !!user,
  });
}

// Check withdrawal eligibility
export function useWithdrawEligibility() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['withdraw-eligibility', user?.id],
    queryFn: async (): Promise<WithdrawEligibility> => {
      if (!user) {
        return { can_withdraw: false, reason: 'not_authenticated', message: 'Please sign in.' };
      }

      const data = await apiFetch('/rpc/can_seller_withdraw', { method: 'POST' });
      return data as unknown as WithdrawEligibility;
    },
    enabled: !!user,
  });
}

// Create or update payout profile
export function useSavePayoutProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PayoutProfileInput) => {
      if (!user) throw new Error('Not authenticated');

      // Encrypt account number (simple obfuscation for now - in production use proper encryption)
      const accountNumberEncrypted = btoa(input.account_number);
      const accountNumberLast4 = input.account_number.slice(-4);

      // Check if profile exists
      const existingArr = await apiFetch(`/seller_payout_profiles?seller_id=${user.id}`);
      const existing = existingArr?.[0] || null;

      if (existing?.is_locked) {
        throw new Error('Your payout profile is currently locked and cannot be edited.');
      }

      const profileData = {
        seller_id: user.id,
        account_holder_name: input.account_holder_name.trim(),
        bank_name: input.bank_name.trim(),
        account_number_encrypted: accountNumberEncrypted,
        account_number_last4: accountNumberLast4,
        ifsc_code: input.ifsc_code.toUpperCase().trim(),
        account_type: input.account_type,
        country: input.country || 'India',
        currency: input.currency || 'INR',
        upi_id: input.upi_id?.trim() || null,
        verification_status: 'pending' as const,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const data = await apiFetch(`/seller_payout_profiles/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(profileData),
        });
        return data;
      } else {
        const data = await apiFetch('/seller_payout_profiles', {
          method: 'POST',
          body: JSON.stringify(profileData),
        });
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-profile'] });
      queryClient.invalidateQueries({ queryKey: ['withdraw-eligibility'] });
      toast.success('Bank details saved successfully. Pending verification.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save bank details');
    },
  });
}

// Admin: Fetch all payout profiles
export function useAllPayoutProfiles(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['admin-payout-profiles', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ is_active: 'true' });
      if (filters?.status) params.append('verification_status', filters.status);

      const data = await apiFetch(`/seller_payout_profiles?${params.toString()}`);
      return data;
    },
  });
}

// Admin: Verify or reject payout profile
export function useVerifyPayoutProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      profileId,
      action,
      reason,
    }: {
      profileId: string;
      action: 'verify' | 'reject';
      reason?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {
        verification_status: action === 'verify' ? 'verified' : 'rejected',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (action === 'reject' && reason) {
        updateData.rejection_reason = reason;
      }

      const data = await apiFetch(`/seller_payout_profiles/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      // Log admin action (non-critical)
      await apiFetch('/activity_logs', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          entity_type: 'payout_profile',
          entity_id: profileId,
          action: action === 'verify' ? 'verified' : 'rejected',
          metadata: { reason },
        }),
      }).catch(() => {});

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payout-profiles'] });
      toast.success(
        variables.action === 'verify'
          ? 'Payout profile verified successfully'
          : 'Payout profile rejected'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payout profile');
    },
  });
}

// Admin: Lock/unlock payout profile
export function useLockPayoutProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      lock,
      reason,
    }: {
      profileId: string;
      lock: boolean;
      reason?: string;
    }) => {
      const data = await apiFetch(`/seller_payout_profiles/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_locked: lock,
          locked_reason: lock ? reason : null,
          updated_at: new Date().toISOString(),
        }),
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payout-profiles'] });
      toast.success(variables.lock ? 'Profile locked' : 'Profile unlocked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update lock status');
    },
  });
}

// Fetch payout profile change logs (for admin)
export function usePayoutChangeLogs(sellerId?: string) {
  return useQuery({
    queryKey: ['payout-change-logs', sellerId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (sellerId) params.append('seller_id', sellerId);

      const data = await apiFetch(`/payout_profile_change_logs?${params.toString()}`);
      return data;
    },
    enabled: !!sellerId,
  });
}

// Validation helpers
export const payoutValidation = {
  ifscCode: (value: string): boolean => {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase());
  },
  accountNumber: (value: string): boolean => {
    return /^\d{9,18}$/.test(value);
  },
  upiId: (value: string): boolean => {
    if (!value) return true; // Optional field
    return /^[\w.-]+@[\w]+$/.test(value);
  },
};
