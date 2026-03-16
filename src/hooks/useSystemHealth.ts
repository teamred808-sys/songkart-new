import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { AdminSection, ErrorType } from '@/lib/adminConstants';
import { apiFetch } from '@/lib/api';

export interface SystemErrorLog {
  id: string;
  error_type: ErrorType;
  error_message: string;
  error_stack: string | null;
  module: AdminSection;
  action_performed: string | null;
  user_id: string | null;
  severity: 'warning' | 'error' | 'critical';
  context: Record<string, unknown>;
  browser_info: Record<string, unknown>;
  resolved: boolean;
  linked_bug_report_id: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string } | null;
}

interface ErrorLogFilters {
  module?: AdminSection;
  severity?: 'warning' | 'error' | 'critical';
  resolved?: boolean;
  limit?: number;
}

export function useRecentErrors(filters?: ErrorLogFilters) {
  return useQuery({
    queryKey: ['admin-error-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.module) params.append('module', filters.module);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.resolved !== undefined) params.append('resolved', filters.resolved.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      else params.append('limit', '50');

      const data = await apiFetch(`/system_error_logs/full?${params.toString()}`);
      return data as SystemErrorLog[];
    },
  });
}

export function useErrorStats() {
  return useQuery({
    queryKey: ['admin-error-stats'],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get today's errors
      const todayData = await apiFetch(`/system_error_logs?created_at=gte.${today}`).catch(() => []);

      // Get last week's errors by module
      const weekData = await apiFetch(`/system_error_logs?created_at=gte.${weekAgo}`).catch(() => []);

      // Get unresolved count
      const unresolvedData = await apiFetch(`/system_error_logs?resolved=false`).catch(() => []);
      const unresolvedCount = unresolvedData?.length || 0;

      // Calculate module error counts
      const moduleErrors: Record<string, number> = {};
      weekData.forEach((e) => {
        moduleErrors[e.module] = (moduleErrors[e.module] || 0) + 1;
      });

      return {
        todayTotal: todayData.length,
        todayErrors: todayData.filter((e) => e.severity === 'error').length,
        todayWarnings: todayData.filter((e) => e.severity === 'warning').length,
        todayCritical: todayData.filter((e) => e.severity === 'critical').length,
        weekTotal: weekData.length,
        unresolved: unresolvedCount || 0,
        moduleErrors,
      };
    },
  });
}

export function useSystemHealthSummary() {
  const { data: errorStats } = useErrorStats();
  const { data: bugStats } = useQuery({
    queryKey: ['admin-bug-report-stats-summary'],
    queryFn: async () => {
      const data = await apiFetch('/admin_bug_reports?status=in.(open,in_progress)').catch(() => []);

      return {
        openBugs: data.filter((b: any) => b.status === 'open').length,
        inProgressBugs: data.filter((b: any) => b.status === 'in_progress').length,
        criticalBugs: data.filter((b: any) => b.severity === 'critical').length,
      };
    },
  });

  const criticalIssues = (errorStats?.todayCritical || 0) + (bugStats?.criticalBugs || 0);
  
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalIssues > 0) {
    healthStatus = 'critical';
  } else if ((errorStats?.todayErrors || 0) > 10 || (bugStats?.openBugs || 0) > 5) {
    healthStatus = 'warning';
  }

  return {
    errorStats,
    bugStats,
    healthStatus,
    criticalIssues,
  };
}

export function useResolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (errorId: string) => {
      const data = await apiFetch(`/system_error_logs/${errorId}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: true })
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-error-stats'] });
      toast({ title: 'Error marked as resolved' });
    },
    onError: (error) => {
      toast({ title: 'Failed to resolve error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useLinkErrorToBug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ errorId, bugReportId }: { errorId: string; bugReportId: string }) => {
      const data = await apiFetch(`/system_error_logs/${errorId}`, {
        method: 'PATCH',
        body: JSON.stringify({ linked_bug_report_id: bugReportId })
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-error-logs'] });
      toast({ title: 'Error linked to bug report' });
    },
    onError: (error) => {
      toast({ title: 'Failed to link error', description: error.message, variant: 'destructive' });
    },
  });
}
