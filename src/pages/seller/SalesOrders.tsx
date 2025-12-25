import { useState } from 'react';
import { useSellerTransactions } from '@/hooks/useSellerData';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Download, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  ArrowUpRight,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function SalesOrders() {
  const { data: transactions, isLoading } = useSellerTransactions();
  const [search, setSearch] = useState('');
  const { formatPrice } = useCurrency();

  const filteredTx = transactions?.filter(tx =>
    tx.song?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = transactions?.reduce((sum, tx) => sum + Number(tx.seller_amount), 0) || 0;
  const totalCommission = transactions?.reduce((sum, tx) => sum + Number(tx.commission_amount), 0) || 0;
  const totalOrders = transactions?.length || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Sales & Orders</h1>
          <p className="text-muted-foreground">View all your completed transactions.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Total Orders</span>
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold font-display">{totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">All time sales</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Your Earnings</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-display text-emerald-500">
                {formatPrice(totalRevenue)}
              </p>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Net after fees
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-muted-foreground/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Platform Fees</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold font-display text-muted-foreground">
                {formatPrice(totalCommission)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">15% commission</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-accent/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Avg. Order Value</span>
                <DollarSign className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold font-display">
                {formatPrice(avgOrderValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
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
        <Card>
          <div className="rounded-xl border border-border overflow-hidden">
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
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-muted">
                          <Music className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">No sales yet</p>
                          <p className="text-sm text-muted-foreground">
                            When you make your first sale, it will appear here
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTx?.map((tx) => (
                    <TableRow key={tx.id} className="group">
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground text-left">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(tx.created_at), 'PPpp')}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-lg">
                            <AvatarImage 
                              src={tx.song?.cover_image_url || ''} 
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-lg bg-muted text-xs">
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
                      <TableCell className="text-right font-medium">
                        ₹{Number(tx.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <span className="text-destructive">-₹{Number(tx.commission_amount).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-500">+₹{Number(tx.seller_amount).toFixed(2)}</span>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                asChild
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <a href={tx.license_pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download license PDF</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
