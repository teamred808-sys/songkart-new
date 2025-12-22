import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Download, Music, Loader2 } from 'lucide-react';
import { useVerifyPayment } from '@/hooks/useCheckout';

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  const { data: paymentData, isLoading, error } = useVerifyPayment(orderId);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-3xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. Your order has been confirmed.
        </p>
      </div>

      {order && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order #{order.order_number}</span>
              <span className="text-lg font-normal text-muted-foreground">
                ₹{Number(order.total_amount).toFixed(2)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your purchased songs are now available in your library.
            </p>

            <div className="flex gap-4">
              <Button asChild className="flex-1">
                <Link to="/buyer/purchases">
                  <Download className="mr-2 h-4 w-4" />
                  View Purchases
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
