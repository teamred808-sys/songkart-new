import { useState } from 'react';
import { useOrders } from '@/hooks/useCheckout';
import { useBuyerPurchases } from '@/hooks/useBuyerData';
import { useDownloadLicense } from '@/hooks/useLicenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Music, 
  Download, 
  FileText, 
  FileAudio, 
  Lock, 
  ScrollText,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// License rights by type
const licenseRights: Record<string, { permitted: string[]; prohibited: string[]; summary: string; color: string }> = {
  personal: {
    permitted: ['Personal listening', 'Private projects', 'Non-commercial use'],
    prohibited: ['Commercial use', 'Public distribution', 'Resale'],
    summary: 'For personal enjoyment only',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  youtube: {
    permitted: ['YouTube videos', 'Streaming platforms', 'Podcasts', 'Social media'],
    prohibited: ['TV/Film', 'Advertising', 'Resale'],
    summary: 'Use on YouTube & streaming with attribution',
    color: 'bg-red-500/10 text-red-500 border-red-500/30',
  },
  commercial: {
    permitted: ['Commercial projects', 'Advertising', 'Products', 'Business use'],
    prohibited: ['Exclusive ownership', 'Resale of license'],
    summary: 'Full commercial rights for business',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
  film: {
    permitted: ['Film & TV', 'Broadcast', 'Theatrical', 'Streaming platforms'],
    prohibited: ['Exclusive ownership', 'Resale'],
    summary: 'Film, TV & broadcast rights',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  exclusive: {
    permitted: ['Full ownership', 'All commercial uses', 'Resale rights', 'Modification'],
    prohibited: [],
    summary: 'You own all rights to this song',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
};

export default function MyDownloads() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: purchases, isLoading: purchasesLoading } = useBuyerPurchases();
  const downloadLicense = useDownloadLicense();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const isLoading = ordersLoading || purchasesLoading;

  // Combine order items and legacy purchases
  const downloadableItems = [
    ...(orders?.flatMap(order => 
      order.order_items?.map((item: any) => ({
        id: item.id,
        song: item.songs,
        license_type: item.license_type,
        is_exclusive: item.is_exclusive,
        license_pdf_url: item.license_pdf_url,
        source: 'order',
      })) || []
    ) || []),
    ...(purchases?.map(purchase => ({
      id: purchase.id,
      song: purchase.songs,
      license_type: purchase.license_tiers?.license_type,
      is_exclusive: false,
      license_pdf_url: purchase.license_pdf_url,
      source: 'transaction',
    })) || []),
  ];

  // Dedupe by song id
  const uniqueItems = downloadableItems.filter((item, index, self) =>
    index === self.findIndex(t => t.song?.id === item.song?.id)
  );

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Download started!', {
        description: `${filename} is being downloaded`
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed. Please try again.');
    }
  };

  const handleSecureDownload = async (songId: string, songTitle: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-purchased', {
        body: { song_id: songId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.download_url) {
        handleDownload(data.download_url, `${songTitle}.mp3`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to download');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display">License Vault</h1>
              <p className="text-muted-foreground">Your purchased content & licenses in one secure place</p>
            </div>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[280px]">
              <p className="text-sm">
                Your License Vault contains all purchased songs, downloadable files, and legal license agreements. 
                Each license defines what you can and cannot do with the song.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueItems.length}</p>
              <p className="text-xs text-muted-foreground">Songs owned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileAudio className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueItems.filter(i => i.song?.audio_url).length}</p>
              <p className="text-xs text-muted-foreground">Audio files</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueItems.filter(i => i.song?.full_lyrics).length}</p>
              <p className="text-xs text-muted-foreground">Lyrics files</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueItems.filter(i => i.is_exclusive).length}</p>
              <p className="text-xs text-muted-foreground">Exclusive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : uniqueItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {uniqueItems.map((item) => {
            const rights = licenseRights[item.license_type || 'personal'];
            const isExpanded = expandedItems[item.id];
            
            return (
              <Card key={item.id} className="overflow-hidden border-2 hover:border-primary/30 transition-colors">
                {/* Song Header */}
                <div className="relative aspect-[3/1] bg-muted">
                  {item.song?.cover_image_url ? (
                    <img
                      src={item.song.cover_image_url}
                      alt={item.song.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <Music className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg font-semibold truncate text-foreground">{item.song?.title}</h3>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <Badge variant="outline" className={`${rights.color} backdrop-blur-sm capitalize`}>
                      {item.license_type}
                    </Badge>
                    {item.is_exclusive && (
                      <Badge className="bg-amber-500/90 text-amber-950 gap-1">
                        <Lock className="h-3 w-3" />
                        Exclusive
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* License Summary */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{rights.summary}</p>
                  </div>

                  {/* Expandable Rights Section */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          What can I do with this?
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-3">
                      {rights.permitted.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-emerald-500 mb-1.5">✓ Permitted Uses</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rights.permitted.map((use) => (
                              <Badge key={use} variant="outline" className="text-xs bg-emerald-500/5 border-emerald-500/20 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {use}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {rights.prohibited.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-destructive mb-1.5">✗ Not Permitted</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rights.prohibited.map((use) => (
                              <Badge key={use} variant="outline" className="text-xs bg-destructive/5 border-destructive/20 text-destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                {use}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Download Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Downloads</p>
                    <div className="grid grid-cols-1 gap-2">
                      {/* Audio Download */}
                      {item.song?.audio_url && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start gap-2 h-10"
                                onClick={() => handleSecureDownload(item.song!.id, item.song!.title)}
                              >
                                <FileAudio className="h-4 w-4 text-emerald-500" />
                                <span className="flex-1 text-left">Audio File</span>
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download high-quality MP3 audio</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Lyrics Download */}
                      {item.song?.full_lyrics && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start gap-2 h-10"
                                onClick={() => {
                                  const blob = new Blob([item.song!.full_lyrics!], { type: 'text/plain' });
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `${item.song!.title} - Lyrics.txt`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                  toast.success('Lyrics downloaded!');
                                }}
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="flex-1 text-left">Lyrics</span>
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download lyrics as text file</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* License PDF */}
                      {item.source === 'order' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start gap-2 h-10"
                                onClick={() => downloadLicense.mutate({ orderItemId: item.id })}
                                disabled={downloadLicense.isPending}
                              >
                                <ScrollText className="h-4 w-4 text-amber-500" />
                                <span className="flex-1 text-left">
                                  {downloadLicense.isPending ? 'Loading...' : 'License Agreement'}
                                </span>
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download legal license document (PDF)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Download className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xl font-semibold">No downloads available</p>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Purchase songs to access downloadable content, including audio files, lyrics, and legal license agreements.
            </p>
            <Button asChild className="mt-6">
              <Link to="/browse">Browse Songs</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
