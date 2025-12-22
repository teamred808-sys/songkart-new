import { useOrders } from '@/hooks/useCheckout';
import { useBuyerPurchases } from '@/hooks/useBuyerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Download, FileText, FileAudio, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function MyDownloads() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: purchases, isLoading: purchasesLoading } = useBuyerPurchases();

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
      toast.success('Download started');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Downloads</h1>
        <p className="text-muted-foreground">Access and download your purchased content.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : uniqueItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uniqueItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-video relative bg-muted">
                {item.song?.cover_image_url ? (
                  <img
                    src={item.song.cover_image_url}
                    alt={item.song.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Music className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge>{item.license_type}</Badge>
                  {item.is_exclusive && (
                    <Badge className="bg-amber-500 gap-1">
                      <Lock className="h-3 w-3" />
                      Exclusive
                    </Badge>
                  )}
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{item.song?.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Audio Download */}
                {item.song?.audio_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleSecureDownload(item.song!.id, item.song!.title)}
                  >
                    <FileAudio className="h-4 w-4" />
                    Download Audio
                  </Button>
                )}

                {/* Lyrics Download */}
                {item.song?.full_lyrics && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
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
                      toast.success('Lyrics downloaded');
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Download Lyrics
                  </Button>
                )}

                {/* License PDF */}
                {item.license_pdf_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a href={item.license_pdf_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                      License Agreement
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Download className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No downloads available</p>
            <p className="text-muted-foreground">Purchase songs to access downloadable content.</p>
            <Button asChild className="mt-4">
              <Link to="/browse">Browse Songs</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
