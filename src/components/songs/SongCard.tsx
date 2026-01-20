import { memo, useState, useRef, useEffect } from "react";
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

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!hasAudio) return;
    
    // Show the player UI immediately
    setShowPlayer(true);
    setIsStartingPlayback(true);
    
    // Small delay to ensure the ref is available after render
    setTimeout(async () => {
      try {
        await playerRef.current?.play();
      } finally {
        setIsStartingPlayback(false);
      }
    }, 0);
  };

  const handlePlayerEnded = () => {
    setShowPlayer(false);
  };

  // Determine if we should show the overlay
  const shouldShowOverlay = showPlayer || isCurrentlyPlaying;

  return (
    <Link to={songUrl}>
      <Card className={cn(
        "group overflow-hidden bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1",
        className
      )}>
        <div className="relative aspect-square overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Music className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Overlay on hover - show play button if has audio */}
          <div className={cn(
            "absolute inset-0 bg-black/60 transition-opacity duration-300 flex items-center justify-center",
            shouldShowOverlay ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            !shouldShowOverlay && "pointer-events-none group-hover:pointer-events-auto"
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
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
                onClick={handlePlayClick}
                disabled={isStartingPlayback}
              >
                {isStartingPlayback ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>
            ) : (
              <Button 
                size="icon" 
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Content type badges */}
          <div className="absolute top-2 left-2 right-2 flex justify-between">
            <div className="flex gap-1">
              {hasAudio && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs">
                  <Music className="h-3 w-3 mr-1" />
                  Audio
                </Badge>
              )}
              {hasLyrics && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Lyrics
                </Badge>
              )}
            </div>
            {hasExclusive && (
              <Badge className="bg-amber-500/90 backdrop-blur text-xs">
                <Star className="h-3 w-3 mr-1" />
                Exclusive
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {title}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground truncate">{sellerName}</p>
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
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {genre && (
              <Badge variant="outline" className="text-xs">
                {genre}
              </Badge>
            )}
            {mood && (
              <Badge variant="outline" className="text-xs bg-accent/10 border-accent/30 text-accent">
                {mood}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div>
              <span className="text-xs text-muted-foreground">Starting from</span>
              <p className="text-lg font-bold text-primary">
                <Price amount={basePrice} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Rating Badge */}
              <RatingBadge 
                averageRating={averageRating || 0} 
                totalRatings={totalRatings || 0} 
              />
              {playCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Play className="h-3 w-3" />
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
