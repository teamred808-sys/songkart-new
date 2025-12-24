import { 
  Upload, 
  CheckCircle, 
  ShoppingCart, 
  Wallet, 
  Clock,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePlatformSettings } from '@/hooks/useAdminData';

interface StatsData {
  totalUploads: number;
  approvedSongs: number;
  totalSales: number;
  totalEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
}

interface DashboardStatsProps {
  stats: StatsData | null | undefined;
  isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const { formatPrice, currencySymbol } = useCurrency();
  const { data: platformSettings } = usePlatformSettings();

  const availableBalance = stats?.availableBalance || 0;
  const withdrawalThreshold = platformSettings?.min_withdrawal?.amount || 500;
  const progressToWithdrawal = Math.min((availableBalance / withdrawalThreshold) * 100, 100);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Stats - Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Earnings */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 border-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Earnings</p>
                <p className="text-3xl lg:text-4xl font-bold font-display text-emerald-500 mt-2">
                  {formatPrice(stats?.totalEarnings || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>Lifetime earnings</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-emerald-500">{currencySymbol}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Balance with Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 border-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
                <p className="text-3xl lg:text-4xl font-bold font-display text-primary mt-2">
                  {formatPrice(availableBalance)}
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Withdrawal threshold</span>
                    <span className="font-medium">{currencySymbol}{withdrawalThreshold}</span>
                  </div>
                  <Progress value={progressToWithdrawal} className="h-2" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats - Smaller Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border hover:border-primary/30 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Uploads</span>
              <Upload className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold font-display">
              {stats?.totalUploads || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-emerald-500/30 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Approved</span>
              <CheckCircle className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold font-display text-emerald-500">
              {stats?.approvedSongs || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-accent/30 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total Sales</span>
              <ShoppingCart className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold font-display">
              {stats?.totalSales || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-amber-500/30 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Pending</span>
              <Clock className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold font-display text-amber-500">
              {formatPrice(stats?.pendingWithdrawals || 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
