import { useCurrencyOptional } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceProps {
  amount: number;
  className?: string;
  showLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Price({ amount, className, showLoading = false, size = 'md' }: PriceProps) {
  const currency = useCurrencyOptional();

  // Fallback to INR if no currency context
  if (!currency) {
    return (
      <span className={className}>
        ₹{amount.toLocaleString('en-IN', {
          minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
          maximumFractionDigits: 2,
        })}
      </span>
    );
  }

  if (showLoading && currency.isLoading) {
    const widthClass = size === 'sm' ? 'w-12' : size === 'lg' ? 'w-20' : 'w-16';
    return <Skeleton className={cn('h-4 inline-block', widthClass, className)} />;
  }

  return <span className={className}>{currency.formatPrice(amount)}</span>;
}

// Utility component for displaying "From" prices
interface PriceFromProps {
  amount: number;
  className?: string;
}

export function PriceFrom({ amount, className }: PriceFromProps) {
  return (
    <span className={cn('text-muted-foreground', className)}>
      From <Price amount={amount} className="font-medium" />
    </span>
  );
}
