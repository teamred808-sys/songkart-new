import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Sparkles, Award, Crown, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SellerTierBadgeProps {
  tierLevel: number;
  tierName: string;
  badgeColor?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Star,
  2: Sparkles,
  3: Award,
  4: Crown,
  5: Gem,
};

const tierColorClasses: Record<string, string> = {
  slate: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function SellerTierBadge({
  tierLevel,
  tierName,
  badgeColor = 'slate',
  showTooltip = true,
  size = 'sm',
  className,
}: SellerTierBadgeProps) {
  const Icon = tierIcons[tierLevel] || Star;
  const colorClass = tierColorClasses[badgeColor] || tierColorClasses.slate;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center border font-medium',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{tierName}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  const tierDescriptions: Record<number, string> = {
    1: 'New seller building their reputation',
    2: 'Rising seller with proven sales',
    3: 'Professional seller with consistent quality',
    4: 'Top-tier seller with strong market validation',
    5: 'Elite seller with complete pricing freedom',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{tierName}</p>
          <p className="text-xs text-muted-foreground">
            {tierDescriptions[tierLevel] || 'Seller tier badge'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
