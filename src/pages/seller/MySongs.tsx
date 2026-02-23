import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerSongs, useDeleteSong, SellerSong } from '@/hooks/useSellerData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Music,
  FileAudio,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const statusConfig: Record<string, { 
  color: string; 
  bgColor: string;
  icon: typeof Clock;
  label: string;
  description: string;
}> = {
  pending: { 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    icon: Clock,
    label: 'Pending Review',
    description: 'Your song is being reviewed by our team'
  },
  approved: { 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    icon: CheckCircle2,
    label: 'Approved & Live',
    description: 'Your song is live and available for purchase'
  },
  rejected: { 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/30',
    icon: XCircle,
    label: 'Rejected',
    description: 'Your song was not approved'
  },
};

export default function MySongs() {
  const { data: songs, isLoading } = useSellerSongs();
  const deleteSong = useDeleteSong();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedRejections, setExpandedRejections] = useState<Record<string, boolean>>({});

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

  // Calculate total sales for a song
  const getTotalSales = (song: SellerSong) => {
    return song.license_tiers?.reduce((sum, t) => sum + (t.current_sales || 0), 0) || 0;
  };

  // Check if song can be deleted
  const canDeleteSong = (song: SellerSong) => {
    const totalSales = getTotalSales(song);
    // Can delete: pending songs, rejected songs, or approved songs with no sales
    return song.status === 'pending' || song.status === 'rejected' || totalSales === 0;
  };

  // Get delete warning message
  const getDeleteWarning = (song: SellerSong) => {
    const totalSales = getTotalSales(song);
    if (totalSales > 0) {
      return `This song has ${totalSales} sale${totalSales > 1 ? 's' : ''} and cannot be deleted.`;
    }
    return null;
  };

  const toggleRejection = (id: string) => {
    setExpandedRejections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Stats counts
  const pendingCount = songs?.filter(s => s.status === 'pending').length || 0;
  const approvedCount = songs?.filter(s => s.status === 'approved').length || 0;
  const rejectedCount = songs?.filter(s => s.status === 'rejected').length || 0;

  // Check for rejected songs that need attention
  const rejectedSongs = songs?.filter(s => s.status === 'rejected') || [];

  // Helper to parse rejection reason
  const parseRejectionReason = (reason: string) => {
    const match = reason.match(/^\[([^\]]+)\]:\s*(.*)$/s);
    if (match) {
      return { category: match[1], details: match[2] };
    }
    return { category: null, details: reason };
  };

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Rejection Alert Banner */}
        {rejectedSongs.length > 0 && filter !== 'rejected' && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                {rejectedSongs.length} song{rejectedSongs.length > 1 ? 's' : ''} rejected
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Review the rejection reasons and make necessary corrections before resubmitting.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setFilter('rejected')}
            >
              View Rejected Songs
            </Button>
          </Alert>
        )}

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

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className={cn(
            "cursor-pointer transition-all",
            filter === 'pending' ? 'border-amber-500 bg-amber-500/5' : 'hover:border-amber-500/50'
          )} onClick={() => setFilter('pending')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "cursor-pointer transition-all",
            filter === 'approved' ? 'border-emerald-500 bg-emerald-500/5' : 'hover:border-emerald-500/50'
          )} onClick={() => setFilter('approved')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "cursor-pointer transition-all",
            filter === 'rejected' ? 'border-destructive bg-destructive/5' : 'hover:border-destructive/50'
          )} onClick={() => setFilter('rejected')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
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
              <TabsTrigger value="all">All ({songs?.length || 0})</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Songs Table */}
        <div className="rounded-xl border border-border overflow-hidden">
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
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSongs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-muted">
                        <Music className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">No songs found</p>
                        <p className="text-sm text-muted-foreground">
                          {filter !== 'all' ? 'Try a different filter or ' : ''}Upload your first song to get started
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link to="/seller/songs/upload">
                          <Plus className="mr-2 h-4 w-4" />
                          Upload Song
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSongs?.map((song) => {
                  const status = statusConfig[song.status];
                  const StatusIcon = status.icon;
                  const isRejectionExpanded = expandedRejections[song.id];
                  
                  return (
                    <TableRow key={song.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 rounded-lg">
                            <AvatarImage 
                              src={(song as any).artwork_cropped_url || song.cover_image_url || ''} 
                              alt={song.title}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-lg bg-muted text-lg">
                              {song.title.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{song.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {song.has_audio && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <FileAudio className="h-3.5 w-3.5 text-emerald-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Has audio file</TooltipContent>
                                </Tooltip>
                              )}
                              {song.has_lyrics && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Has lyrics</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="outline" 
                                className={cn("gap-1.5", status.bgColor, status.color)}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{status.description}</TooltipContent>
                          </Tooltip>
                          
                          {/* Expandable Rejection Reason */}
                          {song.status === 'rejected' && song.rejection_reason && (
                            <Collapsible open={isRejectionExpanded} onOpenChange={() => toggleRejection(song.id)}>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-destructive hover:text-destructive">
                                  <span>View reason</span>
                                  <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isRejectionExpanded && "rotate-180")} />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-xs max-w-[250px]">
                                  {(() => {
                                    const { category, details } = parseRejectionReason(song.rejection_reason);
                                    return (
                                      <>
                                        {category && (
                                          <Badge variant="outline" className="mb-2 bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                                            {category}
                                          </Badge>
                                        )}
                                        <p className="text-destructive leading-relaxed">{details}</p>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="mt-2 h-7 text-xs w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                                          asChild
                                        >
                                          <Link to={`/seller/songs/${song.id}/edit`}>
                                            <Edit className="mr-1 h-3 w-3" /> Edit & Resubmit
                                          </Link>
                                        </Button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {song.genre?.name || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{Number(song.base_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {song.license_tiers?.reduce((sum, t) => sum + (t.current_sales || 0), 0) || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {song.status === 'approved' && (
                              <DropdownMenuItem asChild>
                                <Link to={`/song/${song.id}`} className="flex items-center">
                                  <Eye className="mr-2 h-4 w-4" /> View on Store
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              asChild
                              disabled={hasExclusiveSale(song)}
                            >
                              <Link to={`/seller/songs/${song.id}/edit`} className="flex items-center">
                                <Edit className="mr-2 h-4 w-4" /> Edit Song
                              </Link>
                            </DropdownMenuItem>
                            {canDeleteSong(song) ? (
                              <DropdownMenuItem 
                                onClick={() => setDeleteId(song.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {getDeleteWarning(song)}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
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
                Are you sure you want to delete this song? This action cannot be undone and all associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Delete Song
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
