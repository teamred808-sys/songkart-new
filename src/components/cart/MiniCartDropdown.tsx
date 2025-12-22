import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Music, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useCartWithTotals, useRemoveFromCartWithReservation } from '@/hooks/useCheckout';
import { useCartCount } from '@/hooks/useCartCount';

export function MiniCartDropdown() {
  const { data: cartCount = 0 } = useCartCount();
  const { data: cart, isLoading } = useCartWithTotals();
  const removeFromCart = useRemoveFromCartWithReservation();
  const navigate = useNavigate();

  const handleCartClick = () => {
    navigate('/buyer/cart');
  };

  const handleRemoveItem = (e: React.MouseEvent, itemId: string, songId: string, isExclusive: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromCart.mutate({ cartItemId: itemId, songId, isExclusive });
  };

  return (
    <HoverCard openDelay={100} closeDelay={200}>
      <HoverCardTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={handleCartClick}
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {cartCount > 99 ? '99+' : cartCount}
            </Badge>
          )}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 bg-popover border border-border shadow-xl z-[100]" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Shopping Cart</h4>
            <Badge variant="secondary">{cartCount} {cartCount === 1 ? 'item' : 'items'}</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : !cart?.items?.length ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">Your cart is empty</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-64">
              <div className="p-2">
                {cart.items.slice(0, 4).map((item, index) => (
                  <div key={item.id}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group">
                      <Link 
                        to={`/songs/${item.song_id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {item.songs?.cover_image_url ? (
                          <img 
                            src={item.songs.cover_image_url} 
                            alt={item.songs?.title || 'Song'}
                            className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.songs?.title || 'Unknown Song'}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.license_tiers?.license_type}
                            </Badge>
                            {item.is_exclusive && (
                              <Badge variant="destructive" className="text-xs">
                                Exclusive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                      <span className="text-sm font-semibold text-foreground flex-shrink-0">
                        ₹{item.price?.toLocaleString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => handleRemoveItem(e, item.id, item.song_id, item.is_exclusive || false)}
                        disabled={removeFromCart.isPending}
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    {index < Math.min(cart.items.length, 4) - 1 && (
                      <Separator className="my-1" />
                    )}
                  </div>
                ))}
                {cart.items.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{cart.items.length - 4} more item{cart.items.length - 4 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">₹{cart.subtotal?.toLocaleString()}</span>
              </div>
              <Button 
                className="w-full" 
                size="sm"
                onClick={handleCartClick}
              >
                <span className="flex items-center justify-center gap-2">
                  View Cart
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
