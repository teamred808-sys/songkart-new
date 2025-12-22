import { useBuyerPurchases } from '@/hooks/useBuyerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Download, FileText, FileAudio } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyDownloads() {
  const { data: purchases, isLoading } = useBuyerPurchases();

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
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
      ) : purchases && purchases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="overflow-hidden">
              <div className="aspect-video relative bg-muted">
                {purchase.songs?.cover_image_url ? (
                  <img
                    src={purchase.songs.cover_image_url}
                    alt={purchase.songs.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Music className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 right-2">
                  {purchase.license_tiers?.license_type}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{purchase.songs?.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {(purchase.songs as any)?.profiles?.full_name || 'Unknown Artist'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Audio Download */}
                {purchase.songs?.audio_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleDownload(
                      purchase.songs!.audio_url!,
                      `${purchase.songs!.title}.mp3`
                    )}
                  >
                    <FileAudio className="h-4 w-4" />
                    Download Audio
                  </Button>
                )}

                {/* Lyrics Download */}
                {purchase.songs?.full_lyrics && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      const blob = new Blob([purchase.songs!.full_lyrics!], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${purchase.songs!.title} - Lyrics.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Download Lyrics
                  </Button>
                )}

                {/* License PDF */}
                {purchase.license_pdf_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a href={purchase.license_pdf_url} target="_blank" rel="noopener noreferrer">
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
