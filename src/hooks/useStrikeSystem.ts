import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

      const { data, error } = await supabase
        .from('seller_account_health')
        .select('*')
        .eq('seller_id', targetId)
        .maybeSingle();

      if (error) throw error;
      
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

      const { data, error } = await supabase
        .from('seller_strikes')
        .select(`
          *,
          song:songs(title)
        `)
        .eq('seller_id', targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('strike_notifications')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
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

      const { count, error } = await supabase
        .from('strike_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
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
      let query = supabase
        .from('seller_strikes')
        .select(`
          *,
          song:songs(title),
          seller:profiles!seller_id(full_name, email, username)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.strike_type) {
        query = query.eq('strike_type', filters.strike_type);
      }
      if (filters?.seller_id) {
        query = query.eq('seller_id', filters.seller_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Hook: Admin - Get all seller health records
export function useAllSellerHealthAdmin() {
  return useQuery({
    queryKey: ['admin-seller-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_account_health')
        .select(`
          *,
          seller:profiles!seller_id(full_name, email, username, avatar_url)
        `)
        .order('health_score', { ascending: true });

      if (error) throw error;
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
      const { data, error } = await supabase.rpc('issue_seller_strike', {
        p_seller_id: params.seller_id,
        p_strike_type: params.strike_type,
        p_reason: params.reason,
        p_details: params.details || null,
        p_evidence_urls: params.evidence_urls || [],
        p_song_id: params.song_id || null,
      });

      if (error) throw error;
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
      const { data, error } = await supabase.rpc('reverse_seller_strike', {
        p_strike_id: params.strike_id,
        p_reason: params.reason,
      });

      if (error) throw error;
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
      const { data, error } = await supabase.rpc('restore_seller_account', {
        p_seller_id: params.seller_id,
        p_notes: params.notes,
      });

      if (error) throw error;
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
      const { data, error } = await supabase.rpc('submit_strike_appeal', {
        p_strike_id: params.strike_id,
        p_reason: params.reason,
      });

      if (error) throw error;
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
      const { error } = await supabase
        .from('strike_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
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

      const { data, error } = await supabase.rpc('check_seller_can_upload', {
        p_seller_id: user.id,
      });

      if (error) throw error;
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

      const { data, error } = await supabase.rpc('check_seller_can_withdraw', {
        p_seller_id: user.id,
      });

      if (error) throw error;
      return data as { can_withdraw: boolean; reason: string | null };
    },
    enabled: !!user?.id,
  });
}
