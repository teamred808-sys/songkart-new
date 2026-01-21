import { useState } from "react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX, 
  AlertTriangle, Clock, CheckCircle, XCircle,
  FileText, Bell, HelpCircle, TrendingUp
} from "lucide-react";
import { useSellerHealth, useSellerStrikes, useStrikeNotifications, useSubmitAppeal, useMarkNotificationRead } from "@/hooks/useStrikeSystem";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

export default function AccountHealth() {
  const { data: health, isLoading: healthLoading } = useSellerHealth();
  const { data: strikes = [], isLoading: strikesLoading } = useSellerStrikes();
  const { data: notifications = [] } = useStrikeNotifications();
  const { mutate: submitAppeal, isPending: appealPending } = useSubmitAppeal();
  const { mutate: markRead } = useMarkNotificationRead();

  const [appealStrikeId, setAppealStrikeId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState("");

  const score = health?.health_score ?? 100;
  const isLoading = healthLoading || strikesLoading;

  const getHealthConfig = (score: number) => {
    if (score >= 90) {
      return {
        icon: ShieldCheck,
        label: 'Excellent',
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        ringColor: 'ring-green-200',
      };
    }
    if (score >= 70) {
      return {
        icon: Shield,
        label: 'Good',
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
      };
    }
    if (score >= 50) {
      return {
        icon: ShieldAlert,
        label: 'Caution',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        ringColor: 'ring-orange-200',
      };
    }
    return {
      icon: ShieldX,
      label: 'Critical',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      ringColor: 'ring-red-200',
    };
  };

  const config = getHealthConfig(score);
  const Icon = config.icon;

  const handleSubmitAppeal = () => {
    if (!appealStrikeId || !appealReason.trim()) return;
    submitAppeal({ strike_id: appealStrikeId, reason: appealReason }, {
      onSuccess: () => {
        setAppealStrikeId(null);
        setAppealReason("");
      }
    });
  };

  const activeStrikes = strikes.filter(s => s.status === 'active');
  const unreadNotifications = notifications.filter(n => !n.is_read);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Account Health</h1>
            <p className="text-muted-foreground">
              Monitor your account standing and strike history
            </p>
          </div>
          <HelpTooltip content="Your account health score reflects your compliance with platform guidelines. Higher scores indicate better standing and unlock more features." />
        </div>

        {/* Frozen/Deactivated Alert */}
        {(health?.is_frozen || health?.is_deactivated) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>
              {health.is_deactivated ? 'Account Deactivated' : 'Account Frozen'}
            </AlertTitle>
            <AlertDescription>
              {health.is_deactivated 
                ? 'Your account has been permanently deactivated due to copyright violations.'
                : `Your account is frozen until ${health.frozen_until ? format(new Date(health.frozen_until), 'PPP') : 'further notice'}.`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Health Score Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Circular Progress */}
              <div className="relative">
                <div className={cn(
                  "w-40 h-40 rounded-full ring-8 flex items-center justify-center",
                  config.ringColor
                )}>
                  <div 
                    className="w-32 h-32 rounded-full flex flex-col items-center justify-center bg-card border-4"
                    style={{ 
                      borderColor: `hsl(var(--${score >= 70 ? 'primary' : score >= 50 ? 'warning' : 'destructive'}))` 
                    }}
                  >
                    <span className="text-4xl font-bold">{score}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className={cn(
                  "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-sm font-medium",
                  config.bgColor
                )}>
                  {config.label}
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{health?.community_strikes_active || 0}</div>
                  <div className="text-sm text-muted-foreground">Community Strikes</div>
                  <div className="text-xs text-muted-foreground">(max 3)</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{health?.copyright_strikes_active || 0}</div>
                  <div className="text-sm text-muted-foreground">Copyright Strikes</div>
                  <div className="text-xs text-muted-foreground">(max 3)</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">
                    {strikes.filter(s => s.status === 'reversed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Reversed</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">
                    {strikes.filter(s => s.status === 'expired').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Expired</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="strikes">
          <TabsList>
            <TabsTrigger value="strikes" className="gap-2">
              <FileText className="h-4 w-4" />
              Strike History
              {activeStrikes.length > 0 && (
                <Badge variant="destructive" className="ml-1">{activeStrikes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadNotifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tips" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Improve Health
            </TabsTrigger>
          </TabsList>

          {/* Strikes Tab */}
          <TabsContent value="strikes" className="space-y-4">
            {strikes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">No Strikes</h3>
                  <p className="text-muted-foreground">You have a clean record. Keep up the good work!</p>
                </CardContent>
              </Card>
            ) : (
              strikes.map((strike) => (
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
                          <Badge variant="outline">
                            Appeal: {strike.appeal_status}
                          </Badge>
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
                      <p className="text-sm text-muted-foreground mb-4">{strike.details}</p>
                    )}
                    
                    {strike.expires_at && strike.status === 'active' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="h-4 w-4" />
                        Expires {formatDistanceToNow(new Date(strike.expires_at), { addSuffix: true })}
                      </div>
                    )}

                    {strike.reversal_reason && (
                      <Alert className="mb-4">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTitle>Strike Reversed</AlertTitle>
                        <AlertDescription>{strike.reversal_reason}</AlertDescription>
                      </Alert>
                    )}

                    {/* Appeal Button */}
                    {strike.status === 'active' && !strike.appeal_status && (
                      <Dialog open={appealStrikeId === strike.id} onOpenChange={(open) => !open && setAppealStrikeId(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setAppealStrikeId(strike.id)}>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Appeal Strike
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Appeal Strike</DialogTitle>
                            <DialogDescription>
                              Explain why you believe this strike was issued in error. Our team will review your appeal.
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="Provide detailed reasons for your appeal..."
                            value={appealReason}
                            onChange={(e) => setAppealReason(e.target.value)}
                            rows={5}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAppealStrikeId(null)}>Cancel</Button>
                            <Button onClick={handleSubmitAppeal} disabled={appealPending || !appealReason.trim()}>
                              {appealPending ? 'Submitting...' : 'Submit Appeal'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {strike.appeal_status === 'pending' && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Clock className="h-4 w-4" />
                        Appeal under review
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Notifications</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={cn(!notification.is_read && "border-primary/50 bg-primary/5")}
                  onClick={() => !notification.is_read && markRead(notification.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        {notification.title}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <CardTitle>How to Improve Your Health Score</CardTitle>
                <CardDescription>
                  Follow these guidelines to maintain a healthy account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Upload Original Content Only</h4>
                    <p className="text-sm text-muted-foreground">
                      Only upload songs that you own or have rights to. Copyright strikes are the most severe and can lead to permanent deactivation.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Follow Community Guidelines</h4>
                    <p className="text-sm text-muted-foreground">
                      Avoid spam, misleading information, and inappropriate content. Community strikes result in temporary freezes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Wait for Strikes to Expire</h4>
                    <p className="text-sm text-muted-foreground">
                      Copyright strikes expire after 2 months if no new strikes are issued. Community freeze periods last 1 month and reset your community strikes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Appeal If Mistaken</h4>
                    <p className="text-sm text-muted-foreground">
                      If you believe a strike was issued in error, submit an appeal with evidence. Our team reviews all appeals.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
