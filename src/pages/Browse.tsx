import { useState } from "react";
import { Music } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SongCard } from "@/components/songs/SongCard";
import { SongFilters, type SongFiltersState } from "@/components/songs/SongFilters";
import { useSongs, useGenres, useMoods } from "@/hooks/useSongs";
import { Skeleton } from "@/components/ui/skeleton";

const initialFilters: SongFiltersState = {
  search: "",
  genre: "",
  mood: "",
  language: "",
  priceRange: [0, 50000],
  bpmRange: [60, 200],
  hasAudio: false,
  hasLyrics: false,
  sortBy: "newest",
};

export default function Browse() {
  const [filters, setFilters] = useState<SongFiltersState>(initialFilters);
  
  const { data: songs, isLoading: songsLoading } = useSongs(filters);
  const { data: genres = [] } = useGenres();
  const { data: moods = [] } = useMoods();

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Browse <span className="text-gradient">Music</span>
          </h1>
          <p className="text-muted-foreground">
            Discover unique songs and lyrics from talented creators
          </p>
        </div>

        {/* Filters */}
        <SongFilters
          filters={filters}
          onFiltersChange={setFilters}
          genres={genres}
          moods={moods}
        />

        {/* Results */}
        <div className="mt-8">
          {songsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : songs && songs.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {songs.length} song{songs.length !== 1 ? "s" : ""} found
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {songs.map((song) => (
                  <SongCard
                    key={song.id}
                    id={song.id}
                    title={song.title}
                    sellerName={song.seller?.full_name || "Unknown Artist"}
                    coverUrl={song.cover_image_url}
                    genre={song.genres?.name}
                    mood={song.moods?.name}
                    basePrice={song.base_price}
                    hasAudio={song.has_audio || false}
                    hasLyrics={song.has_lyrics || false}
                    playCount={song.play_count || 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Music className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No songs found</h3>
              <p className="text-muted-foreground max-w-md">
                Try adjusting your filters or search terms to find what you're looking for.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
