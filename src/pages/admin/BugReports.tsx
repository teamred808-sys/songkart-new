import { useState } from 'react';
import { format } from 'date-fns';
import { Bug, Filter, Plus, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBugReports, useBugReportStats, useUpdateBugReport } from '@/hooks/useBugReports';
import { BugReportForm } from '@/components/admin/BugReportForm';
import { ADMIN_SECTIONS, BUG_SEVERITIES, BUG_STATUSES } from '@/lib/adminConstants';
import type { BugSeverity, BugStatus, AdminSection } from '@/lib/adminConstants';

export default function BugReports() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BugStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data: bugs, isLoading } = useBugReports({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    search: search || undefined,
  });
  const { data: stats } = useBugReportStats();
  const updateBugReport = useUpdateBugReport();

  const getSeverityBadge = (severity: string) => {
    const config = BUG_SEVERITIES.find(s => s.value === severity);
    return <Badge variant="outline" className={config?.color}>{config?.label || severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = BUG_STATUSES.find(s => s.value === status);
    return <Badge variant="outline" className={config?.color}>{config?.label || status}</Badge>;
  };

  const getSectionLabel = (section: string) => {
    return ADMIN_SECTIONS.find(s => s.value === section)?.label || section;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8" /> Bug Reports
          </h1>
          <p className="text-muted-foreground">Track and manage reported issues</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{stats?.total || 0}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card className="border-blue-500/30"><CardContent className="pt-4"><p className="text-2xl font-bold text-blue-500">{stats?.open || 0}</p><p className="text-xs text-muted-foreground">Open</p></CardContent></Card>
        <Card className="border-amber-500/30"><CardContent className="pt-4"><p className="text-2xl font-bold text-amber-500">{stats?.inProgress || 0}</p><p className="text-xs text-muted-foreground">In Progress</p></CardContent></Card>
        <Card className="border-red-500/30"><CardContent className="pt-4"><p className="text-2xl font-bold text-red-500">{stats?.critical || 0}</p><p className="text-xs text-muted-foreground">Critical</p></CardContent></Card>
        <Card className="border-emerald-500/30"><CardContent className="pt-4"><p className="text-2xl font-bold text-emerald-500">{stats?.resolved || 0}</p><p className="text-xs text-muted-foreground">Resolved</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BugStatus | 'all')}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {BUG_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as BugSeverity | 'all')}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {BUG_SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bug List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : bugs?.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No bug reports found</CardContent></Card>
        ) : (
          bugs?.map((bug) => (
            <Card key={bug.id} className={bug.severity === 'critical' ? 'border-red-500/30' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSeverityBadge(bug.severity)}
                      {getStatusBadge(bug.status)}
                      <span className="text-xs text-muted-foreground">{getSectionLabel(bug.affected_section)}</span>
                    </div>
                    <h3 className="font-semibold">{bug.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{bug.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Reported by {bug.reporter?.full_name || bug.reporter?.email || 'Unknown'} • {format(new Date(bug.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Select value={bug.status} onValueChange={(status) => updateBugReport.mutate({ id: bug.id, status: status as BugStatus })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUG_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BugReportForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
