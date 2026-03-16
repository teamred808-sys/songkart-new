import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface RelatedSongsProps {
  currentSongId: string;
  genreId?: string;
  moodId?: string;
  limit?: number;
}

interface RelatedSong {
  id: string;
  title: string;
  cover_art_url?: string;
  base_price: number;
  genre?: { name: string };
  seller?: { full_name: string };
}

/**
 * Related songs component with crawlable internal links
 * Improves topical authority and user engagement
 */
export function RelatedSongs({ currentSongId, genreId, moodId, limit = 4 }: RelatedSongsProps) {
  const { data: songs, isLoading } = useQuery({
    queryKey: ['related-songs', currentSongId, genreId, moodId],
    queryFn: async (): Promise<RelatedSong[]> => {
      const params = new URLSearchParams({
        status: 'approved',
        limit: limit.toString()
      });
      
      if (genreId) {
        params.append('genre_id', genreId);
      } else if (moodId) {
        params.append('mood_id', moodId);
      }
      
      const data = await apiFetch(`/songs/full?${params.toString()}`);
      
      // Filter out current song and map
      return (data || [])
        .filter((song: any) => song.id !== currentSongId)
        .sort((a: any, b: any) => (b.play_count || 0) - (a.play_count || 0))
        .map((song: any) => ({
          ...song,
          cover_art_url: song.cover_image_url
        })) as unknown as RelatedSong[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Similar Tracks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="aspect-video md:aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!songs || songs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Similar Licensed Tracks
        </CardTitle>
        {genreId && (
          <Link 
            to={`/browse?genre=${genreId}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="w-full max-w-full overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-full">
          {songs.map((song) => (
            <Link
              key={song.id}
              to={`/song/${song.id}`}
              className="group block min-w-0 overflow-hidden"
            >
              <div className="aspect-video md:aspect-square rounded-lg overflow-hidden bg-muted mb-1.5 md:mb-2">
                {song.cover_art_url ? (
                  <img
                    src={song.cover_art_url}
                    alt={`${song.title} cover art`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <h3 className="font-medium text-xs md:text-sm line-clamp-2 md:truncate group-hover:text-primary transition-colors break-words min-w-0">
                {song.title}
              </h3>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate min-w-0">
                {song.seller?.full_name || 'Unknown Artist'}
              </p>
              <p className="text-[10px] md:text-xs font-medium text-primary mt-0.5 md:mt-1">
                From ₹{song.base_price.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
