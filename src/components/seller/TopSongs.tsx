import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SellerSong } from '@/hooks/useSellerData';
import { Eye, Play } from 'lucide-react';

interface TopSongsProps {
  songs: SellerSong[] | undefined;
  isLoading: boolean;
}

export function TopSongs({ songs, isLoading }: TopSongsProps) {
  // Sort by play count + view count
  const topSongs = [...(songs || [])]
    .filter(s => s.status === 'approved')
    .sort((a, b) => ((b.play_count || 0) + (b.view_count || 0)) - ((a.play_count || 0) + (a.view_count || 0)))
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-display">Top Performing</CardTitle>
      </CardHeader>
      <CardContent>
        {topSongs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No approved songs yet.
          </p>
        ) : (
          <div className="space-y-4">
            {topSongs.map((song, index) => (
              <div key={song.id} className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-10 w-10 rounded-md">
                    <AvatarImage 
                      src={song.cover_image_url || ''} 
                      alt={song.title}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-md bg-muted">
                      {song.title.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {song.view_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" /> {song.play_count || 0}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {song.genre?.name || 'Uncategorized'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
