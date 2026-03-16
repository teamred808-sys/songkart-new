import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiFetch } from '@/lib/api';

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

      const data = await apiFetch('/rpc/get_pending_clearance_info', { 
        method: 'POST',
        body: JSON.stringify({ p_seller_id: user.id })
      }).catch((error) => {
        console.error('Error fetching pending clearance:', error);
        return [];
      });

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
