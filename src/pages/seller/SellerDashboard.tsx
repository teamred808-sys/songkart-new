import { DashboardStats } from '@/components/seller/DashboardStats';
import { EarningsChart } from '@/components/seller/EarningsChart';
import { RecentSales } from '@/components/seller/RecentSales';
import { TopSongs } from '@/components/seller/TopSongs';
import { useSellerStats, useSellerTransactions, useSellerSongs } from '@/hooks/useSellerData';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SellerDashboard() {
  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: transactions, isLoading: txLoading } = useSellerTransactions();
  const { data: songs, isLoading: songsLoading } = useSellerSongs();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your performance overview.</p>
        </div>
        <Button asChild className="btn-glow">
          <Link to="/seller/songs/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Song
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <DashboardStats stats={stats} isLoading={statsLoading} />

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EarningsChart data={stats?.monthlyEarnings} isLoading={statsLoading} />
        <RecentSales transactions={transactions} isLoading={txLoading} />
      </div>

      {/* Top Songs */}
      <TopSongs songs={songs} isLoading={songsLoading} />
    </div>
  );
}
