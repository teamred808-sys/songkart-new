import { 
  Upload, 
  CheckCircle, 
  ShoppingCart, 
  DollarSign, 
  Wallet, 
  Clock 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

const statCards = [
  { 
    key: 'totalUploads', 
    label: 'Total Uploads', 
    icon: Upload, 
    format: 'number',
    color: 'text-primary'
  },
  { 
    key: 'approvedSongs', 
    label: 'Approved Songs', 
    icon: CheckCircle, 
    format: 'number',
    color: 'text-success'
  },
  { 
    key: 'totalSales', 
    label: 'Total Sales', 
    icon: ShoppingCart, 
    format: 'number',
    color: 'text-accent'
  },
  { 
    key: 'totalEarnings', 
    label: 'Total Earnings', 
    icon: DollarSign, 
    format: 'currency',
    color: 'text-success'
  },
  { 
    key: 'availableBalance', 
    label: 'Available Balance', 
    icon: Wallet, 
    format: 'currency',
    color: 'text-primary'
  },
  { 
    key: 'pendingWithdrawals', 
    label: 'Pending Withdrawals', 
    icon: Clock, 
    format: 'currency',
    color: 'text-warning'
  },
];

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    return value.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.key} className="bg-card border-border">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key as keyof StatsData] || 0;
        
        return (
          <Card key={card.key} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <Icon className={cn("h-4 w-4", card.color)} />
              </div>
              <p className="text-2xl font-bold font-display">
                {formatValue(value, card.format)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
