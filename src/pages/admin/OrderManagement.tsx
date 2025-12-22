import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Package, Search, Eye, Music } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            songs:song_id (
              id,
              title,
              cover_image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: buyers } = useQuery({
    queryKey: ['buyers-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return new Map(data.map(p => [p.id, p]));
    },
  });

  const filteredOrders = orders?.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyers?.get(order.buyer_id)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyers?.get(order.buyer_id)?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'refunded': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getFulfillmentColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-muted-foreground">View and manage all platform orders.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders ({filteredOrders?.length || 0})
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
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
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const buyer = buyers?.get(order.buyer_id);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{buyer?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{buyer?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.order_items?.length || 0} items
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{Number(order.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.payment_status)}>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getFulfillmentColor(order.fulfillment_status)}>
                            {order.fulfillment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Order Details - {order.order_number}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Buyer</p>
                                    <p className="font-medium">{buyer?.full_name || 'Unknown'}</p>
                                    <p className="text-xs">{buyer?.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Order Date</p>
                                    <p className="font-medium">
                                      {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Payment Status</p>
                                    <Badge className={getStatusColor(order.payment_status)}>
                                      {order.payment_status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Cashfree Order ID</p>
                                    <p className="font-mono text-xs">{order.cashfree_order_id || '-'}</p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-muted-foreground mb-2">Order Items</p>
                                  <div className="space-y-2">
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
                                          <div className="flex gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              {item.license_type}
                                            </Badge>
                                            {item.is_exclusive && (
                                              <Badge className="bg-amber-500 text-xs">Exclusive</Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right text-sm">
                                          <p className="font-medium">₹{Number(item.price).toFixed(2)}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Seller: ₹{Number(item.seller_amount).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="border-t pt-4">
                                  <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>₹{Number(order.subtotal).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Platform Fee</span>
                                    <span>₹{Number(order.platform_fee).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold mt-2">
                                    <span>Total</span>
                                    <span>₹{Number(order.total_amount).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No orders found</p>
              <p className="text-muted-foreground">Orders will appear here when buyers make purchases.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
