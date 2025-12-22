import { DashboardStats } from '@/components/seller/DashboardStats';
import { EarningsChart } from '@/components/seller/EarningsChart';
import { RecentSales } from '@/components/seller/RecentSales';
import { TopSongs } from '@/components/seller/TopSongs';
import { useSellerStats, useSellerTransactions, useSellerSongs } from '@/hooks/useSellerData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SellerDashboard() {
  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: transactions, isLoading: txLoading } = useSellerTransactions();
  const { data: songs, isLoading: songsLoading } = useSellerSongs();
  const { profile } = useAuth();

  // Calculate pending songs
  const pendingSongs = songs?.filter(s => s.status === 'pending').length || 0;
  const approvedSongs = songs?.filter(s => s.status === 'approved').length || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 🎵
          </h1>
          <p className="text-muted-foreground">Here's your performance overview.</p>
        </div>
        <Button asChild className="btn-glow">
          <Link to="/seller/songs/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Song
          </Link>
        </Button>
      </div>

      {/* First-time seller onboarding banner */}
      {songs && songs.length === 0 && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">🎉 Welcome to LyricLounge!</h3>
                <p className="text-muted-foreground text-sm">
                  Start by uploading your first song. Complete your profile to build trust with buyers.
                </p>
              </div>
              <Button asChild>
                <Link to="/seller/songs/upload">
                  Upload Your First Song
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Actions Alert */}
      {pendingSongs > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {pendingSongs} song{pendingSongs > 1 ? 's' : ''} pending approval
              </p>
              <p className="text-sm text-muted-foreground">
                Your songs are being reviewed by our team
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/seller/songs">View Songs</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
