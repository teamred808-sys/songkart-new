import { useState } from 'react';
import { useOrders } from '@/hooks/useCheckout';
import { useBuyerPurchases } from '@/hooks/useBuyerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Price } from '@/components/ui/Price';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Music, Search, Download, FileText, ExternalLink, Package, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function MyPurchases() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: purchases, isLoading: purchasesLoading } = useBuyerPurchases();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders?.filter((order) =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_items?.some((item: any) => 
      item.songs?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredPurchases = purchases?.filter((p) =>
    p.songs?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = ordersLoading || purchasesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <p className="text-muted-foreground">View all your purchased songs and licenses.</p>
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search purchases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredOrders && filteredOrders.length > 0 ? (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {Number(order.total_amount) === 0 ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                FREE
                              </Badge>
                            ) : (
                              <p className="font-bold"><Price amount={Number(order.total_amount)} /></p>
                            )}
                          </div>
                          <Badge 
                            variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                            className={order.payment_status === 'paid' ? 'bg-green-500' : ''}
                          >
                            {order.payment_status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                              {item.songs?.cover_image_url ? (
                                <img
                                  src={item.songs.cover_image_url}
                                  alt={item.songs.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Music className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.songs?.title}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item.license_type}
                                </Badge>
                                {item.is_exclusive && (
                                  <Badge className="bg-amber-500 text-xs">Exclusive</Badge>
                                )}
                                {Number(item.price) === 0 && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                    FREE
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {Number(item.price) === 0 ? (
                              <p className="font-medium text-green-600">FREE</p>
                            ) : (
                              <p className="font-medium"><Price amount={Number(item.price)} /></p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium">No orders found</p>
                  <p className="text-muted-foreground">Start exploring and buy some amazing songs!</p>
                  <Button asChild className="mt-4">
                    <Link to="/browse">Browse Songs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
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
                            {Number(purchase.amount) === 0 ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                FREE
                              </Badge>
                            ) : (
                              <Price amount={Number(purchase.amount)} />
                            )}
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
                                <Link to="/buyer/downloads">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
