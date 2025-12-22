import { useState } from 'react';
import { useSellerTransactions } from '@/hooks/useSellerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  completed: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  failed: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function SalesOrders() {
  const { data: transactions, isLoading } = useSellerTransactions();
  const [search, setSearch] = useState('');

  const filteredTx = transactions?.filter(tx =>
    tx.song?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = transactions?.reduce((sum, tx) => sum + Number(tx.seller_amount), 0) || 0;
  const totalCommission = transactions?.reduce((sum, tx) => sum + Number(tx.commission_amount), 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">Sales & Orders</h1>
        <p className="text-muted-foreground">View all your completed transactions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Orders</span>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-display mt-1">{transactions?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Earnings</span>
              <span className="text-success text-xs">Net</span>
            </div>
            <p className="text-2xl font-bold font-display mt-1 text-success">
              ${totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Fees</span>
              <span className="text-muted-foreground text-xs">Commission</span>
            </div>
            <p className="text-2xl font-bold font-display mt-1">
              ${totalCommission.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by song title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Song</TableHead>
              <TableHead>License</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Your Earning</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredTx?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No sales yet</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTx?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(tx.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage 
                          src={tx.song?.cover_image_url || ''} 
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-md bg-muted text-xs">
                          {tx.song?.title?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-[150px]">
                        {tx.song?.title || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {tx.license_tier?.license_type || 'Standard'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(tx.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    -${Number(tx.commission_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    +${Number(tx.seller_amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", statusColors[tx.payment_status || 'pending'])}
                    >
                      {tx.payment_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tx.license_pdf_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={tx.license_pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
