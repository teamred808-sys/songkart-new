import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUserDetail, useUpdateUserStatus, useVerifyUser } from '@/hooks/useAdminData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AdminHealthMeter } from '@/components/admin/AdminHealthMeter';
import { 
  ArrowLeft, CheckCircle, XCircle, Ban, UserX, Shield, 
  Wallet, Music, ShoppingCart, AlertTriangle, Clock, 
  Calendar, Mail, Globe, FileText, RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRestoreAccount } from '@/hooks/useStrikeSystem';

// Hook to fetch health data for a specific user
function useUserHealth(userId: string) {
  return useQuery({
    queryKey: ['admin-user-health', userId],
    queryFn: async () => {
      const [healthResult, strikesResult] = await Promise.all([
        supabase.from('seller_account_health').select('*').eq('seller_id', userId).maybeSingle(),
        supabase.from('seller_strikes').select('*, song:songs(title)').eq('seller_id', userId).order('created_at', { ascending: false })
      ]);
      
      return {
        health: healthResult.data,
        strikes: strikesResult.data || []
      };
    },
    enabled: !!userId
  });
}

// Hook to fetch recent activity for a user
function useUserActivity(userId: string) {
  return useQuery({
    queryKey: ['admin-user-activity', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const { data: userData, isLoading } = useUserDetail(userId || '');
  const { data: healthData, isLoading: healthLoading } = useUserHealth(userId || '');
  const { data: activityData = [] } = useUserActivity(userId || '');
  
  const updateStatus = useUpdateUserStatus();
  const verifyUser = useVerifyUser();
  const restoreAccount = useRestoreAccount();

  if (isLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!userData?.profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">User not found</h2>
        <Button variant="outline" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
      </div>
    );
  }

  const { profile, roles, wallet, songStats } = userData;
  const isSeller = roles.includes('seller');
  const health = healthData?.health;
  const strikes = healthData?.strikes || [];
  const activeStrikes = strikes.filter((s: any) => s.status === 'active');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case 'suspended': return <Badge className="bg-orange-500/10 text-orange-500">Suspended</Badge>;
      case 'banned': return <Badge className="bg-red-500/10 text-red-500">Banned</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">User Details</h1>
          <p className="text-muted-foreground">View and manage user account</p>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{profile.full_name || 'Unknown'}</h2>
                  {profile.is_verified && (
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role: string) => (
                    <Badge key={role} variant="outline" className="capitalize">{role}</Badge>
                  ))}
                  {statusBadge(profile.account_status || 'active')}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex-1 flex flex-wrap gap-2 md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyUser.mutate({ userId: profile.id, verified: !profile.is_verified })}
              >
                {profile.is_verified ? (
                  <><XCircle className="mr-2 h-4 w-4" /> Remove Verification</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> Verify User</>
                )}
              </Button>
              
              {profile.account_status !== 'suspended' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus.mutate({ userId: profile.id, status: 'suspended' })}
                >
                  <UserX className="mr-2 h-4 w-4" /> Suspend
                </Button>
              )}
              
              {profile.account_status !== 'banned' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => updateStatus.mutate({ userId: profile.id, status: 'banned' })}
                >
                  <Ban className="mr-2 h-4 w-4" /> Ban
                </Button>
              )}
              
              {profile.account_status !== 'active' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => updateStatus.mutate({ userId: profile.id, status: 'active' })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Activate
                </Button>
              )}

              {isSeller && (health?.is_frozen || health?.is_deactivated) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreAccount.mutate({ seller_id: profile.id, notes: 'Admin manual restore' })}
                >
                  <Shield className="mr-2 h-4 w-4" /> Restore Account
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frozen/Deactivated Alert */}
      {isSeller && (health?.is_frozen || health?.is_deactivated) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>
            {health.is_deactivated ? 'Account Deactivated' : 'Account Frozen'}
          </AlertTitle>
          <AlertDescription>
            {health.is_deactivated
              ? 'This account has been permanently deactivated due to copyright violations.'
              : `Account is frozen until ${health.frozen_until ? format(new Date(health.frozen_until), 'PPP') : 'further notice'}.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Meter (Sellers Only) */}
        {isSeller && (
          <Card className="md:row-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" /> Account Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminHealthMeter
                score={health?.health_score ?? 100}
                communityStrikes={health?.community_strikes_active || 0}
                copyrightStrikes={health?.copyright_strikes_active || 0}
                isFrozen={health?.is_frozen || false}
                isDeactivated={health?.is_deactivated || false}
              />
            </CardContent>
          </Card>
        )}

        {/* Profile Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Joined
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(profile.created_at), 'MMM dd, yyyy')}</div>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</p>
          </CardContent>
        </Card>

        {/* KYC Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={cn(
              profile.kyc_status === 'verified' && "bg-green-500/10 text-green-500",
              profile.kyc_status === 'pending' && "bg-yellow-500/10 text-yellow-500",
              profile.kyc_status === 'rejected' && "bg-red-500/10 text-red-500"
            )}>
              {profile.kyc_status || 'Not Started'}
            </Badge>
          </CardContent>
        </Card>

        {/* Wallet (Sellers Only) */}
        {isSeller && wallet && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Number(wallet.available_balance || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Pending: ₹{Number(wallet.pending_balance || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        )}

        {/* Song Stats (Sellers Only) */}
        {isSeller && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Music className="h-4 w-4" /> Songs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{songStats.total}</div>
              <div className="flex gap-2 text-xs">
                <span className="text-green-500">{songStats.approved} approved</span>
                <span className="text-yellow-500">{songStats.pending} pending</span>
                <span className="text-red-500">{songStats.rejected} rejected</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Spent (Buyers) */}
        {!isSeller && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Number(userData.totalSpent || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs for Strike History & Activity */}
      {isSeller && (
        <Tabs defaultValue="strikes">
          <TabsList>
            <TabsTrigger value="strikes" className="gap-2">
              <FileText className="h-4 w-4" />
              Strike History
              {activeStrikes.length > 0 && (
                <Badge variant="destructive" className="ml-1">{activeStrikes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </TabsTrigger>
          </TabsList>

          {/* Strikes Tab */}
          <TabsContent value="strikes" className="space-y-4">
            {strikes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">No Strikes</h3>
                  <p className="text-muted-foreground">This user has a clean record.</p>
                </CardContent>
              </Card>
            ) : (
              strikes.map((strike: any) => (
                <Card key={strike.id} className={cn(
                  "border-l-4",
                  strike.status === 'active' && strike.strike_type === 'copyright' && "border-l-red-500",
                  strike.status === 'active' && strike.strike_type === 'community' && "border-l-orange-500",
                  strike.status === 'expired' && "border-l-muted",
                  strike.status === 'reversed' && "border-l-green-500",
                  strike.status === 'appealed' && "border-l-blue-500"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={strike.strike_type === 'copyright' ? 'destructive' : 'secondary'}>
                          {strike.strike_type === 'copyright' ? 'Copyright' : 'Community'}
                        </Badge>
                        <Badge variant={
                          strike.status === 'active' ? 'default' :
                          strike.status === 'reversed' ? 'outline' :
                          strike.status === 'appealed' ? 'secondary' : 'outline'
                        }>
                          {strike.status.charAt(0).toUpperCase() + strike.status.slice(1)}
                        </Badge>
                        {strike.appeal_status && (
                          <Badge variant="outline">Appeal: {strike.appeal_status}</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(strike.created_at), 'PPP')}
                      </span>
                    </div>
                    <CardTitle className="text-base">{strike.reason}</CardTitle>
                    {strike.song && (
                      <CardDescription>Song: {strike.song.title}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {strike.details && (
                      <p className="text-sm text-muted-foreground mb-2">{strike.details}</p>
                    )}
                    {strike.expires_at && strike.status === 'active' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Expires {formatDistanceToNow(new Date(strike.expires_at), { addSuffix: true })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
            
            <div className="flex justify-end">
              <Button variant="outline" asChild>
                <Link to={`/admin/strikes?seller=${userId}`}>
                  Manage Strikes →
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {activityData.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Activity</h3>
                  <p className="text-muted-foreground">No recent activity recorded.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {activityData.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium capitalize">{log.action?.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.entity_type} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Bio & Profile Details */}
      {profile.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{profile.bio}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
