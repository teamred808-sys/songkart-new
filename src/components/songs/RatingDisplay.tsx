import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";

interface RatingDisplayProps {
  averageRating: number | null;
  totalRatings: number | null;
  size?: "sm" | "md" | "lg";
  showStars?: boolean;
  className?: string;
}

export function RatingDisplay({
  averageRating,
  totalRatings,
  size = "md",
  showStars = true,
  className,
}: RatingDisplayProps) {
  const rating = averageRating ?? 0;
  const count = totalRatings ?? 0;

  if (count === 0) {
    return (
      <div className={cn(
        "flex items-center gap-1 text-muted-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-base",
        className
      )}>
        <Star className={cn(
          "text-muted-foreground/50",
          size === "sm" && "h-3 w-3",
          size === "md" && "h-4 w-4",
          size === "lg" && "h-5 w-5"
        )} />
        <span>No ratings yet</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showStars ? (
        <StarRating rating={rating} size={size} showValue />
      ) : (
        <div className="flex items-center gap-1">
          <Star className={cn(
            "fill-amber-500 text-amber-500",
            size === "sm" && "h-3 w-3",
            size === "md" && "h-4 w-4",
            size === "lg" && "h-5 w-5"
          )} />
          <span className={cn(
            "font-medium",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}>
            {rating.toFixed(1)}
          </span>
        </div>
      )}
      <span className={cn(
        "text-muted-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-base"
      )}>
        ({count.toLocaleString()} {count === 1 ? "rating" : "ratings"})
      </span>
    </div>
  );
}

// Compact version for cards
export function RatingBadge({
  averageRating,
  totalRatings,
  className,
}: {
  averageRating: number | null;
  totalRatings: number | null;
  className?: string;
}) {
  const rating = averageRating ?? 0;
  const count = totalRatings ?? 0;

  if (count === 0) return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-sm",
      className
    )}>
      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}
