import { useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { useUserRating, useSubmitRating, useHasPurchased } from "@/hooks/useRatings";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface RatingInputProps {
  songId: string;
  sellerId?: string;
  className?: string;
}

export function RatingInput({ songId, sellerId, className }: RatingInputProps) {
  const { user } = useAuth();
  const { data: existingRating, isLoading: ratingLoading } = useUserRating(songId);
  const { data: hasPurchased } = useHasPurchased(songId);
  const submitRating = useSubmitRating();

  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const isOwnSong = user?.id === sellerId;
  const currentRating = selectedRating ?? existingRating?.rating ?? 0;
  const hasRated = !!existingRating;

  const handleRateClick = (rating: number) => {
    if (isOwnSong || !user) return;
    setSelectedRating(rating);
  };

  const handleSubmit = () => {
    if (!selectedRating || isOwnSong) return;
    submitRating.mutate(
      { songId, rating: selectedRating },
      {
        onSuccess: () => {
          setSelectedRating(null);
        },
      }
    );
  };

  if (!user) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Sign in to rate this content
      </div>
    );
  }

  if (isOwnSong) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        You cannot rate your own content
      </Badge>
    );
  }

  if (ratingLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {hasRated ? "Your rating" : "Rate this content"}
            </span>
            {hasPurchased && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <BadgeCheck className="h-3 w-3 text-blue-500" />
                Verified Purchase
              </Badge>
            )}
          </div>
          <StarRating
            rating={currentRating}
            size="lg"
            interactive
            onRate={handleRateClick}
            disabled={submitRating.isPending}
          />
        </div>
      </div>

      {selectedRating && selectedRating !== existingRating?.rating && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitRating.isPending}
          >
            {submitRating.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : hasRated ? (
              "Update Rating"
            ) : (
              "Submit Rating"
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedRating(null)}
            disabled={submitRating.isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {hasRated && !selectedRating && (
        <p className="text-xs text-muted-foreground">
          Click the stars to update your rating
        </p>
      )}
    </div>
  );
}
