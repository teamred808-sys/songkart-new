import { Music, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/ui/Price';
import { useEffect, useState } from 'react';

interface CartItemCardProps {
  item: {
    id: string;
    song_id: string;
    songs: {
      id: string;
      title: string;
      cover_image_url: string | null;
      seller_id: string;
    } | null;
    license_tiers: {
      id: string;
      license_type: string;
      price: number;
    } | null;
    is_exclusive: boolean;
    seller_name: string;
    price: number;
    reservation?: {
      expires_at: string;
    };
    isOwnSong?: boolean;
  };
  onRemove: (cartItemId: string, songId: string, isExclusive: boolean) => void;
  isRemoving: boolean;
}

export function CartItemCard({ item, onRemove, isRemoving }: CartItemCardProps) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!item.reservation?.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(item.reservation!.expires_at).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [item.reservation?.expires_at]);

  return (
    <div
      className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors max-w-full overflow-hidden ${
        isExpired ? 'border-destructive/50 bg-destructive/5' : ''
      } ${item.isOwnSong ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
    >
      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {item.songs?.cover_image_url ? (
          <img
            src={item.songs.cover_image_url}
            alt={item.songs.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <Link to={`/song/${item.song_id}`} className="hover:underline block">
          <p className="font-medium truncate max-w-full">{item.songs?.title}</p>
        </Link>
        <p className="text-sm text-muted-foreground truncate">{item.seller_name}</p>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap max-w-full">
          <Badge 
            variant={item.is_exclusive ? 'default' : 'outline'}
            className={`text-xs whitespace-nowrap ${item.is_exclusive ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          >
            {item.license_tiers?.license_type}
          </Badge>
          
          {item.isOwnSong && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Your Song - Cannot Purchase</span>
              <span className="sm:hidden">Own Song</span>
            </Badge>
          )}
          
          {item.is_exclusive && timeLeft && !item.isOwnSong && (
            <Badge variant="secondary" className="gap-1 text-xs whitespace-nowrap">
              <Clock className="h-3 w-3 flex-shrink-0" />
              {timeLeft}
            </Badge>
          )}
          
          {isExpired && !item.isOwnSong && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Reservation expired</span>
              <span className="sm:hidden">Expired</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-bold text-base sm:text-lg"><Price amount={item.price} /></p>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-8 px-2 sm:px-3"
          onClick={() => onRemove(item.id, item.song_id, item.is_exclusive)}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Remove</span>
        </Button>
      </div>
    </div>
  );
}
