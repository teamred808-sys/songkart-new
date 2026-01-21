import { Link } from "react-router-dom";
import { useSongs } from "@/hooks/useSongs";
import { SongCard } from "@/components/songs/SongCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

const LatestReleases = () => {
  const { data: songs, isLoading } = useSongs();
  const latestSongs = songs?.slice(0, 8);

  return (
    <section className="py-24 bg-muted/30 min-h-[500px]">
      <div className="container px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">New</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Latest Releases
            </h2>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/browse?sort=newest">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2 md:space-y-4">
                <Skeleton className="aspect-video md:aspect-square rounded-xl" />
                <Skeleton className="h-3 md:h-4 w-3/4" />
                <Skeleton className="h-2.5 md:h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : latestSongs && latestSongs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {latestSongs.map((song) => (
              <SongCard
                key={song.id}
                id={song.id}
                title={song.title}
                sellerName={song.seller?.full_name || "Unknown Artist"}
                coverUrl={song.cover_image_url}
                previewUrl={song.preview_audio_url}
                basePrice={song.base_price}
                genre={song.genres?.name}
                mood={song.moods?.name}
                hasAudio={song.has_audio ?? false}
                hasLyrics={song.has_lyrics ?? false}
                playCount={song.play_count ?? 0}
                averageRating={song.average_rating}
                totalRatings={song.total_ratings}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No songs available yet. Be the first to upload!</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/auth?mode=signup&role=seller">Start Selling</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestReleases;
