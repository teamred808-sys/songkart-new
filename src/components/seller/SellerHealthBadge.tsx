import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSellerHealth } from "@/hooks/useStrikeSystem";

interface SellerHealthBadgeProps {
  sellerId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SellerHealthBadge({ 
  sellerId, 
  showLabel = false, 
  size = 'md',
  className 
}: SellerHealthBadgeProps) {
  const { data: health, isLoading } = useSellerHealth(sellerId);

  if (isLoading || !health) return null;

  const score = health.health_score ?? 100;
  
  const getHealthConfig = (score: number) => {
    if (score >= 90) {
      return {
        icon: ShieldCheck,
        label: 'Trusted Seller',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200',
        description: 'This seller has an excellent track record',
      };
    }
    if (score >= 70) {
      return {
        icon: Shield,
        label: 'Good Standing',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        description: 'This seller is in good standing',
      };
    }
    if (score >= 50) {
      return {
        icon: ShieldAlert,
        label: 'Caution',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200',
        description: 'This seller has some account warnings',
      };
    }
    return {
      icon: ShieldX,
      label: 'Low Trust',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      description: 'This seller has significant account issues',
    };
  };

  const config = getHealthConfig(score);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const labelSizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Don't show badge for frozen/deactivated accounts (they have separate indicators)
  if (health.is_frozen || health.is_deactivated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1 rounded-full border",
              "bg-destructive/10 text-destructive border-destructive/20",
              labelSizeClasses[size],
              className
            )}>
              <AlertTriangle className={sizeClasses[size]} />
              {showLabel && (
                <span className="font-medium">
                  {health.is_deactivated ? 'Deactivated' : 'Frozen'}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{health.is_deactivated ? 'This account has been deactivated' : 'This account is temporarily frozen'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Only show badge if score is below 90 (to avoid clutter) or if showLabel is true
  if (score >= 90 && !showLabel) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1 rounded-full border",
            config.bgColor,
            config.color,
            config.borderColor,
            labelSizeClasses[size],
            className
          )}>
            <Icon className={sizeClasses[size]} />
            {showLabel && (
              <span className="font-medium">{config.label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <p className="text-xs mt-1">Health Score: {score}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
