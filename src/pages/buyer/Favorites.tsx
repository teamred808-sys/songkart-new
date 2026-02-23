import { useState } from 'react';
import { useFavorites, useToggleFavorite, useAddToCart } from '@/hooks/useBuyerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Heart, ShoppingCart, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Price } from '@/components/ui/Price';

export default function Favorites() {
  const { data: favorites, isLoading } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch license tiers for add to cart
  const { data: licenseTiers } = useQuery({
    queryKey: ['all-license-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_tiers')
        .select('*')
        .eq('is_available', true);
      if (error) throw error;
      return data;
    },
  });

  const filteredFavorites = favorites?.filter((f) =>
    f.songs?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveFavorite = (songId: string) => {
    toggleFavorite.mutate(songId);
  };

  const handleAddToCart = (songId: string) => {
    const tier = licenseTiers?.find((t) => t.song_id === songId);
    if (tier) {
      addToCart.mutate({ songId, licenseTierId: tier.id });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Favorites</h1>
        <p className="text-muted-foreground">Songs you've saved for later.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Saved Songs ({favorites?.length || 0})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search favorites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : filteredFavorites && filteredFavorites.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFavorites.map((favorite) => (
                <Card key={favorite.id} className="overflow-hidden group">
                  <div className="aspect-square relative bg-muted">
                    {((favorite.songs as any)?.artwork_cropped_url || favorite.songs?.cover_image_url) ? (
                      <img
                        src={(favorite.songs as any)?.artwork_cropped_url || favorite.songs?.cover_image_url}
                        alt={favorite.songs?.title || ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Music className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => handleAddToCart(favorite.song_id)}
                        disabled={addToCart.isPending}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveFavorite(favorite.song_id)}
                        disabled={toggleFavorite.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {favorite.songs?.has_audio && (
                        <Badge variant="secondary" className="text-xs">Audio</Badge>
                      )}
                      {favorite.songs?.has_lyrics && (
                        <Badge variant="secondary" className="text-xs">Lyrics</Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <Link to={`/song/${favorite.song_id}`} className="hover:underline">
                      <h3 className="font-semibold truncate">{favorite.songs?.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      {(favorite.songs as any)?.profiles?.full_name || 'Unknown Artist'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {favorite.songs?.genres?.name && (
                          <Badge variant="outline" className="text-xs">
                            {(favorite.songs as any).genres.name}
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-primary">
                        <Price amount={Number(favorite.songs?.base_price || 0)} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No favorites yet</p>
              <p className="text-muted-foreground">Start saving songs you love!</p>
              <Button asChild className="mt-4">
                <Link to="/browse">Browse Songs</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
