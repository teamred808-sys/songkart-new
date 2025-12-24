import { format } from 'date-fns';
import { Activity, AlertTriangle, Bug, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentErrors, useErrorStats, useResolveError } from '@/hooks/useSystemHealth';
import { useBugReportStats } from '@/hooks/useBugReports';
import { ADMIN_SECTIONS } from '@/lib/adminConstants';

export default function SystemMonitoring() {
  const { data: errors, isLoading: errorsLoading } = useRecentErrors({ limit: 20 });
  const { data: errorStats, isLoading: statsLoading } = useErrorStats();
  const { data: bugStats } = useBugReportStats();
  const resolveError = useResolveError();

  const getSectionLabel = (section: string) => ADMIN_SECTIONS.find(s => s.value === section)?.label || section;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'error': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" /> System Monitoring
        </h1>
        <p className="text-muted-foreground">Monitor errors, failures, and system health</p>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={errorStats?.todayCritical ? 'border-red-500/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${errorStats?.todayCritical ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">Critical Today</span>
            </div>
            <p className="text-2xl font-bold">{statsLoading ? '-' : errorStats?.todayCritical || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Errors Today</span>
            </div>
            <p className="text-2xl font-bold">{statsLoading ? '-' : errorStats?.todayErrors || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Open Bugs</span>
            </div>
            <p className="text-2xl font-bold">{bugStats?.open || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Unresolved</span>
            </div>
            <p className="text-2xl font-bold">{statsLoading ? '-' : errorStats?.unresolved || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Errors by Module */}
      {errorStats?.moduleErrors && Object.keys(errorStats.moduleErrors).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Errors by Module (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(errorStats.moduleErrors).sort((a, b) => b[1] - a[1]).map(([module, count]) => (
                <Badge key={module} variant="outline" className="text-sm">
                  {getSectionLabel(module)}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent System Errors</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {errorsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : errors?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No errors recorded</p>
          ) : (
            errors?.map((error) => (
              <div key={error.id} className={`p-3 rounded-lg border ${error.resolved ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getSeverityColor(error.severity)}>{error.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{getSectionLabel(error.module)}</span>
                      {error.resolved && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Resolved</Badge>}
                    </div>
                    <p className="font-medium text-sm truncate">{error.error_message}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(error.created_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                  {!error.resolved && (
                    <Button size="sm" variant="ghost" onClick={() => resolveError.mutate(error.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
