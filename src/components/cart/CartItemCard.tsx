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
      className={`flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
        isExpired ? 'border-destructive/50 bg-destructive/5' : ''
      } ${item.isOwnSong ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
    >
      <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {item.songs?.cover_image_url ? (
          <img
            src={item.songs.cover_image_url}
            alt={item.songs.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link to={`/song/${item.song_id}`} className="hover:underline">
          <p className="font-medium truncate">{item.songs?.title}</p>
        </Link>
        <p className="text-sm text-muted-foreground">{item.seller_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge 
            variant={item.is_exclusive ? 'default' : 'outline'}
            className={item.is_exclusive ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            {item.license_tiers?.license_type} License
          </Badge>
          
          {item.isOwnSong && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Your Song - Cannot Purchase
            </Badge>
          )}
          
          {item.is_exclusive && timeLeft && !item.isOwnSong && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Reserved: {timeLeft}
            </Badge>
          )}
          
          {isExpired && !item.isOwnSong && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Reservation expired
            </Badge>
          )}
        </div>
      </div>

      <div className="text-right">
        <p className="font-bold text-lg"><Price amount={item.price} /></p>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(item.id, item.song_id, item.is_exclusive)}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}
