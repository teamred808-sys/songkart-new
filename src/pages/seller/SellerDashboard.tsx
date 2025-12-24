import { useState } from 'react';
import { DashboardStats } from '@/components/seller/DashboardStats';
import { EarningsChart } from '@/components/seller/EarningsChart';
import { RecentSales } from '@/components/seller/RecentSales';
import { TopSongs } from '@/components/seller/TopSongs';
import { SellerTierCard } from '@/components/seller/SellerTierCard';
import { VerificationWarningBanner } from '@/components/seller/VerificationWarningBanner';
import { useSellerStats, useSellerTransactions, useSellerSongs } from '@/hooks/useSellerData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function SellerDashboard() {
  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: transactions, isLoading: txLoading } = useSellerTransactions();
  const { data: songs, isLoading: songsLoading } = useSellerSongs();
  const { profile, user } = useAuth();
  
  const [verificationPending, setVerificationPending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyClick = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email');

      if (error) {
        throw new Error(error.message || 'Failed to send verification email');
      }

      if (data?.error) {
        if (data.already_verified) {
          toast({
            title: "Already verified",
            description: "Your account is already verified. Please refresh the page.",
          });
          return;
        }
        if (data.rate_limited) {
          toast({
            title: "Please wait",
            description: data.error,
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      setVerificationPending(true);
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and click the verification link.",
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Failed to send verification email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

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

      {/* Verification Warning Banner - Only for unverified sellers */}
      {profile && !profile.is_verified && (
        <VerificationWarningBanner
          isVerified={profile.is_verified ?? false}
          uploadCount={songs?.length || 0}
          onVerifyClick={handleVerifyClick}
          verificationPending={verificationPending}
          isLoading={isVerifying}
        />
      )}

      {/* First-time seller onboarding banner */}
      {songs && songs.length === 0 && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">🎉 Welcome to SongKart!</h3>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardStats stats={stats} isLoading={statsLoading} />
        </div>
        <SellerTierCard />
      </div>

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
