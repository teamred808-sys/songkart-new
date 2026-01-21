import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Music, Loader2, FileText, Sparkles } from 'lucide-react';
import { useVerifyPayment } from '@/hooks/useCheckout';
import { Price } from '@/components/ui/Price';

const confettiColors = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];

function ConfettiPiece({ delay, left }: { delay: number; left: number }) {
  const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        animationDelay: `${delay}s`,
        top: '-10px',
      }}
    />
  );
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: paymentData, isLoading, error } = useVerifyPayment(orderId);

  useEffect(() => {
    if (paymentData?.is_paid) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentData?.is_paid]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Verifying your payment...</p>
      </div>
    );
  }

  if (error || !paymentData?.is_paid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <XCircle className="h-16 w-16 text-destructive" />
        <div className="text-center">
          <h1 className="text-2xl font-bold">Payment Failed</h1>
          <p className="text-muted-foreground mt-2">
            {error?.message || 'Your payment could not be completed. Please try again.'}
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link to="/buyer/cart">Return to Cart</Link>
          </Button>
          <Button asChild>
            <Link to="/browse">Browse Songs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const order = paymentData.order;
  
  // Calculate buyer's platform fee from order data
  // If total_amount > subtotal, the difference is the buyer's platform fee
  const buyerPlatformFee = order ? Math.max(0, Number(order.total_amount) - Number(order.subtotal)) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiPiece key={i} delay={Math.random() * 2} left={Math.random() * 100} />
          ))}
        </div>
      )}

      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto animate-scale-in" />
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-amber-400 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. Your licenses are ready.
        </p>
      </div>

      {/* What happens next */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">✓</div>
            <span className="text-sm">License generated and stored in your vault</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">✓</div>
            <span className="text-sm">Audio files ready for download</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">✓</div>
            <span className="text-sm">Seller notified of your purchase</span>
          </div>
        </CardContent>
      </Card>

      {order && (
        <Card>
          <CardHeader>
            <CardTitle>Order #{order.order_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Song Price</span>
                <span><Price amount={Number(order.subtotal)} /></span>
              </div>
              {buyerPlatformFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Service Fee</span>
                  <span><Price amount={buyerPlatformFee} /></span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total Paid</span>
                <span className="text-primary"><Price amount={Number(order.total_amount)} /></span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-4">
              <Button asChild className="flex-1">
                <Link to="/buyer/downloads">
                  <FileText className="mr-2 h-4 w-4" />
                  Go to License Vault
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/browse">
                  <Music className="mr-2 h-4 w-4" />
                  Browse More
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
