import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SellerTierBadge } from './SellerTierBadge';
import { useSellerTier } from '@/hooks/useSellerTier';
import { TrendingUp, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface SellerTierCardProps {
  className?: string;
}

export function SellerTierCard({ className }: SellerTierCardProps) {
  const { data: tierInfo, isLoading } = useSellerTier();
  const { formatPrice, currencySymbol } = useCurrency();

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!tierInfo) {
    return null;
  }

  const progressPercentage = tierInfo.next_tier_threshold
    ? Math.min(100, (tierInfo.lifetime_sales / tierInfo.next_tier_threshold) * 100)
    : 100;

  const formatCurrencyLimit = (amount: number | null) => {
    if (amount === null) return 'No limit';
    return formatPrice(amount);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Seller Tier
          </CardTitle>
          {tierInfo.is_frozen && (
            <div className="flex items-center gap-1 text-destructive text-sm">
              <Lock className="h-4 w-4" />
              <span>Frozen</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier Badge */}
        <div className="flex items-center gap-3">
          <SellerTierBadge
            tierLevel={tierInfo.tier_level}
            tierName={tierInfo.tier_name}
            badgeColor={tierInfo.badge_color}
            size="lg"
            showTooltip={false}
          />
          <span className="text-muted-foreground text-sm">Level {tierInfo.tier_level}</span>
        </div>

        {/* Lifetime Sales */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="text-sm font-medium">{currencySymbol}</span>
            <span>Lifetime Sales</span>
          </div>
          <p className="text-2xl font-bold">
            {formatPrice(tierInfo.lifetime_sales)}
          </p>
        </div>

        {/* Progress to Next Tier */}
        {tierInfo.next_tier_threshold && tierInfo.amount_to_next_tier !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to next tier</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {formatPrice(tierInfo.amount_to_next_tier)} more to unlock{' '}
              <span className="text-primary font-medium">
                {tierInfo.tier_level === 1 && 'Rising Artist'}
                {tierInfo.tier_level === 2 && 'Pro Artist'}
                {tierInfo.tier_level === 3 && 'True Artist'}
                {tierInfo.tier_level === 4 && 'Legend'}
              </span>
            </p>
          </div>
        )}

        {tierInfo.tier_level === 5 && (
          <p className="text-sm text-emerald-400 font-medium">
            🎉 You've reached the highest tier with unlimited pricing!
          </p>
        )}

        {/* Pricing Limits */}
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium mb-3">Your Pricing Limits</p>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Max Price</p>
            <p className="font-semibold text-sm">
              {formatCurrencyLimit(tierInfo.max_price_with_audio)}
            </p>
          </div>
        </div>

        {/* Frozen Notice */}
        {tierInfo.is_frozen && tierInfo.frozen_reason && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">Tier Frozen</p>
            <p className="text-xs text-destructive/80 mt-1">{tierInfo.frozen_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
