import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SongCard } from "@/components/songs/SongCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Gift, ArrowRight } from "lucide-react";

const useFreeSongs = () => {
  return useQuery({
    queryKey: ['free-songs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id, title, slug, base_price, cover_image_url, artwork_cropped_url, preview_audio_url,
          has_audio, has_lyrics, play_count, average_rating, total_ratings,
          seller:profiles!songs_seller_id_fkey(full_name),
          genres(name),
          moods(name),
          license_tiers(license_type, price)
        `)
        .eq('status', 'approved')
        .eq('is_free', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      return data;
    },
  });
};

const FreeSongs = () => {
  const { data: songs, isLoading } = useFreeSongs();

  // Don't render the section if no free songs
  if (!isLoading && (!songs || songs.length === 0)) return null;

  return (
    <section className="py-24 bg-background min-h-[500px]">
      <div className="container px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <Gift className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">Free</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Free Downloads
            </h2>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/browse?free=true">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2 md:space-y-4">
                <Skeleton className="aspect-video md:aspect-square rounded-xl" />
                <Skeleton className="h-3 md:h-4 w-3/4" />
                <Skeleton className="h-2.5 md:h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {songs?.map((song) => (
              <SongCard
                key={song.id}
                id={song.id}
                slug={song.slug}
                title={song.title}
                sellerName={(song.seller as any)?.full_name || "Unknown Artist"}
                coverUrl={song.artwork_cropped_url || song.cover_image_url}
                previewUrl={song.preview_audio_url}
                basePrice={song.base_price}
                genre={(song.genres as any)?.name}
                mood={(song.moods as any)?.name}
                hasAudio={song.has_audio ?? false}
                hasLyrics={song.has_lyrics ?? false}
                playCount={song.play_count ?? 0}
                averageRating={song.average_rating}
                totalRatings={song.total_ratings}
                licenseTiers={(song as any).license_tiers}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FreeSongs;
