import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PendingClearanceItem {
  transaction_id: string;
  amount: number;
  created_at: string;
  clears_at: string;
  days_remaining: number;
}

export function usePendingClearance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-clearance', user?.id],
    queryFn: async (): Promise<PendingClearanceItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .rpc('get_pending_clearance_info', { p_seller_id: user.id });

      if (error) {
        console.error('Error fetching pending clearance:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        transaction_id: item.transaction_id,
        amount: Number(item.amount),
        created_at: item.created_at,
        clears_at: item.clears_at,
        days_remaining: item.days_remaining
      }));
    },
    enabled: !!user?.id
  });
}
