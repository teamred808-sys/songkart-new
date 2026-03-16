import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api';

// Types
export interface SellerStrike {
  id: string;
  seller_id: string;
  strike_type: 'community' | 'copyright';
  reason: string;
  details: string | null;
  evidence_urls: string[];
  song_id: string | null;
  status: 'active' | 'expired' | 'appealed' | 'reversed';
  expires_at: string | null;
  issued_by: string | null;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  appeal_status: 'pending' | 'approved' | 'rejected' | null;
  appeal_reason: string | null;
  appeal_submitted_at: string | null;
  appeal_reviewed_by: string | null;
  appeal_reviewed_at: string | null;
  appeal_response: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  song?: { title: string } | null;
  issuer?: { full_name: string; email: string } | null;
}

export interface SellerAccountHealth {
  id: string;
  seller_id: string;
  health_score: number;
  community_strikes_active: number;
  copyright_strikes_active: number;
  is_frozen: boolean;
  frozen_at: string | null;
  frozen_until: string | null;
  freeze_reason: string | null;
  is_deactivated: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  funds_forfeited: boolean;
  forfeited_amount: number;
  forfeited_at: string | null;
  restored_by: string | null;
  restored_at: string | null;
  restoration_notes: string | null;
  last_strike_at: string | null;
  last_health_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrikeNotification {
  id: string;
  seller_id: string;
  strike_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

// Hook: Get seller's account health
export function useSellerHealth(sellerId?: string) {
  const { user } = useAuth();
  const targetId = sellerId || user?.id;

  return useQuery({
    queryKey: ['seller-health', targetId],
    queryFn: async () => {
      if (!targetId) return null;

      const dataArr = await apiFetch(`/seller_account_health?seller_id=${targetId}`);
      const data = dataArr?.[0] || null;

      // Return default health if no record exists
      if (!data) {
        return {
          seller_id: targetId,
          health_score: 100,
          community_strikes_active: 0,
          copyright_strikes_active: 0,
          is_frozen: false,
          is_deactivated: false,
          funds_forfeited: false,
        } as Partial<SellerAccountHealth>;
      }
      
      return data as SellerAccountHealth;
    },
    enabled: !!targetId,
  });
}

// Hook: Get seller's strikes
export function useSellerStrikes(sellerId?: string) {
  const { user } = useAuth();
  const targetId = sellerId || user?.id;

  return useQuery({
    queryKey: ['seller-strikes', targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const data = await apiFetch(`/seller_strikes/full?seller_id=${targetId}`);
      return data as SellerStrike[];
    },
    enabled: !!targetId,
  });
}

// Hook: Get strike notifications for seller
export function useStrikeNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['strike-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const data = await apiFetch(`/strike_notifications?seller_id=${user.id}&limit=50`);
      return data as StrikeNotification[];
    },
    enabled: !!user?.id,
  });
}

// Hook: Get unread notification count
export function useUnreadStrikeNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['strike-notifications-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const data = await apiFetch(`/strike_notifications?seller_id=${user.id}&is_read=false`);
      return data?.length || 0;
    },
    enabled: !!user?.id,
  });
}

// Hook: Admin - Get all strikes with filters
export function useAllStrikesAdmin(filters?: {
  status?: string;
  strike_type?: string;
  seller_id?: string;
}) {
  return useQuery({
    queryKey: ['admin-strikes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.strike_type) params.append('strike_type', filters.strike_type);
      if (filters?.seller_id) params.append('seller_id', filters.seller_id);

      const data = await apiFetch(`/seller_strikes/full?${params.toString()}`);
      return data;
    },
  });
}

// Hook: Admin - Get all seller health records
export function useAllSellerHealthAdmin() {
  return useQuery({
    queryKey: ['admin-seller-health'],
    queryFn: async () => {
      const data = await apiFetch('/seller_account_health/full');
      return data;
    },
  });
}

// Mutation: Issue a strike
export function useIssueStrike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      seller_id: string;
      strike_type: 'community' | 'copyright';
      reason: string;
      details?: string;
      evidence_urls?: string[];
      song_id?: string;
    }) => {
      const data = await apiFetch('/rpc/issue_seller_strike', { 
        method: 'POST',
        body: JSON.stringify(params)
      });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-strikes', variables.seller_id] });
      queryClient.invalidateQueries({ queryKey: ['seller-health', variables.seller_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-strikes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-seller-health'] });
      toast.success('Strike issued successfully');
    },
    onError: (error) => {
      toast.error('Failed to issue strike: ' + error.message);
    },
  });
}

// Mutation: Reverse a strike
export function useReverseStrike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { strike_id: string; reason: string }) => {
      const data = await apiFetch('/rpc/reverse_seller_strike', { 
        method: 'POST',
        body: JSON.stringify(params)
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-strikes'] });
      queryClient.invalidateQueries({ queryKey: ['seller-health'] });
      queryClient.invalidateQueries({ queryKey: ['admin-strikes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-seller-health'] });
      toast.success('Strike reversed successfully');
    },
    onError: (error) => {
      toast.error('Failed to reverse strike: ' + error.message);
    },
  });
}

// Mutation: Restore seller account
export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { seller_id: string; notes: string }) => {
      const data = await apiFetch('/rpc/restore_seller_account', { 
        method: 'POST',
        body: JSON.stringify(params)
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-strikes', variables.seller_id] });
      queryClient.invalidateQueries({ queryKey: ['seller-health', variables.seller_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-strikes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-seller-health'] });
      toast.success('Account restored successfully');
    },
    onError: (error) => {
      toast.error('Failed to restore account: ' + error.message);
    },
  });
}

// Mutation: Submit appeal
export function useSubmitAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { strike_id: string; reason: string }) => {
      const data = await apiFetch('/rpc/submit_strike_appeal', { 
        method: 'POST',
        body: JSON.stringify(params)
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-strikes'] });
      toast.success('Appeal submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit appeal: ' + error.message);
    },
  });
}

// Mutation: Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(`/strike_notifications/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strike-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['strike-notifications-unread', user?.id] });
    },
  });
}

// Hook: Check if seller can upload
export function useCanUpload() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-upload', user?.id],
    queryFn: async () => {
      if (!user?.id) return { can_upload: true, reason: null };

      const data = await apiFetch('/rpc/check_seller_can_upload', { method: 'POST' }).catch(() => ({ can_upload: true, reason: null }));
      return data as { can_upload: boolean; reason: string | null };
    },
    enabled: !!user?.id,
  });
}

// Hook: Check if seller can withdraw
export function useCanWithdraw() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-withdraw', user?.id],
    queryFn: async () => {
      if (!user?.id) return { can_withdraw: true, reason: null };

      const data = await apiFetch('/rpc/check_seller_can_withdraw', { method: 'POST' }).catch(() => ({ can_withdraw: true, reason: null }));
      return data as { can_withdraw: boolean; reason: string | null };
    },
    enabled: !!user?.id,
  });
}
