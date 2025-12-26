import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('songs').select('id', { count: 'exact', head: true }),
        supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('amount, commission_amount', { count: 'exact' }).eq('payment_status', 'completed'),
        supabase.from('withdrawal_requests').select('id, amount', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('disputes').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review'])
      ]);

      const totalRevenue = transactionsResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const commissionEarnings = transactionsResult.data?.reduce((sum, t) => sum + Number(t.commission_amount), 0) || 0;
      const pendingWithdrawalAmount = withdrawalsResult.data?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

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
      // First get all profiles
      let profileQuery = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        profileQuery = profileQuery.eq('account_status', filters.status);
      }

      if (filters?.search) {
        profileQuery = profileQuery.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data: profiles, error: profilesError } = await profileQuery;
      if (profilesError) throw profilesError;
      
      if (!profiles || profiles.length === 0) return [];

      // Fetch user roles separately
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        user_roles: roles?.filter(r => r.user_id === profile.id) || []
      }));

      // Filter by role if specified
      if (filters?.role) {
        return usersWithRoles.filter(user => 
          user.user_roles.some(r => r.role === filters.role)
        );
      }

      return usersWithRoles;
    }
  });
}

// User Detail
export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const [profileResult, rolesResult, walletResult, songsResult, transactionsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('seller_wallets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('songs').select('id, status', { count: 'exact' }).eq('seller_id', userId),
        supabase.from('transactions').select('amount, commission_amount').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      ]);

      if (profileResult.error) throw profileResult.error;

      return {
        profile: profileResult.data,
        roles: rolesResult.data?.map(r => r.role) || [],
        wallet: walletResult.data,
        songStats: {
          total: songsResult.count || 0,
          approved: songsResult.data?.filter(s => s.status === 'approved').length || 0,
          pending: songsResult.data?.filter(s => s.status === 'pending').length || 0,
          rejected: songsResult.data?.filter(s => s.status === 'rejected').length || 0
        },
        totalSpent: transactionsResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
      };
    },
    enabled: !!userId
  });
}

// All Songs (for moderation)
export function useAllSongs(filters?: { status?: 'approved' | 'pending' | 'rejected'; search?: string }) {
  return useQuery({
    queryKey: ['admin-songs', filters],
    queryFn: async () => {
      let query = supabase
        .from('songs')
        .select(`
          *,
          profiles:seller_id(full_name, email, avatar_url),
          genres:genre_id(name),
          moods:mood_id(name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// Song Detail for moderation
export function useSongDetail(songId: string) {
  return useQuery({
    queryKey: ['admin-song', songId],
    queryFn: async () => {
      const [songResult, licensesResult] = await Promise.all([
        supabase
          .from('songs')
          .select(`
            *,
            profiles:seller_id(id, full_name, email, avatar_url, is_verified),
            genres:genre_id(name),
            moods:mood_id(name)
          `)
          .eq('id', songId)
          .single(),
        supabase.from('license_tiers').select('*').eq('song_id', songId)
      ]);

      if (songResult.error) throw songResult.error;

      return {
        ...songResult.data,
        license_tiers: licensesResult.data || []
      };
    },
    enabled: !!songId
  });
}

// All Transactions
export function useAllTransactions(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['admin-transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          buyer:profiles!transactions_buyer_id_profiles_fkey(full_name, email),
          seller:profiles!transactions_seller_id_profiles_fkey(full_name, email),
          songs:song_id(title, cover_image_url),
          license_tiers:license_tier_id(license_type, price)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('payment_status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// All Withdrawals
export function useAllWithdrawals(filters?: { status?: 'pending' | 'approved' | 'processed' | 'rejected' }) {
  return useQuery({
    queryKey: ['admin-withdrawals', filters],
    queryFn: async () => {
      let query = supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles:profiles!withdrawal_requests_user_id_profiles_fkey(full_name, email, kyc_status, is_verified)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// All Disputes
export function useAllDisputes(filters?: { status?: 'open' | 'in_review' | 'resolved' | 'closed' }) {
  return useQuery({
    queryKey: ['admin-disputes', filters],
    queryFn: async () => {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          raised_by_profile:profiles!disputes_raised_by_profiles_fkey(full_name, email),
          against_profile:profiles!disputes_against_profiles_fkey(full_name, email),
          transactions:transaction_id(amount, song_id)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// Activity Logs
export function useActivityLogs(filters?: { action?: string; entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: ['admin-activity-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:profiles!activity_logs_user_id_profiles_fkey(full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// Featured Content
export function useFeaturedContent() {
  return useQuery({
    queryKey: ['admin-featured-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_content')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    }
  });
}

// Platform Settings
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;

      // Convert to key-value object
      return data?.reduce((acc, setting) => {
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
      const { error } = await supabase
        .from('songs')
        .update({ 
          status: 'approved', 
          rejection_reason: null,
          approved_at: new Date().toISOString()
        })
        .eq('id', songId);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'approve_song',
        entity_type: 'song',
        entity_id: songId,
        metadata: { status: 'approved' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['new-uploads'] });
      toast({ title: 'Song approved successfully' });
    },
    onError: (error) => {
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
      const { error } = await supabase
        .from('songs')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', songId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: 'reject_song',
        entity_type: 'song',
        entity_id: songId,
        metadata: { reason }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-songs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Song rejected' });
    },
    onError: (error) => {
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
      const updateData: any = { 
        account_status: status,
        suspension_reason: reason || null,
        suspended_at: status === 'suspended' || status === 'banned' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: `user_${status}`,
        entity_type: 'user',
        entity_id: userId,
        metadata: { status, reason }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', variables.userId] });
      toast({ title: 'User status updated' });
    },
    onError: (error) => {
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
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verified, kyc_status: verified ? 'verified' : 'pending' })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: verified ? 'verify_user' : 'unverify_user',
        entity_type: 'user',
        entity_id: userId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', variables.userId] });
      toast({ title: variables.verified ? 'User verified' : 'Verification removed' });
    },
    onError: (error) => {
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
      const updateData: any = { 
        status,
        notes,
        processed_at: status === 'processed' ? new Date().toISOString() : null,
        payout_details: paymentReference ? { reference: paymentReference } : null
      };

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', withdrawalId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: `withdrawal_${status}`,
        entity_type: 'withdrawal',
        entity_id: withdrawalId,
        metadata: { status, notes, paymentReference }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Withdrawal processed' });
    },
    onError: (error) => {
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
      const { error } = await supabase
        .from('disputes')
        .update({ 
          status, 
          resolution,
          resolved_at: new Date().toISOString()
        })
        .eq('id', disputeId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: 'resolve_dispute',
        entity_type: 'dispute',
        entity_id: disputeId,
        metadata: { status, resolution }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast({ title: 'Dispute resolved' });
    },
    onError: (error) => {
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
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        action: 'update_setting',
        entity_type: 'setting',
        metadata: { key, value }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ title: 'Setting updated' });
    },
    onError: (error) => {
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
      const { error } = await supabase
        .from('featured_content')
        .insert(content);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create featured content', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateFeaturedContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('featured_content')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update featured content', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteFeaturedContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('featured_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete featured content', description: error.message, variant: 'destructive' });
    }
  });
}
