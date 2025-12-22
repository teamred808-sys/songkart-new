import { useActivityLogs } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  UserX, 
  Wallet, 
  AlertTriangle,
  Settings,
  Music
} from 'lucide-react';

const actionIcons: Record<string, React.ReactNode> = {
  approve_song: <CheckCircle className="h-4 w-4 text-green-500" />,
  reject_song: <XCircle className="h-4 w-4 text-red-500" />,
  verify_user: <UserCheck className="h-4 w-4 text-blue-500" />,
  user_suspended: <UserX className="h-4 w-4 text-orange-500" />,
  user_banned: <UserX className="h-4 w-4 text-red-500" />,
  withdrawal_approved: <Wallet className="h-4 w-4 text-green-500" />,
  withdrawal_rejected: <Wallet className="h-4 w-4 text-red-500" />,
  withdrawal_processed: <Wallet className="h-4 w-4 text-emerald-500" />,
  resolve_dispute: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  update_setting: <Settings className="h-4 w-4 text-purple-500" />,
};

const actionLabels: Record<string, string> = {
  approve_song: 'approved a song',
  reject_song: 'rejected a song',
  verify_user: 'verified a user',
  unverify_user: 'removed verification from user',
  user_active: 'activated user account',
  user_suspended: 'suspended a user',
  user_banned: 'banned a user',
  withdrawal_approved: 'approved a withdrawal',
  withdrawal_rejected: 'rejected a withdrawal',
  withdrawal_processed: 'processed a payout',
  resolve_dispute: 'resolved a dispute',
  update_setting: 'updated platform settings',
};

export function ActivityFeed() {
  const { data: logs, isLoading } = useActivityLogs({ limit: 20 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {logs && logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={log.profiles?.avatar_url || ''} />
                    <AvatarFallback>
                      {log.profiles?.full_name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {log.profiles?.full_name || 'Admin'}
                      </span>
                      {actionIcons[log.action] || <Music className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {actionLabels[log.action] || log.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {log.entity_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No activity yet</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
