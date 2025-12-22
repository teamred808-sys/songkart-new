import { useState } from 'react';
import { useBuyerPurchases } from '@/hooks/useBuyerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Music, Search, Download, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function MyPurchases() {
  const { data: purchases, isLoading } = useBuyerPurchases();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPurchases = purchases?.filter((p) =>
    p.songs?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <p className="text-muted-foreground">View all your purchased songs and licenses.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle>Purchase History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPurchases && filteredPurchases.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Song</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                            {purchase.songs?.cover_image_url ? (
                              <img
                                src={purchase.songs.cover_image_url}
                                alt={purchase.songs.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Music className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{purchase.songs?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {(purchase.songs as any)?.profiles?.full_name || 'Unknown Artist'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {purchase.license_tiers?.license_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(purchase.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(purchase.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/song/${purchase.song_id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          {purchase.license_pdf_url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={purchase.license_pdf_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/dashboard/downloads">
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No purchases found</p>
              <p className="text-muted-foreground">Start exploring and buy some amazing songs!</p>
              <Button asChild className="mt-4">
                <Link to="/browse">Browse Songs</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
