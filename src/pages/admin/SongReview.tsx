import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminSongReview, useAdminApproveSong, useAdminRejectSong, REJECTION_CATEGORIES } from '@/hooks/useAdminReview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  Clock, 
  Music, 
  FileText, 
  User, 
  Mail,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SongReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading, error } = useAdminSongReview(id);
  const approveSong = useAdminApproveSong();
  const rejectSong = useAdminRejectSong();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionCategory, setRejectionCategory] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleApprove = () => {
    if (id) {
      approveSong.mutate(id, {
        onSuccess: () => navigate('/admin/songs')
      });
    }
  };

  const handleReject = () => {
    if (id && rejectionCategory && rejectionReason.length >= 20) {
      const categoryLabel = REJECTION_CATEGORIES.find(c => c.value === rejectionCategory)?.label || rejectionCategory;
      rejectSong.mutate(
        { songId: id, category: categoryLabel, reason: rejectionReason },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            navigate('/admin/songs');
          }
        }
      );
    }
  };

  const canReject = rejectionCategory && rejectionReason.length >= 20;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load song for review. Please try again.</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/songs')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Moderation
        </Button>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/songs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Song Review</h1>
            <p className="text-muted-foreground">Review song content for moderation</p>
          </div>
        </div>
        {song.status === 'pending' && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-red-500 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setRejectDialogOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={approveSong.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        )}
      </div>

      {/* Admin Access Notice */}
      <Alert className="border-primary/30 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertTitle>Admin Review Mode</AlertTitle>
        <AlertDescription>
          You have elevated access to view full audio and complete lyrics for moderation purposes. 
          This access is logged for audit trail.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Song Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24 rounded-lg">
                  <AvatarImage src={song.cover_image_url || ''} className="object-cover" />
                  <AvatarFallback className="rounded-lg text-2xl">{song.title.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{song.title}</CardTitle>
                      <CardDescription className="mt-1">{song.description || 'No description provided'}</CardDescription>
                    </div>
                    {statusBadge(song.status)}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
                    {song.genres && <Badge variant="secondary">{song.genres.name}</Badge>}
                    {song.moods && <Badge variant="outline">{song.moods.name}</Badge>}
                    {song.language && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {song.language}</span>}
                    {song.bpm && <span className="flex items-center gap-1"><Music className="h-3 w-3" /> {song.bpm} BPM</span>}
                    {song.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Full Audio Player - Admin Only */}
          {song.full_audio_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Volume2 className="h-5 w-5 text-primary" />
                  Full Audio (Admin Access)
                </CardTitle>
                <CardDescription>
                  Complete audio file for moderation review. This content is not accessible to buyers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Button 
                    size="icon" 
                    className="h-12 w-12 rounded-full"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </Button>
                  <div className="flex-1">
                    <audio 
                      ref={audioRef}
                      src={song.full_audio_url}
                      className="w-full"
                      controls
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This signed URL expires in 5 minutes. Refresh the page if needed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Full Lyrics - Admin Only */}
          {song.has_lyrics && song.full_lyrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Full Lyrics (Admin Access)
                </CardTitle>
                <CardDescription>
                  Complete lyrics for content review. Only preview lyrics are shown to buyers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {song.full_lyrics}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* License Tiers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">License Tiers</CardTitle>
              <CardDescription>Pricing structure set by the seller</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {song.license_tiers?.length > 0 ? (
                  song.license_tiers.map((tier) => (
                    <div key={tier.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{tier.license_type} License</p>
                        <p className="text-sm text-muted-foreground">{tier.description || 'No description'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{tier.price}</p>
                        <p className="text-xs text-muted-foreground">
                          {tier.max_sales ? `${tier.current_sales || 0}/${tier.max_sales} sold` : 'Unlimited'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No license tiers configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seller Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={song.profiles?.avatar_url || ''} />
                  <AvatarFallback>{song.profiles?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{song.profiles?.full_name || 'Unknown Seller'}</p>
                  <p className="text-sm text-muted-foreground">{song.profiles?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Seller ID: {song.seller_id?.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{song.profiles?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Submitted
                </span>
                <span>{format(new Date(song.created_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Base Price
                </span>
                <span className="font-medium">₹{song.base_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Music className="h-4 w-4" /> Has Audio
                </span>
                <Badge variant={song.has_audio ? 'default' : 'secondary'}>
                  {song.has_audio ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Has Lyrics
                </span>
                <Badge variant={song.has_lyrics ? 'default' : 'secondary'}>
                  {song.has_lyrics ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Existing Rejection Reason (if rejected) */}
          {song.status === 'rejected' && song.rejection_reason && (
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                  <XCircle className="h-5 w-5" /> Rejection Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{song.rejection_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Song</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This will be shown to the seller so they can make corrections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Category *</Label>
              <Select value={rejectionCategory} onValueChange={setRejectionCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detailed Reason * (min 20 characters)</Label>
              <Textarea 
                placeholder="Please provide specific details about why this song is being rejected and what the seller can do to fix it..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
              />
              <p className={cn(
                "text-xs",
                rejectionReason.length >= 20 ? "text-muted-foreground" : "text-destructive"
              )}>
                {rejectionReason.length}/20 characters minimum
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!canReject || rejectSong.isPending}
            >
              {rejectSong.isPending ? 'Rejecting...' : 'Reject Song'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
