import { useState } from "react";
import {
  Star,
  Flag,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/songs/StarRating";
import {
  useAllRatings,
  useFlaggedRatings,
  useAdminRemoveRating,
  useUpdateFlagStatus,
} from "@/hooks/useRatings";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

export default function RatingModeration() {
  const [searchTerm, setSearchTerm] = useState("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<any>(null);
  const [removeReason, setRemoveReason] = useState("");

  const { data: allRatings, isLoading: ratingsLoading } = useAllRatings({ limit: 100 });
  const { data: flaggedRatings, isLoading: flagsLoading } = useFlaggedRatings();
  const removeRating = useAdminRemoveRating();
  const updateFlagStatus = useUpdateFlagStatus();

  const filteredRatings = allRatings?.filter((rating: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      rating.songs?.title?.toLowerCase().includes(search) ||
      rating.profiles?.full_name?.toLowerCase().includes(search)
    );
  });

  const pendingFlags = flaggedRatings?.filter((f: any) => f.status === "pending") || [];

  const handleRemoveClick = (rating: any) => {
    setSelectedRating(rating);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = () => {
    if (!selectedRating || !removeReason.trim()) return;

    removeRating.mutate(
      { ratingId: selectedRating.id, reason: removeReason },
      {
        onSuccess: () => {
          setRemoveDialogOpen(false);
          setSelectedRating(null);
          setRemoveReason("");
        },
      }
    );
  };

  const handleFlagAction = (flagId: string, status: string, actionTaken?: string) => {
    updateFlagStatus.mutate({ flagId, status, actionTaken });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rating Moderation</h1>
            <p className="text-muted-foreground">
              Monitor and moderate user ratings
            </p>
          </div>
          {pendingFlags.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {pendingFlags.length} Pending Flags
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="pt-6">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allRatings?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Ratings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="pt-6">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allRatings && allRatings.length > 0
                      ? (
                          allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) /
                          allRatings.length
                        ).toFixed(1)
                      : "0"}
                  </p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="pt-6">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Flag className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingFlags.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Flags</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="pt-6">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allRatings?.filter((r: any) => r.is_verified_purchase).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Verified Purchases</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Ratings</TabsTrigger>
            <TabsTrigger value="flagged" className="gap-1">
              Flagged
              {pendingFlags.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {pendingFlags.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Ratings Tab */}
          <TabsContent value="all" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by song or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Song</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRatings && filteredRatings.length > 0 ? (
                    filteredRatings.map((rating: any) => (
                      <TableRow key={rating.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={rating.profiles?.avatar_url} />
                              <AvatarFallback>
                                {rating.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {rating.profiles?.full_name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/song/${rating.song_id}`}
                            className="text-primary hover:underline"
                          >
                            {rating.songs?.title || "Unknown Song"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StarRating rating={rating.rating} size="sm" />
                        </TableCell>
                        <TableCell>
                          {rating.is_verified_purchase ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(rating.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveClick(rating)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No ratings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Flagged Tab */}
          <TabsContent value="flagged" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flagged Rating</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Flagged By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : flaggedRatings && flaggedRatings.length > 0 ? (
                    flaggedRatings.map((flag: any) => (
                      <TableRow key={flag.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={flag.song_ratings?.profiles?.avatar_url}
                                />
                                <AvatarFallback>U</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {flag.song_ratings?.profiles?.full_name || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StarRating
                                rating={flag.song_ratings?.rating || 0}
                                size="sm"
                              />
                              <span className="text-xs text-muted-foreground">
                                on {flag.song_ratings?.songs?.title}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm truncate">{flag.reason}</p>
                        </TableCell>
                        <TableCell>
                          {flag.flagged_by_profile?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              flag.status === "pending"
                                ? "outline"
                                : flag.status === "reviewed"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {flag.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(flag.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {flag.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-600"
                                onClick={() =>
                                  handleFlagAction(flag.id, "reviewed", "dismissed")
                                }
                                title="Dismiss flag"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  handleRemoveClick(flag.song_ratings);
                                  handleFlagAction(flag.id, "reviewed", "removed");
                                }}
                                title="Remove rating"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No flagged ratings
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Remove Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Remove Rating
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please provide a reason for removing
                this rating.
              </DialogDescription>
            </DialogHeader>

            {selectedRating && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={selectedRating.rating} size="sm" />
                  <span className="text-sm">
                    by {selectedRating.profiles?.full_name || "Unknown"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  on {selectedRating.songs?.title}
                </p>
              </div>
            )}

            <Textarea
              placeholder="Reason for removal (required)..."
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              rows={3}
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveDialogOpen(false)}
                disabled={removeRating.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveConfirm}
                disabled={!removeReason.trim() || removeRating.isPending}
              >
                {removeRating.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Rating"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
