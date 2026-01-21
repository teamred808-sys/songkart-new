import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, CreditCard, AlertTriangle, ShoppingCart, CheckCircle, Lock, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartWithTotals, useRemoveFromCartWithReservation, useCreateCheckoutSession } from '@/hooks/useCheckout';
import { useFreeCheckoutFromCart } from '@/hooks/useFreeCheckout';
import { CartItemCard } from '@/components/cart/CartItemCard';
import { AcknowledgmentCheckbox } from '@/components/cart/AcknowledgmentCheckbox';
import { PriceBreakdown } from '@/components/cart/PriceBreakdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileActionBar } from '@/components/mobile/MobileActionBar';
import { Price } from '@/components/ui/Price';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const steps = [
  { id: 1, label: "Cart", icon: ShoppingCart },
  { id: 2, label: "Review", icon: CheckCircle },
  { id: 3, label: "Payment", icon: CreditCard },
  { id: 4, label: "Done", icon: Lock },
];

export default function Cart() {
  const { data: cart, isLoading } = useCartWithTotals();
  const removeFromCart = useRemoveFromCartWithReservation();
  const createCheckout = useCreateCheckoutSession();
  const freeCheckout = useFreeCheckoutFromCart();
  const isMobile = useIsMobile();
  const [acknowledged, setAcknowledged] = useState(false);
  const [showOwnSongAlert, setShowOwnSongAlert] = useState(false);

  const handleRemove = (cartItemId: string, songId: string, isExclusive: boolean) => {
    removeFromCart.mutate({ cartItemId, songId, isExclusive });
  };

  // Determine if this is a free checkout (total = 0)
  const isFreeCheckout = cart?.total === 0 && (cart?.itemCount || 0) > 0;

  const handleCheckout = () => {
    // Check if user is trying to buy their own song
    if (cart?.hasOwnSongs) {
      setShowOwnSongAlert(true);
      return;
    }
    
    if (isFreeCheckout) {
      freeCheckout.mutate({ acknowledgmentAccepted: acknowledged });
    } else {
      createCheckout.mutate({ acknowledgmentAccepted: acknowledged });
    }
  };

  const isProcessing = createCheckout.isPending || freeCheckout.isPending;

  const currentStep = 1;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              step.id === currentStep
                ? "bg-primary text-primary-foreground"
                : step.id < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}>
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${
                step.id < currentStep ? "bg-primary" : "bg-border"
              }`} />
            )}
          </div>
        ))}
      </div>

      <div>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <p className="text-muted-foreground">Review your items before checkout.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Cart Items ({cart?.itemCount || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : cart?.items && cart.items.length > 0 ? (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      onRemove={handleRemove}
                      isRemoving={removeFromCart.isPending}
                    />
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

          {cart?.hasExclusiveItems && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                <strong>Exclusive License Notice:</strong> Your cart contains exclusive licenses. These songs will be permanently locked after purchase and unavailable to other buyers.
              </AlertDescription>
            </Alert>
          )}

          {cart?.items && cart.items.length > 0 && (
            <AcknowledgmentCheckbox checked={acknowledged} onCheckedChange={setAcknowledged} />
          )}
        </div>

        {/* Desktop Order Summary */}
        <div className="hidden md:block">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Summary
                {isFreeCheckout && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30">
                    FREE
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriceBreakdown
                subtotal={cart?.subtotal || 0}
                platformFee={cart?.buyerPlatformFee || 0}
                total={cart?.total || 0}
                itemCount={cart?.itemCount || 0}
              />
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                className="w-full"
                size="lg"
                disabled={!cart?.itemCount || !acknowledged || isProcessing}
                onClick={handleCheckout}
              >
                {isFreeCheckout ? (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Claim Free License'}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {isFreeCheckout 
                  ? '🎁 This license is free! No payment required.'
                  : '🔒 Secure checkout powered by Cashfree'
                }
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      {isMobile && cart?.items && cart.items.length > 0 && (
        <MobileActionBar>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{cart?.itemCount} item{(cart?.itemCount || 0) > 1 ? 's' : ''}</p>
                <p className="text-lg font-bold">
                  {isFreeCheckout ? (
                    <span className="text-green-500">FREE</span>
                  ) : (
                    <Price amount={cart?.total || 0} />
                  )}
                </p>
              </div>
              <Button
                size="lg"
                disabled={!cart?.itemCount || !acknowledged || isProcessing}
                onClick={handleCheckout}
                className="min-w-[160px]"
              >
                {isFreeCheckout ? (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Claim Free'}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Checkout'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </MobileActionBar>
      )}
      {/* Own Song Alert Dialog */}
      <AlertDialog open={showOwnSongAlert} onOpenChange={setShowOwnSongAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cannot Purchase Own Song
            </AlertDialogTitle>
            <AlertDialogDescription>
              You cannot buy your own song. Please remove your song(s) from the cart to proceed with checkout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
