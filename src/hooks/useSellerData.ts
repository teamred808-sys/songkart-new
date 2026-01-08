import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// Types
export interface SellerSong {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  preview_audio_url: string | null;
  full_lyrics: string | null;
  preview_lyrics: string | null;
  base_price: number;
  bpm: number | null;
  duration: number | null;
  language: string | null;
  status: 'pending' | 'approved' | 'rejected';
  has_audio: boolean | null;
  has_lyrics: boolean | null;
  is_featured: boolean | null;
  play_count: number | null;
  view_count: number | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  genre_id: string | null;
  mood_id: string | null;
  seller_id: string | null;
  genre?: { id: string; name: string } | null;
  mood?: { id: string; name: string } | null;
  license_tiers?: LicenseTier[];
}

export interface LicenseTier {
  id: string;
  song_id: string;
  license_type: 'personal' | 'commercial' | 'exclusive';
  price: number;
  description: string | null;
  terms: string | null;
  max_sales: number | null;
  current_sales: number | null;
  is_available: boolean | null;
}

export interface SellerTransaction {
  id: string;
  amount: number;
  seller_amount: number;
  commission_amount: number;
  commission_rate: number;
  payment_status: string | null;
  payment_method: string | null;
  license_pdf_url: string | null;
  created_at: string;
  song: { id: string; title: string; cover_image_url: string | null } | null;
  license_tier: { license_type: string; price: number } | null;
}

export interface SellerWallet {
  id: string;
  user_id: string;
  available_balance: number | null;
  pending_balance: number | null;
  total_earnings: number | null;
  withdrawal_threshold: number | null;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'processed' | 'rejected' | null;
  payout_method: string | null;
  payout_details: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

// Hooks
export function useSellerSongs() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['seller-songs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('songs')
        .select(`
          *,
          genre:genres(id, name),
          mood:moods(id, name),
          license_tiers(*)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SellerSong[];
    },
    enabled: !!user?.id,
  });
}

export function useSellerStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['seller-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get songs count
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('id, status')
        .eq('seller_id', user.id);
      
      if (songsError) throw songsError;
      
      // Get transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('seller_amount, created_at')
        .eq('seller_id', user.id)
        .eq('payment_status', 'completed');
      
      if (txError) throw txError;
      
      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('seller_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (walletError && walletError.code !== 'PGRST116') throw walletError;
      
      // Get pending withdrawals
      const { data: withdrawals, error: wdError } = await supabase
        .from('withdrawal_requests')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      
      if (wdError) throw wdError;
      
      const totalUploads = songs?.length || 0;
      const approvedSongs = songs?.filter(s => s.status === 'approved').length || 0;
      const totalSales = transactions?.length || 0;
      const totalEarnings = transactions?.reduce((sum, t) => sum + Number(t.seller_amount), 0) || 0;
      const availableBalance = wallet?.available_balance || 0;
      const pendingWithdrawals = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      
      return {
        totalUploads,
        approvedSongs,
        totalSales,
        totalEarnings,
        availableBalance,
        pendingWithdrawals,
        monthlyEarnings: calculateMonthlyEarnings(transactions || []),
      };
    },
    enabled: !!user?.id,
  });
}

function calculateMonthlyEarnings(transactions: { seller_amount: number; created_at: string }[]) {
  const months: Record<string, number> = {};
  const now = new Date();
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    months[key] = 0;
  }
  
  // Sum transactions by month
  transactions.forEach(tx => {
    const key = tx.created_at.slice(0, 7);
    if (key in months) {
      months[key] += Number(tx.seller_amount);
    }
  });
  
  return Object.entries(months).map(([month, amount]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    amount,
  }));
}

export function useSellerTransactions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['seller-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          song:songs(id, title, cover_image_url),
          license_tier:license_tiers(license_type, price)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SellerTransaction[];
    },
    enabled: !!user?.id,
  });
}

export function useSellerWallet() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['seller-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('seller_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as SellerWallet | null;
    },
    enabled: !!user?.id,
  });
}

export function useWithdrawalRequests() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['withdrawal-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useRequestWithdrawal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      amount: number; 
      payout_method: string; 
      payout_details: Record<string, any>;
      minThreshold?: number;
      maxBalance?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Client-side pre-validation
      if (data.amount <= 0) {
        throw new Error('Invalid withdrawal amount');
      }
      
      if (data.minThreshold !== undefined && data.amount < data.minThreshold) {
        throw new Error(`Minimum withdrawal is ₹${data.minThreshold}`);
      }
      
      if (data.maxBalance !== undefined && data.amount > data.maxBalance) {
        throw new Error('Amount exceeds available balance');
      }
      
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: data.amount,
          payout_method: data.payout_method,
          payout_details: data.payout_details,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['seller-wallet'] });
      toast({ title: 'Withdrawal requested', description: 'Your request is being processed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (songId: string) => {
      const { data, error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId)
        .select('id');

      if (error) throw error;
      
      // If no rows returned, the delete was blocked by RLS
      if (!data || data.length === 0) {
        // Check if song has sales
        const { data: salesData } = await supabase
          .from('order_items')
          .select('id')
          .eq('song_id', songId)
          .limit(1);
        
        if (salesData && salesData.length > 0) {
          throw new Error('Cannot delete this song because it has existing sales.');
        }
        throw new Error('Unable to delete this song. Only pending, rejected, or approved songs with no sales can be deleted.');
      }

      return songId;
    },
    onMutate: async (songId: string) => {
      await queryClient.cancelQueries({ queryKey: ['seller-songs'], exact: false });

      const previous = queryClient.getQueriesData<SellerSong[]>({
        queryKey: ['seller-songs'],
        exact: false,
      });

      queryClient.setQueriesData<SellerSong[]>(
        { queryKey: ['seller-songs'], exact: false },
        (old) => (old ? old.filter((s) => s.id !== songId) : old)
      );

      return { previous };
    },
    onError: (error: any, _songId, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['seller-songs'],
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['seller-stats'],
        exact: false,
        refetchType: 'active',
      });
      toast({ title: 'Song deleted', description: 'Your song has been removed.' });
    },
  });
}

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useMoods() {
  return useQuery({
    queryKey: ['moods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moods')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSellerDynamicPricing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ dynamic_pricing_enabled: enabled })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-stats'] });
    },
  });
}

// License Tier Management
export function useAddLicenseTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      song_id: string; 
      license_type: 'personal' | 'commercial' | 'exclusive'; 
      price: number; 
      terms?: string;
      max_sales?: number;
    }) => {
      const { error } = await supabase
        .from('license_tiers')
        .insert({
          song_id: data.song_id,
          license_type: data.license_type,
          price: data.price,
          terms: data.terms || null,
          max_sales: data.max_sales || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-songs'] });
      queryClient.invalidateQueries({ queryKey: ['license-tiers'] });
      toast({ title: 'License added', description: 'New license tier has been added.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLicenseTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      tier_id: string; 
      price?: number; 
      terms?: string;
      is_available?: boolean;
    }) => {
      const updateData: Record<string, any> = {};
      if (data.price !== undefined) updateData.price = data.price;
      if (data.terms !== undefined) updateData.terms = data.terms;
      if (data.is_available !== undefined) updateData.is_available = data.is_available;
      
      const { error } = await supabase
        .from('license_tiers')
        .update(updateData)
        .eq('id', data.tier_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-songs'] });
      toast({ title: 'License updated', description: 'License tier has been updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveLicenseTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tierId: string) => {
      // First check if there are any sales
      const { data: tier, error: fetchError } = await supabase
        .from('license_tiers')
        .select('current_sales')
        .eq('id', tierId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (tier?.current_sales && tier.current_sales > 0) {
        throw new Error('Cannot remove license tier with existing sales');
      }
      
      const { error } = await supabase
        .from('license_tiers')
        .delete()
        .eq('id', tierId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-songs'] });
      toast({ title: 'License removed', description: 'License tier has been removed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch license tiers for a specific song
export function useSongLicenseTiers(songId: string) {
  return useQuery({
    queryKey: ['license-tiers', songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_tiers')
        .select('*')
        .eq('song_id', songId)
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data as LicenseTier[];
    },
    enabled: !!songId,
  });
}
