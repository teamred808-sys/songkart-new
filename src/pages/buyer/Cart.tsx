import { useCart, useRemoveFromCart } from '@/hooks/useBuyerData';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Music, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Cart() {
  const { data: cartItems, isLoading } = useCart();
  const removeFromCart = useRemoveFromCart();

  const total = cartItems?.reduce((sum, item) => sum + Number(item.license_tiers?.price || 0), 0) || 0;

  const handleRemove = (itemId: string) => {
    removeFromCart.mutate(itemId);
  };

  const handleCheckout = () => {
    toast.info('Checkout functionality coming soon!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <p className="text-muted-foreground">Review your items before checkout.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Cart Items ({cartItems?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : cartItems && cartItems.length > 0 ? (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
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
                        <p className="text-sm text-muted-foreground">
                          {(item.songs as any)?.profiles?.full_name || 'Unknown Artist'}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {item.license_tiers?.license_type} License
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ${Number(item.license_tiers?.price || 0).toFixed(2)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(item.id)}
                          disabled={removeFromCart.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">Your cart is empty</p>
                  <p className="text-muted-foreground">Add some songs to get started!</p>
                  <Button asChild className="mt-4">
                    <Link to="/browse">Browse Songs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span>$0.00</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                disabled={!cartItems?.length}
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
