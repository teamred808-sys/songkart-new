import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';

// Admin Stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        usersResult,
        songsResult,
        pendingSongsResult,
        transactionsResult,
        withdrawalsResult,
        disputesResult
      ] = await Promise.all([
        apiFetch('/admin/profiles/count'),
        apiFetch('/admin/songs/count'),
        apiFetch('/admin/songs/pending/count'),
        apiFetch('/admin/transactions/completed'),
        apiFetch('/admin/withdrawals/pending'),
        apiFetch('/admin/disputes/active')
      ]);

      const totalRevenue = transactionsResult.data?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
      const commissionEarnings = transactionsResult.data?.reduce((sum: number, t: any) => sum + Number(t.commission_amount), 0) || 0;
      const pendingWithdrawalAmount = withdrawalsResult.data?.reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0;

      return {
        totalUsers: usersResult.count || 0,
        totalSongs: songsResult.count || 0,
        pendingApprovals: pendingSongsResult.count || 0,
        totalRevenue,
        commissionEarnings,
        pendingWithdrawals: withdrawalsResult.count || 0,
        pendingWithdrawalAmount,
        activeDisputes: disputesResult.count || 0,
        completedTransactions: transactionsResult.count || 0
      };
    }
  });
}

// All Users
export function useAllUsers(filters?: { role?: 'admin' | 'seller' | 'buyer'; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.role) queryParams.append('role', filters.role);

      const data = await apiFetch(`/admin/users?${queryParams.toString()}`);
      return data;
    }
  });
}

// User Detail
export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const data = await apiFetch(`/admin/users/${userId}`);
      return data;
    },
    enabled: !!userId
  });
}

// All Songs (for moderation)
export function useAllSongs(filters?: { status?: 'approved' | 'pending' | 'rejected'; search?: string }) {
  return useQuery({
    queryKey: ['admin-songs', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.search) queryParams.append('search', filters.search);

      const data = await apiFetch(`/admin/songs?${queryParams.toString()}`);
      return data;
    }
  });
}

// Song Detail for moderation
export function useSongDetail(songId: string) {
  return useQuery({
    queryKey: ['admin-song', songId],
    queryFn: async () => {
      const data = await apiFetch(`/admin/songs/${songId}`);
      return data;
    },
    enabled: !!songId
  });
}

// All Transactions
export function useAllTransactions(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['admin-transactions', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

      const data = await apiFetch(`/admin/transactions?${queryParams.toString()}`);
      return data;
    }
  });
}

// All Withdrawals
export function useAllWithdrawals(filters?: { status?: 'pending' | 'approved' | 'processed' | 'rejected' }) {
  return useQuery({
    queryKey: ['admin-withdrawals', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);

      const data = await apiFetch(`/admin/withdrawals?${queryParams.toString()}`);
      return data;
    }
  });
}

// All Disputes
export function useAllDisputes(filters?: { status?: 'open' | 'in_review' | 'resolved' | 'closed' }) {
  return useQuery({
    queryKey: ['admin-disputes', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);

      const data = await apiFetch(`/admin/disputes?${queryParams.toString()}`);
      return data;
    }
  });
}

// Activity Logs
export function useActivityLogs(filters?: { action?: string; entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: ['admin-activity-logs', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.action) queryParams.append('action', filters.action);
      if (filters?.entityType) queryParams.append('entityType', filters.entityType);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const data = await apiFetch(`/admin/activity-logs?${queryParams.toString()}`);
      return data;
    }
  });
}

// Featured Content
export function useFeaturedContent() {
  return useQuery({
    queryKey: ['admin-featured-content'],
    queryFn: async () => {
      const data = await apiFetch('/featured_content');
      return data;
    }
  });
}

// Platform Settings
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const data = await apiFetch('/platform_settings');

      // Convert to key-value object
      return data?.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>) || {};
    }
  });
}

// ========== MUTATIONS ==========

// Approve Song
export function useApproveSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (songId: string) => {
      await apiFetch(`/admin/songs/${songId}/approve`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['new-uploads'] });
      toast({ title: 'Song approved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to approve song', description: error.message, variant: 'destructive' });
    }
  });
}

// Reject Song
export function useRejectSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ songId, reason }: { songId: string; reason: string }) => {
      await apiFetch(`/admin/songs/${songId}/reject`, { 
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Song rejected' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to reject song', description: error.message, variant: 'destructive' });
    }
  });
}

// Update User Status
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, status, reason }: { userId: string; status: string; reason?: string }) => {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason })
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', variables.userId] });
      toast({ title: 'User status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update user', description: error.message, variant: 'destructive' });
    }
  });
}

// Verify User
export function useVerifyUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      await apiFetch(`/admin/users/${userId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verified })
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', variables.userId] });
      toast({ title: variables.verified ? 'User verified' : 'Verification removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update verification', description: error.message, variant: 'destructive' });
    }
  });
}

// Process Withdrawal
export function useProcessWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      withdrawalId, 
      status, 
      notes,
      paymentReference 
    }: { 
      withdrawalId: string; 
      status: 'approved' | 'rejected' | 'processed';
      notes?: string;
      paymentReference?: string;
    }) => {
      const data = await apiFetch(`/admin/withdrawals/${withdrawalId}/process`, {
        method: 'POST',
        body: JSON.stringify({ status, notes, paymentReference })
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Withdrawal processed' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to process withdrawal', description: error.message, variant: 'destructive' });
    }
  });
}

// Resolve Dispute
export function useResolveDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      disputeId, 
      status, 
      resolution 
    }: { 
      disputeId: string; 
      status: 'resolved' | 'closed';
      resolution: string;
    }) => {
      await apiFetch(`/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status, resolution })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Dispute resolved' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to resolve dispute', description: error.message, variant: 'destructive' });
    }
  });
}

// Update Platform Setting
export function useUpdatePlatformSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      await apiFetch('/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ title: 'Setting updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update setting', description: error.message, variant: 'destructive' });
    }
  });
}

// Manage Featured Content
export function useCreateFeaturedContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (content: {
      content_type: string;
      content_id?: string;
      title?: string;
      description?: string;
      image_url?: string;
      link_url?: string;
      display_order?: number;
      is_active?: boolean;
      starts_at?: string;
      ends_at?: string;
    }) => {
      await apiFetch('/admin/featured-content', {
        method: 'POST',
        body: JSON.stringify(content)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content created' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create featured content', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateFeaturedContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      await apiFetch(`/admin/featured-content/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update featured content', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteFeaturedContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/admin/featured-content/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete featured content', description: error.message, variant: 'destructive' });
    }
  });
}

// Release Cleared Funds (configurable hold period)
export function useReleaseFunds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const data = await apiFetch('/admin/release-funds', { method: 'POST' });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      
      const summary = data?.summary;
      if (summary?.total_released > 0) {
        toast({ 
          title: 'Funds Released', 
          description: `₹${summary.total_released} released for ${summary.sellers_affected} sellers (${summary.transactions_cleared} transactions)` 
        });
      } else {
        toast({ title: 'No Funds to Release', description: 'No transactions past the hold period pending clearance.' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Failed to release funds', description: error.message, variant: 'destructive' });
    }
  });
}

// Instant Release Funds for a specific seller
export function useInstantReleaseFunds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sellerId: string) => {
      const data = await apiFetch('/admin/rpc/instant_release_seller_funds', { 
        method: 'POST',
        body: JSON.stringify({ p_seller_id: sellerId })
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      
      const result = data?.[0];
      if (result?.released_amount > 0) {
        toast({ 
          title: 'Funds Instantly Released', 
          description: `₹${result.released_amount} released (${result.transaction_count} transactions)` 
        });
      } else {
        toast({ title: 'No Pending Funds', description: 'This seller has no pending funds to release.' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Failed to release funds', description: error.message, variant: 'destructive' });
    }
  });
}

// Process Payout via Cashfree
export function useProcessPayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      const data = await apiFetch('/admin/process-payout', {
        method: 'POST',
        body: JSON.stringify({ withdrawal_id: withdrawalId })
      });

      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      toast({ 
        title: 'Payout Initiated', 
        description: data?.message || 'Bank transfer has been submitted.' 
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to initiate payout';
      if (message.includes('not configured')) {
        toast({ 
          title: 'Payout Not Available', 
          description: 'Cashfree Payout credentials are not configured. Please add CASHFREE_PAYOUT_CLIENT_ID and CASHFREE_PAYOUT_CLIENT_SECRET secrets.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Payout Failed', description: message, variant: 'destructive' });
      }
    }
  });
}
