import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminHealthMeterProps {
  score: number;
  communityStrikes?: number;
  copyrightStrikes?: number;
  isFrozen?: boolean;
  isDeactivated?: boolean;
  compact?: boolean;
}

export function AdminHealthMeter({
  score,
  communityStrikes = 0,
  copyrightStrikes = 0,
  isFrozen = false,
  isDeactivated = false,
  compact = false,
}: AdminHealthMeterProps) {
  const getHealthConfig = (score: number) => {
    if (score >= 90) {
      return {
        icon: ShieldCheck,
        label: 'Excellent',
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        ringColor: 'ring-green-200',
      };
    }
    if (score >= 70) {
      return {
        icon: Shield,
        label: 'Good',
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
      };
    }
    if (score >= 50) {
      return {
        icon: ShieldAlert,
        label: 'Caution',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        ringColor: 'ring-orange-200',
      };
    }
    return {
      icon: ShieldX,
      label: 'Critical',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      ringColor: 'ring-red-200',
    };
  };

  const config = getHealthConfig(score);
  const Icon = config.icon;

  // Compact version for table rows
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", config.bgColor, "text-white")}>
          <Icon className="h-3 w-3" />
          {score}%
        </div>
        {(isFrozen || isDeactivated) && (
          <span className={cn("text-xs px-1.5 py-0.5 rounded", isDeactivated ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500")}>
            {isDeactivated ? 'Deactivated' : 'Frozen'}
          </span>
        )}
      </div>
    );
  }

  // Full version for detail page
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular Progress */}
      <div className="relative">
        <div className={cn("w-32 h-32 rounded-full ring-8 flex items-center justify-center", config.ringColor)}>
          <div
            className="w-24 h-24 rounded-full flex flex-col items-center justify-center bg-card border-4"
            style={{
              borderColor: `hsl(var(--${score >= 70 ? 'primary' : score >= 50 ? 'warning' : 'destructive'}))`
            }}
          >
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-medium", config.bgColor)}>
          {config.label}
        </div>
      </div>

      {/* Status Alerts */}
      {(isFrozen || isDeactivated) && (
        <div className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", isDeactivated ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500")}>
          {isDeactivated ? '⛔ Account Deactivated' : '🔒 Account Frozen'}
        </div>
      )}

      {/* Strike Counts */}
      <div className="flex gap-4 text-center">
        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <div className="text-lg font-bold">{communityStrikes}</div>
          <div className="text-xs text-muted-foreground">Community</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <div className="text-lg font-bold">{copyrightStrikes}</div>
          <div className="text-xs text-muted-foreground">Copyright</div>
        </div>
      </div>
    </div>
  );
}
