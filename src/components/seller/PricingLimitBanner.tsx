import { Alert, AlertDescription } from '@/components/ui/alert';
import { SellerTierBadge } from './SellerTierBadge';
import { useSellerTier } from '@/hooks/useSellerTier';
import { Info, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PricingLimitBannerProps {
  currentPrice?: number;
  className?: string;
}

export function PricingLimitBanner({ currentPrice, className }: PricingLimitBannerProps) {
  const { data: tierInfo, isLoading } = useSellerTier();

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (!tierInfo) {
    return null;
  }

  const maxAllowed = tierInfo.max_price_with_audio;

  const isOverLimit = currentPrice !== undefined && maxAllowed !== null && currentPrice > maxAllowed;
  const isLegend = tierInfo.tier_level === 5;

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'No limit';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (isLegend) {
    return (
      <Alert className={className}>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2 flex-wrap">
          <SellerTierBadge
            tierLevel={tierInfo.tier_level}
            tierName={tierInfo.tier_name}
            badgeColor={tierInfo.badge_color}
            size="sm"
            showTooltip={false}
          />
          <span className="text-emerald-400">
            Legend tier — No price limits! Set any price you want.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert 
      variant={isOverLimit ? 'destructive' : 'default'} 
      className={className}
    >
      {isOverLimit ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      <AlertDescription className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <SellerTierBadge
            tierLevel={tierInfo.tier_level}
            tierName={tierInfo.tier_name}
            badgeColor={tierInfo.badge_color}
            size="sm"
            showTooltip={false}
          />
          <span>
            Max price:{' '}
            <strong>{formatCurrency(maxAllowed)}</strong>
          </span>
        </div>
        
        {isOverLimit && (
          <p className="text-sm">
            Your price of ₹{currentPrice?.toLocaleString('en-IN')} exceeds your tier limit. 
            Please reduce the price or earn more sales to unlock higher pricing.
          </p>
        )}
        
        {!isOverLimit && tierInfo.amount_to_next_tier !== null && (
          <p className="text-xs text-muted-foreground">
            Earn ₹{tierInfo.amount_to_next_tier.toLocaleString('en-IN')} more to unlock higher limits
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
