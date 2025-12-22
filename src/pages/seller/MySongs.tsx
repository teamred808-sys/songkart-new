import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerSongs, useDeleteSong, SellerSong } from '@/hooks/useSellerData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-success/20 text-success border-success/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function MySongs() {
  const { data: songs, isLoading } = useSellerSongs();
  const deleteSong = useDeleteSong();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredSongs = songs?.filter((song) => {
    const matchesFilter = filter === 'all' || song.status === filter;
    const matchesSearch = song.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteSong.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const hasExclusiveSale = (song: SellerSong) => {
    return song.license_tiers?.some(
      (tier) => tier.license_type === 'exclusive' && (tier.current_sales || 0) > 0
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">My Songs</h1>
          <p className="text-muted-foreground">Manage your uploaded songs and licenses.</p>
        </div>
        <Button asChild className="btn-glow">
          <Link to="/seller/songs/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Song
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Songs Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px]">Song</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead className="text-right">Base Price</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredSongs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No songs found</p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/seller/songs/upload">Upload your first song</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSongs?.map((song) => (
                <TableRow key={song.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage 
                          src={song.cover_image_url || ''} 
                          alt={song.title}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-md bg-muted">
                          {song.title.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{song.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {song.has_lyrics && 'Lyrics'} {song.has_audio && '• Audio'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", statusColors[song.status])}
                    >
                      {song.status}
                    </Badge>
                    {song.status === 'rejected' && song.rejection_reason && (
                      <p className="text-xs text-destructive mt-1 max-w-[150px] truncate">
                        {song.rejection_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {song.genre?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(song.base_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {song.license_tiers?.reduce((sum, t) => sum + (t.current_sales || 0), 0) || 0}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {song.status === 'approved' && (
                          <DropdownMenuItem asChild>
                            <Link to={`/song/${song.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View on Store
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          asChild
                          disabled={hasExclusiveSale(song)}
                        >
                          <Link to={`/seller/songs/${song.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        {song.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => setDeleteId(song.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Song</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this song? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
