import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, XCircle, FileText, Music, Eye, Shield, Copyright } from "lucide-react";
import { useContentReviewQueue, useContentReviewStats, useResolveContentReview, ContentReviewItem } from "@/hooks/useContentReview";
import { SecureAudioPlayer } from "@/components/audio/SecureAudioPlayer";

export default function ContentReviewQueue() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedItem, setSelectedItem] = useState<ContentReviewItem | null>(null);
  const [resolution, setResolution] = useState<"approved" | "rejected" | "needs_proof" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: queue, isLoading } = useContentReviewQueue(statusFilter);
  const { data: stats } = useContentReviewStats();
  const resolveReview = useResolveContentReview();

  const handleResolve = () => {
    if (!selectedItem || !resolution) return;

    resolveReview.mutate(
      {
        queueId: selectedItem.id,
        songId: selectedItem.song_id,
        resolution,
        notes,
      },
      {
        onSuccess: () => {
          setSelectedItem(null);
          setResolution(null);
          setNotes("");
        },
      }
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 2) return <Badge variant="destructive">High</Badge>;
    if (priority <= 4) return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === "copyright") {
      return (
        <Badge variant="destructive" className="gap-1">
          <Copyright className="h-3 w-3" />
          Copyright
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-orange-500/20 text-orange-600">
        <FileText className="h-3 w-3" />
        Plagiarism
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Review Queue</h1>
          <p className="text-muted-foreground">
            Review flagged content for copyright and plagiarism issues
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.in_review || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Copyright Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.copyright || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Plagiarism Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.plagiarism || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Table */}
        <Card>
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Items are sorted by priority. High priority items should be reviewed first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in_review">In Review</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={statusFilter} className="mt-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !queue?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items in queue</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Song</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Detection</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 rounded-md">
                                <AvatarImage src={item.song?.cover_image_url || ""} />
                                <AvatarFallback className="rounded-md">
                                  <Music className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{item.song?.title || "Unknown"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {item.song?.seller_name || item.song?.seller_email}
                            </p>
                          </TableCell>
                          <TableCell>{getTypeBadge(item.queue_type)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">{item.detection_type?.replace(/_/g, " ")}</p>
                              {item.confidence_score && (
                                <p className="text-xs text-muted-foreground">
                                  {Math.round(item.confidence_score)}% match
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "pending"
                                  ? "secondary"
                                  : item.status === "resolved"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(item)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Review</DialogTitle>
            <DialogDescription>
              Review the flagged content and make a decision
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Detection Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Detection Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(selectedItem.queue_type)}
                    {getPriorityBadge(selectedItem.priority)}
                  </div>
                  <p className="text-sm">
                    <strong>Detection:</strong> {selectedItem.detection_type?.replace(/_/g, " ")}
                  </p>
                  {selectedItem.confidence_score && (
                    <p className="text-sm">
                      <strong>Confidence:</strong> {Math.round(selectedItem.confidence_score)}%
                    </p>
                  )}
                  {selectedItem.matched_content && (
                    <p className="text-sm">
                      <strong>Match:</strong> {selectedItem.matched_content}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Side by Side Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Flagged Song */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">Flagged Song</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-md">
                        <AvatarImage src={selectedItem.song?.cover_image_url || ""} />
                        <AvatarFallback className="rounded-md">
                          <Music className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedItem.song?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          by {selectedItem.song?.seller_name}
                        </p>
                      </div>
                    </div>
                    {selectedItem.song?.preview_audio_url && (
                      <SecureAudioPlayer
                        songId={selectedItem.song_id}
                      />
                    )}
                    {selectedItem.song?.full_lyrics && (
                      <div className="max-h-48 overflow-y-auto bg-muted p-3 rounded-md">
                        <p className="text-xs font-mono whitespace-pre-wrap">
                          {selectedItem.song.full_lyrics}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Matched Song */}
                {selectedItem.matched_song && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-blue-600">Matched Song</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 rounded-md bg-blue-100">
                          <AvatarFallback className="rounded-md">
                            <Music className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedItem.matched_song.title}</p>
                          <p className="text-sm text-muted-foreground">
                            by {selectedItem.matched_song.seller_name}
                          </p>
                        </div>
                      </div>
                      {selectedItem.matched_song.full_lyrics && (
                        <div className="max-h-48 overflow-y-auto bg-muted p-3 rounded-md">
                          <p className="text-xs font-mono whitespace-pre-wrap">
                            {selectedItem.matched_song.full_lyrics}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Resolution Options */}
              {selectedItem.status !== "resolved" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={resolution === "approved" ? "default" : "outline"}
                      className={resolution === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => setResolution("approved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant={resolution === "needs_proof" ? "default" : "outline"}
                      className={resolution === "needs_proof" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                      onClick={() => setResolution("needs_proof")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Request Proof
                    </Button>
                    <Button
                      variant={resolution === "rejected" ? "destructive" : "outline"}
                      onClick={() => setResolution("rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Add notes about your decision..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}

              {selectedItem.status === "resolved" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resolution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={
                        selectedItem.resolution === "approved"
                          ? "default"
                          : selectedItem.resolution === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {selectedItem.resolution}
                    </Badge>
                    {selectedItem.resolution_notes && (
                      <p className="text-sm mt-2 text-muted-foreground">
                        {selectedItem.resolution_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            {selectedItem?.status !== "resolved" && (
              <Button
                onClick={handleResolve}
                disabled={!resolution || resolveReview.isPending}
              >
                {resolveReview.isPending ? "Saving..." : "Save Decision"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}