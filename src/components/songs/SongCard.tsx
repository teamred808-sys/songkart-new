import { Link } from "react-router-dom";
import { Music, FileText, Play, Heart, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SongCardProps {
  id: string;
  title: string;
  sellerName: string;
  coverUrl?: string | null;
  genre?: string;
  mood?: string;
  basePrice: number;
  hasAudio?: boolean;
  hasLyrics?: boolean;
  playCount?: number;
  className?: string;
  hasExclusive?: boolean;
}

export function SongCard({
  id,
  title,
  sellerName,
  coverUrl,
  genre,
  mood,
  basePrice,
  hasAudio,
  hasLyrics,
  playCount = 0,
  className,
  hasExclusive,
}: SongCardProps) {
  return (
    <Link to={`/song/${id}`}>
      <Card className={cn(
        "group overflow-hidden bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1",
        className
      )}>
        <div className="relative aspect-square overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Music className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button size="icon" className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90">
              <Play className="h-6 w-6 ml-0.5" />
            </Button>
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
              <p className="text-sm text-muted-foreground truncate">{sellerName}</p>
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
                ₹{basePrice.toLocaleString()}
              </p>
            </div>
            {playCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Play className="h-3 w-3" />
                {playCount.toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
