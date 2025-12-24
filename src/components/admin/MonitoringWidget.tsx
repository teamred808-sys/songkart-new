import { Link } from 'react-router-dom';
import { AlertTriangle, Bug, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemHealthSummary } from '@/hooks/useSystemHealth';
import { useBugReportStats } from '@/hooks/useBugReports';

export function MonitoringWidget() {
  const { errorStats, healthStatus, criticalIssues } = useSystemHealthSummary();
  const { data: bugStats, isLoading } = useBugReportStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthColors = {
    healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  };

  return (
    <Card className={criticalIssues > 0 ? 'border-destructive/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </span>
          <Badge variant="outline" className={healthColors[healthStatus]}>
            {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalIssues > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm font-medium text-destructive">
              {criticalIssues} critical issue{criticalIssues !== 1 ? 's' : ''} require attention
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Open Bugs</span>
            </div>
            <p className="text-2xl font-bold">{bugStats?.open || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Errors Today</span>
            </div>
            <p className="text-2xl font-bold">{errorStats?.todayTotal || 0}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to="/admin/bugs">
              <Bug className="h-4 w-4 mr-2" />
              Bug Reports
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to="/admin/monitoring">
              <Activity className="h-4 w-4 mr-2" />
              Monitoring
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
