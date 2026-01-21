import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useNewUploads, useNewUploadsSectionEnabled } from '@/hooks/useNewUploads';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SongCard } from '@/components/songs/SongCard';

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
                <Skeleton className="aspect-video md:aspect-square w-full" />
                <CardContent className="p-3 md:p-4 space-y-1.5 md:space-y-2">
                  <Skeleton className="h-3 md:h-4 w-3/4" />
                  <Skeleton className="h-2.5 md:h-3 w-1/2" />
                  <Skeleton className="h-4 md:h-5 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {songs?.map((song) => (
              <SongCard
                key={song.id}
                id={song.id}
                title={song.title}
                sellerName={song.seller_name || "Unknown Artist"}
                coverUrl={song.cover_image_url}
                previewUrl={song.preview_audio_url}
                basePrice={song.base_price}
                genre={song.genre_name}
                mood={song.mood_name}
                hasAudio={song.has_audio}
                hasLyrics={song.has_lyrics}
                playCount={song.play_count}
              />
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
