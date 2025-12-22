import { useState } from 'react';
import { useAllSongs, useApproveSong, useRejectSong } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function SongModeration() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | undefined>('pending');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; songId: string | null }>({ open: false, songId: null });
  const [rejectReason, setRejectReason] = useState('');

  const { data: songs, isLoading } = useAllSongs({ status: statusFilter, search });
  const approveSong = useApproveSong();
  const rejectSong = useRejectSong();

  const handleApprove = (songId: string) => {
    approveSong.mutate(songId);
  };

  const handleReject = () => {
    if (rejectDialog.songId && rejectReason) {
      rejectSong.mutate({ songId: rejectDialog.songId, reason: rejectReason });
      setRejectDialog({ open: false, songId: null });
      setRejectReason('');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500/10 text-green-500">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-500">Rejected</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Song Moderation</h1>
        <p className="text-muted-foreground">Review and approve song submissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle>Songs</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search songs..." className="pl-9 w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as any)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Song</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : songs?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No songs found</TableCell></TableRow>
              ) : songs?.map((song: any) => (
                <TableRow key={song.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded">
                        <AvatarImage src={song.cover_image_url} />
                        <AvatarFallback className="rounded">🎵</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{song.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{song.profiles?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{song.genres?.name || '-'}</TableCell>
                  <TableCell>₹{song.base_price}</TableCell>
                  <TableCell>{statusBadge(song.status)}</TableCell>
                  <TableCell>{format(new Date(song.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild><Link to={`/song/${song.id}`}><Eye className="h-4 w-4" /></Link></Button>
                      {song.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" className="text-green-500" onClick={() => handleApprove(song.id)}><CheckCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setRejectDialog({ open: true, songId: song.id })}><XCircle className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, songId: open ? rejectDialog.songId : null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Song</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, songId: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
