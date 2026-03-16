import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { AdminSection, BugSeverity, BugStatus } from '@/lib/adminConstants';
import { apiFetch } from '@/lib/api';

interface InternalNote {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  affected_section: string;
  severity: string;
  status: string;
  reporter_id: string | null;
  assignee_id: string | null;
  screenshots: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  internal_notes: Record<string, unknown>[];
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  reporter?: { full_name: string | null; email: string } | null;
  assignee?: { full_name: string | null; email: string } | null;
}

interface BugReportFilters {
  status?: BugStatus;
  severity?: BugSeverity;
  section?: AdminSection;
  search?: string;
}

export function useBugReports(filters?: BugReportFilters) {
  return useQuery({
    queryKey: ['admin-bug-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.section) params.append('affected_section', filters.section);
      if (filters?.search) params.append('search', filters.search);

      const data = await apiFetch(`/admin_bug_reports?${params.toString()}`);
      return data as unknown as BugReport[];
    },
  });
}

export function useBugReportStats() {
  return useQuery({
    queryKey: ['admin-bug-report-stats'],
    queryFn: async () => {
      const data = await apiFetch('/admin_bug_reports');

      const stats = {
        total: data.length,
        open: data.filter((b: any) => b.status === 'open').length,
        inProgress: data.filter((b: any) => b.status === 'in_progress').length,
        resolved: data.filter((b: any) => b.status === 'resolved').length,
        closed: data.filter((b: any) => b.status === 'closed').length,
        critical: data.filter((b: any) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'closed').length,
        high: data.filter((b: any) => b.severity === 'high' && b.status !== 'resolved' && b.status !== 'closed').length,
      };

      return stats;
    },
  });
}

interface CreateBugReportInput {
  title: string;
  description: string;
  affected_section: AdminSection;
  severity: BugSeverity;
  screenshots?: string[];
  logs?: Record<string, unknown>[];
}

export function useCreateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBugReportInput) => {
      const { user } = await apiFetch('/auth/me').catch(() => ({ user: null }));
      
      const data = await apiFetch('/admin_bug_reports', {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          affected_section: input.affected_section,
          severity: input.severity,
          reporter_id: user?.id,
          screenshots: (input.screenshots || []),
          logs: (input.logs || []),
        })
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bug-report-stats'] });
      toast({ title: 'Bug report submitted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to submit bug report', description: error.message, variant: 'destructive' });
    },
  });
}

interface UpdateBugReportInput {
  id: string;
  status?: BugStatus;
  severity?: BugSeverity;
  assignee_id?: string | null;
  resolution_notes?: string;
}

export function useUpdateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBugReportInput) => {
      const { id, ...updates } = input;
      
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const data = await apiFetch(`/admin_bug_reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bug-report-stats'] });
      toast({ title: 'Bug report updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update bug report', description: error.message, variant: 'destructive' });
    },
  });
}

interface AddNoteInput {
  bugReportId: string;
  text: string;
  authorId: string;
  authorName: string;
}

export function useAddBugReportNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddNoteInput) => {
      // First get current notes
      const current = await apiFetch(`/admin_bug_reports/${input.bugReportId}`);

      const currentNotes = (current?.internal_notes as unknown as InternalNote[]) || [];
      const newNote: InternalNote = {
        id: crypto.randomUUID(),
        text: input.text,
        author_id: input.authorId,
        author_name: input.authorName,
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [...currentNotes, newNote];

      const data = await apiFetch(`/admin_bug_reports/${input.bugReportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ internal_notes: updatedNotes })
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bug-reports'] });
      toast({ title: 'Note added' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
    },
  });
}

// Helper to parse internal notes from JSON
export function parseInternalNotes(notes: any): InternalNote[] {
  if (!notes || !Array.isArray(notes)) return [];
  return notes as unknown as InternalNote[];
}
