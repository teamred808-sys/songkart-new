import { Link } from 'react-router-dom';
import { Sparkles, Clock, BadgeCheck, ChevronRight } from 'lucide-react';
import { useNewUploads, useNewUploadsSectionEnabled } from '@/hooks/useNewUploads';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SellerTierBadge } from '@/components/seller/SellerTierBadge';
import { Price } from '@/components/ui/Price';
import { formatDistanceToNow } from 'date-fns';

export default function NewUploads() {
  const { data: songs, isLoading, error } = useNewUploads(8);
  const { data: sectionEnabled, isLoading: checkingEnabled } = useNewUploadsSectionEnabled();

  // Don't render if section is disabled
  if (checkingEnabled) return null;
  if (!sectionEnabled) return null;

  // Don't render if no songs qualify
  if (!isLoading && (!songs || songs.length === 0)) return null;

  if (error) {
    console.error('Error loading new uploads:', error);
    return null;
  }

  const getTimeAgo = (approvedAt: string) => {
    try {
      return formatDistanceToNow(new Date(approvedAt), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Fresh Uploads</h2>
              <p className="text-muted-foreground text-sm">Just landed on SongKart</p>
            </div>
          </div>
          <Link 
            to="/browse?sort=newest" 
            className="hidden md:flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
            View All New
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Songs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {songs?.map((song) => (
              <Link key={song.id} to={`/song/${song.id}`}>
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 hover:border-primary/30">
                  {/* Cover Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {song.cover_image_url ? (
                      <img
                        src={song.cover_image_url}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Sparkles className="h-12 w-12 text-primary/40" />
                      </div>
                    )}

                    {/* New Badge with Time */}
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-primary text-primary-foreground shadow-lg flex items-center gap-1 text-xs"
                      >
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(song.approved_at)}
                      </Badge>
                    </div>

                    {/* Pinned Badge */}
                    {song.is_pinned && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs">
                          ⭐ Featured
                        </Badge>
                      </div>
                    )}

                    {/* Content Type Badges */}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {song.has_audio && (
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                          🎵 Audio
                        </Badge>
                      )}
                      {song.has_lyrics && (
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                          📝 Lyrics
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Song Info */}
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {song.title}
                    </h3>

                    {/* Seller Info with Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {song.seller_name || 'Unknown Artist'}
                      </span>
                      {song.seller_verified && (
                        <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      )}
                      <SellerTierBadge
                        tierLevel={song.seller_tier_level}
                        tierName={song.seller_tier_name}
                        badgeColor={song.seller_tier_badge_color}
                        size="sm"
                        showTooltip={false}
                      />
                    </div>

                    {/* Genre/Mood */}
                    {(song.genre_name || song.mood_name) && (
                      <div className="flex gap-1 flex-wrap">
                        {song.genre_name && (
                          <Badge variant="outline" className="text-xs py-0">
                            {song.genre_name}
                          </Badge>
                        )}
                        {song.mood_name && (
                          <Badge variant="outline" className="text-xs py-0">
                            {song.mood_name}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="pt-1">
                      <Price 
                        amount={song.base_price} 
                        className="text-base md:text-lg font-bold text-primary" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Mobile View All Link */}
        <div className="mt-6 flex md:hidden justify-center">
          <Link 
            to="/browse?sort=newest" 
            className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
            View All New Uploads
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
