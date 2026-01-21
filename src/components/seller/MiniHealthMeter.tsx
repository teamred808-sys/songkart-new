import { useSellerHealth } from "@/hooks/useStrikeSystem";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

interface MiniHealthMeterProps {
  sellerId: string;
  size?: number;
  className?: string;
}

export function MiniHealthMeter({ 
  sellerId, 
  size = 28,
  className 
}: MiniHealthMeterProps) {
  const { data: health, isLoading } = useSellerHealth(sellerId);

  if (isLoading) {
    return (
      <div 
        className={`rounded-full bg-muted animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!health) return null;

  const score = health.health_score ?? 100;
  const isFrozen = health.is_frozen;
  const isDeactivated = health.is_deactivated;

  // SVG circle math
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 90) return 'hsl(142, 76%, 36%)'; // green
    if (score >= 70) return 'hsl(38, 92%, 50%)';  // amber
    if (score >= 50) return 'hsl(25, 95%, 53%)';  // orange
    return 'hsl(0, 84%, 60%)'; // red
  };

  const getLabel = (score: number) => {
    if (score >= 90) return 'Trusted Seller';
    if (score >= 70) return 'Good Standing';
    if (score >= 50) return 'Caution';
    return 'Low Trust';
  };

  // Frozen/Deactivated state
  if (isFrozen || isDeactivated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`flex items-center justify-center rounded-full bg-destructive/10 border border-destructive/30 ${className}`}
              style={{ width: size, height: size }}
            >
              <AlertTriangle 
                className="text-destructive" 
                style={{ width: size * 0.5, height: size * 0.5 }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium text-destructive">
              {isDeactivated ? 'Account Deactivated' : 'Account Frozen'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <svg 
            width={size} 
            height={size} 
            className={`shrink-0 ${className}`}
          >
            {/* Background circle */}
            <circle 
              cx={size / 2} 
              cy={size / 2} 
              r={radius}
              stroke="currentColor" 
              strokeOpacity={0.15}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <circle 
              cx={size / 2} 
              cy={size / 2} 
              r={radius}
              stroke={getColor(score)}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
            {/* Score text */}
            <text 
              x="50%" 
              y="50%" 
              textAnchor="middle" 
              dominantBaseline="middle"
              fontSize={size * 0.32}
              fontWeight="600"
              fill="currentColor"
              className="select-none"
            >
              {score}
            </text>
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{getLabel(score)}</p>
          <p className="text-xs text-muted-foreground">
            Seller Health: {score}/100
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
