import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, DollarSign, ShoppingCart, Heart, TrendingUp } from 'lucide-react';
import { useBuyerStats } from '@/hooks/useBuyerData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function BuyerStats() {
  const { data: stats, isLoading } = useBuyerStats();

  const statCards = [
    {
      title: 'Total Purchases',
      value: stats?.totalPurchases || 0,
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      trend: stats?.totalPurchases ? '+' + stats.totalPurchases : null,
    },
    {
      title: 'Total Spent',
      value: `₹${(stats?.totalSpent || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      highlight: true,
    },
    {
      title: 'Cart Items',
      value: stats?.cartItems || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      badge: stats?.cartItems && stats.cartItems > 0 ? 'Active' : null,
    },
    {
      title: 'Favorites',
      value: stats?.favorites || 0,
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card 
          key={stat.title} 
          className={cn(
            "relative overflow-hidden transition-all duration-300 hover:shadow-lg group",
            stat.highlight && "border-2",
            stat.borderColor
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                <p className={cn(
                  "text-2xl font-bold font-display",
                  stat.highlight && stat.color
                )}>
                  {stat.value}
                </p>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-xs text-emerald-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>{stat.trend} songs</span>
                  </div>
                )}
                {stat.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                    {stat.badge}
                  </span>
                )}
              </div>
              <div className={cn(
                "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
                stat.bgColor
              )}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
          </CardContent>
          {/* Subtle gradient overlay on hover */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
            `bg-gradient-to-br from-transparent via-transparent to-${stat.color}/5`
          )} />
        </Card>
      ))}
    </div>
  );
}
