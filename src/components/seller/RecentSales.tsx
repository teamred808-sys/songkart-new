import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SellerTransaction } from '@/hooks/useSellerData';
import { formatDistanceToNow } from 'date-fns';

interface RecentSalesProps {
  transactions: SellerTransaction[] | undefined;
  isLoading: boolean;
}

export function RecentSales({ transactions, isLoading }: RecentSalesProps) {
  const recentTx = transactions?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-display">Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        {recentTx.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No sales yet. Keep creating!
          </p>
        ) : (
          <div className="space-y-4">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4">
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage 
                    src={tx.song?.cover_image_url || ''} 
                    alt={tx.song?.title}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-md bg-muted">
                    {tx.song?.title?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tx.song?.title || 'Unknown Song'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-success">
                    +${Number(tx.seller_amount).toFixed(2)}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {tx.license_tier?.license_type || 'License'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
