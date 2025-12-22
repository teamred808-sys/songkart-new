import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SellerSong } from '@/hooks/useSellerData';
import { Eye, Play, TrendingUp, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

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
              <Skeleton className="h-12 w-12 rounded-lg" />
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Performing Songs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topSongs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Music className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No approved songs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your top performing songs will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topSongs.map((song, index) => {
              const totalEngagement = (song.play_count || 0) + (song.view_count || 0);
              const isTopPerformer = index === 0;
              
              return (
                <div 
                  key={song.id} 
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl transition-colors",
                    isTopPerformer 
                      ? "bg-gradient-to-r from-primary/10 to-transparent border border-primary/20" 
                      : "hover:bg-muted/50"
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    index === 0 && "bg-amber-500 text-amber-950",
                    index === 1 && "bg-gray-300 text-gray-700",
                    index === 2 && "bg-amber-700 text-amber-100",
                    index > 2 && "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>

                  {/* Song Image */}
                  <Avatar className="h-12 w-12 rounded-lg flex-shrink-0">
                    <AvatarImage 
                      src={song.cover_image_url || ''} 
                      alt={song.title}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-lg bg-muted text-lg">
                      {song.title.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> 
                        <span className="font-medium">{song.view_count || 0}</span> views
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="h-3.5 w-3.5" /> 
                        <span className="font-medium">{song.play_count || 0}</span> plays
                      </span>
                    </div>
                  </div>

                  {/* Genre Badge */}
                  <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                    {song.genre?.name || 'Uncategorized'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
