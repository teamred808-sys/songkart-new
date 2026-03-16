import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageLoader } from '@/components/ui/PageLoader';
import { apiFetch } from '@/lib/api';

/**
 * Handles redirects from old UUID-based song URLs to new slug-based URLs
 * /song/:id -> /songs/:slug
 */
export function SongRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: song, isLoading, error } = useQuery({
    queryKey: ['song-redirect', id],
    queryFn: async () => {
      if (!id) return null;
      
      const dataArr = await apiFetch(`/songs?id=${id}`);
      return dataArr?.[0] || null;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (song) {
      // Redirect to slug-based URL if available, otherwise use ID
      const newUrl = song.slug ? `/songs/${song.slug}` : `/songs/${song.id}`;
      navigate(newUrl, { replace: true });
    } else if (error) {
      navigate('/404', { replace: true });
    }
  }, [song, error, navigate]);

  if (isLoading) {
    return <PageLoader />;
  }

  return null;
}
