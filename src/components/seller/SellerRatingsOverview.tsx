import { Star, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/songs/StarRating";
import { useSellerRatingStats, useSellerRatings } from "@/hooks/useRatings";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function SellerRatingsOverview() {
  const { data: stats, isLoading: statsLoading } = useSellerRatingStats();
  const { data: recentRatings, isLoading: ratingsLoading } = useSellerRatings();

  if (statsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Ratings Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalRatings === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Ratings Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>No ratings yet</p>
            <p className="text-sm mt-1">
              Ratings will appear here once buyers rate your songs
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxDistribution = Math.max(...Object.values(stats.distribution));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Ratings Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
              <span className="text-2xl font-bold">{stats.averageRating}</span>
            </div>
            <p className="text-xs text-muted-foreground">Average Rating</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">{stats.totalRatings}</div>
            <p className="text-xs text-muted-foreground">Total Ratings</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">{stats.songCount}</div>
            <p className="text-xs text-muted-foreground">Rated Songs</p>
          </div>
        </div>

        {/* Distribution */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Rating Distribution
          </h4>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star as 1 | 2 | 3 | 4 | 5];
            const percentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 text-sm text-muted-foreground">{star}</span>
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <Progress value={percentage} className="flex-1 h-2" />
                <span className="w-8 text-sm text-muted-foreground text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recent Ratings */}
        {recentRatings && recentRatings.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Ratings
            </h4>
            <div className="space-y-2">
              {recentRatings.slice(0, 5).map((rating: any) => (
                <div
                  key={rating.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={rating.profiles?.avatar_url} />
                    <AvatarFallback>
                      {rating.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {rating.songs?.title}
                      </span>
                      {rating.is_verified_purchase && (
                        <Badge variant="secondary" className="text-xs">
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
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
