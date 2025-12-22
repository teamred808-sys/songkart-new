import { Link } from 'react-router-dom';
import { ShoppingCart, Music, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useCartWithTotals } from '@/hooks/useCheckout';
import { useCartCount } from '@/hooks/useCartCount';

export function MiniCartDropdown() {
  const { data: cartCount = 0 } = useCartCount();
  const { data: cart, isLoading } = useCartWithTotals();

  return (
    <HoverCard openDelay={100} closeDelay={200}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/buyer/cart">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                variant="destructive"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </Badge>
            )}
          </Link>
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
                    <Link 
                      to={`/songs/${item.song_id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      {item.songs?.cover_image_url ? (
                        <img 
                          src={item.songs.cover_image_url} 
                          alt={item.songs?.title || 'Song'}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
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
                      <span className="text-sm font-semibold text-foreground">
                        ₹{item.price?.toLocaleString()}
                      </span>
                    </Link>
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
              <Button asChild className="w-full" size="sm">
                <Link to="/buyer/cart" className="flex items-center justify-center gap-2">
                  View Cart
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
