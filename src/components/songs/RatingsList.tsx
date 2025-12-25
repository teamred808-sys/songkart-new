import { useState } from "react";
import { BadgeCheck, Flag, ChevronDown, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { useSongRatings, useFlagRating } from "@/hooks/useRatings";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RatingsListProps {
  songId: string;
  initialLimit?: number;
  className?: string;
}

export function RatingsList({
  songId,
  initialLimit = 5,
  className,
}: RatingsListProps) {
  const { user } = useAuth();
  const [limit, setLimit] = useState(initialLimit);
  const { data: ratings, isLoading } = useSongRatings(songId, limit, 0);
  const flagRating = useFlagRating();

  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [selectedRatingId, setSelectedRatingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");

  const handleFlagClick = (ratingId: string) => {
    setSelectedRatingId(ratingId);
    setFlagDialogOpen(true);
  };

  const handleFlagSubmit = () => {
    if (!selectedRatingId || !flagReason.trim()) return;

    flagRating.mutate(
      { ratingId: selectedRatingId, reason: flagReason },
      {
        onSuccess: () => {
          setFlagDialogOpen(false);
          setSelectedRatingId(null);
          setFlagReason("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>No ratings yet. Be the first to rate!</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="font-semibold">Recent Ratings</h3>

      <div className="space-y-4">
        {ratings.map((rating) => (
          <div
            key={rating.id}
            className="flex gap-3 p-3 rounded-lg bg-muted/30"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={rating.user_avatar || undefined} />
              <AvatarFallback>
                {rating.user_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {rating.user_name || "Anonymous"}
                </span>
                {rating.is_verified_purchase && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <BadgeCheck className="h-3 w-3 text-blue-500" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <StarRating rating={rating.rating} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(rating.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            {user && user.id !== rating.user_id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleFlagClick(rating.id)}
                title="Report this rating"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {ratings.length >= limit && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setLimit((prev) => prev + 10)}
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Load More
        </Button>
      )}

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Rating</DialogTitle>
            <DialogDescription>
              Please explain why you think this rating violates our guidelines.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Describe the issue..."
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFlagDialogOpen(false)}
              disabled={flagRating.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlagSubmit}
              disabled={!flagReason.trim() || flagRating.isPending}
            >
              {flagRating.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
