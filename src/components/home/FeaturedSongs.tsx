import { Link } from "react-router-dom";
import { useFeaturedSongs } from "@/hooks/useSongs";
import { SongCard } from "@/components/songs/SongCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

const FeaturedSongs = () => {
  const { data: songs, isLoading } = useFeaturedSongs();

  return (
    <section className="py-24 bg-background">
      <div className="container px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Featured</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Top Picks
            </h2>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/browse?featured=true">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : songs && songs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                id={song.id}
                title={song.title}
                sellerName={song.seller?.full_name || "Unknown Artist"}
                coverUrl={song.cover_image_url}
                basePrice={song.base_price}
                genre={song.genre?.name}
                mood={song.mood?.name}
                hasAudio={song.has_audio}
                hasLyrics={song.has_lyrics}
                playCount={song.play_count}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No featured songs available yet.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/browse">Browse All Songs</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedSongs;
