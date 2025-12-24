import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { AdminSection, ErrorType } from '@/lib/adminConstants';

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
      let query = supabase
        .from('system_error_logs')
        .select(`
          *,
          user:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (filters?.module) {
        query = query.eq('module', filters.module);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }

      const { data, error } = await query;
      if (error) throw error;
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
      const { data: todayData, error: todayError } = await supabase
        .from('system_error_logs')
        .select('severity')
        .gte('created_at', today);

      if (todayError) throw todayError;

      // Get last week's errors by module
      const { data: weekData, error: weekError } = await supabase
        .from('system_error_logs')
        .select('module, severity')
        .gte('created_at', weekAgo);

      if (weekError) throw weekError;

      // Get unresolved count
      const { count: unresolvedCount, error: unresolvedError } = await supabase
        .from('system_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      if (unresolvedError) throw unresolvedError;

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
      const { data, error } = await supabase
        .from('admin_bug_reports')
        .select('status, severity')
        .in('status', ['open', 'in_progress']);

      if (error) throw error;

      return {
        openBugs: data.filter((b) => b.status === 'open').length,
        inProgressBugs: data.filter((b) => b.status === 'in_progress').length,
        criticalBugs: data.filter((b) => b.severity === 'critical').length,
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
      const { data, error } = await supabase
        .from('system_error_logs')
        .update({ resolved: true })
        .eq('id', errorId)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('system_error_logs')
        .update({ linked_bug_report_id: bugReportId })
        .eq('id', errorId)
        .select()
        .single();

      if (error) throw error;
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
