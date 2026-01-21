import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Music, FileText, Play, Heart, Star, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SellerTierBadge } from "@/components/seller/SellerTierBadge";
import { Price } from "@/components/ui/Price";
import { RatingBadge } from "@/components/songs/RatingDisplay";
import { MiniAudioPlayer, MiniAudioPlayerHandle } from "@/components/audio/MiniAudioPlayer";
import { useAudioPlayerOptional } from "@/contexts/AudioPlayerContext";

interface SongCardProps {
  id: string;
  slug?: string | null;
  title: string;
  sellerName: string;
  coverUrl?: string | null;
  previewUrl?: string | null;
  genre?: string;
  mood?: string;
  basePrice: number;
  hasAudio?: boolean;
  hasLyrics?: boolean;
  playCount?: number;
  className?: string;
  hasExclusive?: boolean;
  averageRating?: number | null;
  totalRatings?: number | null;
  sellerTier?: {
    level: number;
    name: string;
    color: string;
  };
}

export const SongCard = memo(function SongCard({
  id,
  slug,
  title,
  sellerName,
  coverUrl,
  previewUrl,
  genre,
  mood,
  basePrice,
  hasAudio,
  hasLyrics,
  playCount = 0,
  className,
  hasExclusive,
  averageRating,
  totalRatings,
  sellerTier,
}: SongCardProps) {
  // Use slug-based URL if available
  const songUrl = slug ? `/songs/${slug}` : `/song/${id}`;
  const [showPlayer, setShowPlayer] = useState(false);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const playerRef = useRef<MiniAudioPlayerHandle>(null);
  const audioContext = useAudioPlayerOptional();
  const isCurrentlyPlaying = audioContext?.isPlaying(id) ?? false;

  // Auto-hide player UI when another song starts playing
  useEffect(() => {
    if (!isCurrentlyPlaying && showPlayer && !isStartingPlayback) {
      setShowPlayer(false);
    }
  }, [isCurrentlyPlaying, showPlayer, isStartingPlayback]);

  // Optimized click handler for INP - defers heavy work
  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!hasAudio) return;
    
    // Show visual feedback immediately
    setShowPlayer(true);
    setIsStartingPlayback(true);
    
    // Defer actual playback to avoid blocking interaction
    requestAnimationFrame(() => {
      setTimeout(async () => {
        try {
          await playerRef.current?.play();
        } finally {
          setIsStartingPlayback(false);
        }
      }, 0);
    });
  }, [hasAudio]);

  const handlePlayerEnded = useCallback(() => {
    setShowPlayer(false);
  }, []);

  // Determine if we should show the overlay
  const shouldShowOverlay = showPlayer || isCurrentlyPlaying;

  return (
    <Link to={songUrl}>
      <Card className={cn(
        "group overflow-hidden bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1",
        // Disable backdrop-blur on mobile for performance (handled via CSS)
        "md:backdrop-blur",
        className
      )}>
        {/* Mobile: 16:9 landscape, Desktop: square - fixed dimensions for CLS */}
        <div className="relative aspect-video md:aspect-square overflow-hidden bg-muted">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              width={300}
              height={300}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Overlay - always visible on mobile, hover on desktop */}
          <div className={cn(
            "absolute inset-0 bg-black/40 md:bg-black/60 transition-opacity duration-300 flex items-center justify-center",
            shouldShowOverlay 
              ? "opacity-100" 
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100",
            !shouldShowOverlay && "md:pointer-events-none md:group-hover:pointer-events-auto"
          )}>
          {showPlayer ? (
            <div onClick={(e) => e.stopPropagation()}>
              <MiniAudioPlayer 
                ref={playerRef}
                songId={id}
                previewUrl={previewUrl}
                onEnded={handlePlayerEnded}
                className="px-3"
              />
            </div>
            ) : hasAudio ? (
              <Button 
                size="icon" 
                className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary hover:bg-primary/90"
                onClick={handlePlayClick}
                disabled={isStartingPlayback}
              >
                {isStartingPlayback ? (
                  <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 md:h-6 md:w-6 ml-0.5" />
                )}
              </Button>
            ) : (
              <Button 
                size="icon" 
                className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary hover:bg-primary/90"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            )}
          </div>

          {/* Content type badges - compact on mobile */}
          <div className="absolute top-1.5 md:top-2 left-1.5 md:left-2 right-1.5 md:right-2 flex justify-between">
            <div className="flex gap-0.5 md:gap-1">
              {hasAudio && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-[10px] md:text-xs px-1.5 md:px-2 py-0.5">
                  <Music className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                  <span className="hidden sm:inline">Audio</span>
                </Badge>
              )}
              {hasLyrics && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-[10px] md:text-xs px-1.5 md:px-2 py-0.5">
                  <FileText className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                  <span className="hidden sm:inline">Lyrics</span>
                </Badge>
              )}
            </div>
            {hasExclusive && (
              <Badge className="bg-amber-500/90 backdrop-blur text-[10px] md:text-xs px-1.5 md:px-2 py-0.5">
                <Star className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                <span className="hidden sm:inline">Exclusive</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Mobile: reduced padding, Desktop: normal */}
        <CardContent className="p-3 md:p-4 space-y-1.5 md:space-y-2">
          <div className="flex items-start justify-between gap-1.5 md:gap-2">
            <div className="min-w-0 flex-1">
              {/* Mobile: 2 lines max, Desktop: single line truncate */}
              <h3 className="font-semibold text-sm md:text-base text-foreground line-clamp-2 md:truncate group-hover:text-primary transition-colors">
                {title}
              </h3>
              <div className="flex items-center gap-1.5 md:gap-2">
                <p className="text-xs md:text-sm text-muted-foreground truncate">{sellerName}</p>
                {sellerTier && (
                  <SellerTierBadge
                    tierLevel={sellerTier.level}
                    tierName={sellerTier.name}
                    badgeColor={sellerTier.color}
                    size="sm"
                  />
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 md:h-11 md:w-11 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity" 
              onClick={(e) => e.preventDefault()}
            >
              <Heart className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>

          {/* Badges - compact on mobile */}
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {genre && (
              <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0">
                {genre}
              </Badge>
            )}
            {mood && (
              <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0 bg-accent/10 border-accent/30 text-accent">
                {mood}
              </Badge>
            )}
          </div>

          {/* Price section - compact on mobile */}
          <div className="flex items-center justify-between pt-1.5 md:pt-2 border-t border-border/50">
            <div>
              <span className="text-[10px] md:text-xs text-muted-foreground">Starting from</span>
              <p className="text-base md:text-lg font-bold text-primary">
                <Price amount={basePrice} />
              </p>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Rating Badge */}
              <RatingBadge 
                averageRating={averageRating || 0} 
                totalRatings={totalRatings || 0} 
              />
              {playCount > 0 && (
                <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-0.5 md:gap-1">
                  <Play className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  {playCount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
