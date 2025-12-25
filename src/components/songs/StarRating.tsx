import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
};

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRate,
  showValue = false,
  disabled = false,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating ?? rating;

  const handleClick = (starIndex: number) => {
    if (interactive && onRate && !disabled) {
      onRate(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (interactive && !disabled) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (interactive && !disabled) {
      setHoverRating(null);
    }
  };

  return (
    <div className={cn("flex items-center", gapClasses[size], className)}>
      <div
        className={cn(
          "flex items-center",
          gapClasses[size],
          interactive && !disabled && "cursor-pointer"
        )}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxRating }).map((_, index) => {
          const starIndex = index + 1;
          const isFilled = starIndex <= displayRating;
          const isHalfFilled = !isFilled && starIndex - 0.5 <= displayRating;

          return (
            <button
              key={starIndex}
              type="button"
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => handleMouseEnter(starIndex)}
              disabled={!interactive || disabled}
              className={cn(
                "relative transition-all duration-150",
                interactive && !disabled && "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label={`Rate ${starIndex} star${starIndex > 1 ? "s" : ""}`}
            >
              {/* Background star (empty) */}
              <Star
                className={cn(
                  sizeClasses[size],
                  "text-muted-foreground/30",
                  isFilled && "text-amber-500",
                  isHalfFilled && "text-amber-500/50"
                )}
                fill={isFilled ? "currentColor" : isHalfFilled ? "currentColor" : "none"}
                strokeWidth={interactive ? 2 : 1.5}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className={cn(
          "font-medium text-foreground",
          size === "sm" && "text-xs ml-1",
          size === "md" && "text-sm ml-1.5",
          size === "lg" && "text-base ml-2"
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
