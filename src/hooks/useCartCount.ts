import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';

export function useCartCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cart-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      try {
        const { count } = await apiFetch('/cart/count');
        return count || 0;
      } catch (error) {
        console.error('Failed to fetch cart count:', error);
        return 0;
      }
    },
    enabled: !!user,
  });
}
