import { useSellerHealth } from "@/hooks/useStrikeSystem";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProfileHealthMeterProps {
  sellerId: string;
  className?: string;
}

export function ProfileHealthMeter({ sellerId, className }: ProfileHealthMeterProps) {
  const { data: health, isLoading } = useSellerHealth(sellerId);

  const score = health?.health_score ?? 100;
  const communityStrikes = health?.community_strikes_active ?? 0;
  const copyrightStrikes = health?.copyright_strikes_active ?? 0;
  const isFrozen = health?.is_frozen ?? false;
  const isDeactivated = health?.is_deactivated ?? false;

  const getHealthConfig = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Excellent',
        bgColor: 'bg-green-500',
        ringColor: 'ring-green-200',
        borderColor: 'border-green-500',
      };
    }
    if (score >= 70) {
      return {
        label: 'Good',
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
        borderColor: 'border-amber-500',
      };
    }
    if (score >= 50) {
      return {
        label: 'Caution',
        bgColor: 'bg-orange-500',
        ringColor: 'ring-orange-200',
        borderColor: 'border-orange-500',
      };
    }
    return {
      label: 'Critical',
      bgColor: 'bg-red-500',
      ringColor: 'ring-red-200',
      borderColor: 'border-red-500',
    };
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center gap-3 md:gap-4", className)}>
        <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
        <div className="flex gap-2 md:gap-4">
          <Skeleton className="w-16 h-12 md:w-20 md:h-14 rounded-lg" />
          <Skeleton className="w-16 h-12 md:w-20 md:h-14 rounded-lg" />
        </div>
      </div>
    );
  }

  const config = getHealthConfig(score);

  return (
    <div className={cn("flex flex-col items-center gap-3 md:gap-4", className)}>
      {/* Circular Progress - Responsive */}
      <div className="relative">
        <div className={cn("w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 md:ring-8 flex items-center justify-center", config.ringColor)}>
          <div
            className={cn("w-[72px] h-[72px] md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center bg-card border-[3px] md:border-4", config.borderColor)}
          >
            <span className="text-2xl md:text-3xl font-bold">{score}</span>
            <span className="text-[10px] md:text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-white text-[10px] md:text-xs font-medium whitespace-nowrap", config.bgColor)}>
          {config.label}
        </div>
      </div>

      {/* Status Alerts */}
      {(isFrozen || isDeactivated) && (
        <div className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium", isDeactivated ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500")}>
          {isDeactivated ? '⛔ Account Deactivated' : '🔒 Account Frozen'}
        </div>
      )}

      {/* Strike Counts - Responsive */}
      <div className="flex gap-2 md:gap-4 text-center">
        <div className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-muted/50">
          <div className="text-base md:text-lg font-bold">{communityStrikes}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Community</div>
        </div>
        <div className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-muted/50">
          <div className="text-base md:text-lg font-bold">{copyrightStrikes}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Copyright</div>
        </div>
      </div>
    </div>
  );
}
