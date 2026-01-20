import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/PageLoader';

/**
 * Handles redirects from old UUID-based seller URLs to new username-based URLs
 * /seller/:id -> /sellers/:username
 */
export function SellerRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['seller-redirect', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (profile) {
      // Redirect to username-based URL if available, otherwise use ID
      const newUrl = profile.username ? `/sellers/${profile.username}` : `/sellers/${profile.id}`;
      navigate(newUrl, { replace: true });
    } else if (error) {
      navigate('/404', { replace: true });
    }
  }, [profile, error, navigate]);

  if (isLoading) {
    return <PageLoader />;
  }

  return null;
}
