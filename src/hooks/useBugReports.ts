import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { AdminSection, BugSeverity, BugStatus } from '@/lib/adminConstants';
import type { Json } from '@/integrations/supabase/types';

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
  screenshots: Json;
  logs: Json;
  internal_notes: Json;
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
      let query = supabase
        .from('admin_bug_reports')
        .select(`
          *,
          reporter:reporter_id(full_name, email),
          assignee:assignee_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.section) {
        query = query.eq('affected_section', filters.section);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BugReport[];
    },
  });
}

export function useBugReportStats() {
  return useQuery({
    queryKey: ['admin-bug-report-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_bug_reports')
        .select('status, severity');

      if (error) throw error;

      const stats = {
        total: data.length,
        open: data.filter((b) => b.status === 'open').length,
        inProgress: data.filter((b) => b.status === 'in_progress').length,
        resolved: data.filter((b) => b.status === 'resolved').length,
        closed: data.filter((b) => b.status === 'closed').length,
        critical: data.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'closed').length,
        high: data.filter((b) => b.severity === 'high' && b.status !== 'resolved' && b.status !== 'closed').length,
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('admin_bug_reports')
        .insert([{
          title: input.title,
          description: input.description,
          affected_section: input.affected_section,
          severity: input.severity,
          reporter_id: user?.id,
          screenshots: (input.screenshots || []) as unknown as Json,
          logs: (input.logs || []) as unknown as Json,
        }])
        .select()
        .single();

      if (error) throw error;
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

      const { data, error } = await supabase
        .from('admin_bug_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
      const { data: current, error: fetchError } = await supabase
        .from('admin_bug_reports')
        .select('internal_notes')
        .eq('id', input.bugReportId)
        .single();

      if (fetchError) throw fetchError;

      const currentNotes = (current?.internal_notes as unknown as InternalNote[]) || [];
      const newNote: InternalNote = {
        id: crypto.randomUUID(),
        text: input.text,
        author_id: input.authorId,
        author_name: input.authorName,
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [...currentNotes, newNote] as unknown as Json;

      const { data, error } = await supabase
        .from('admin_bug_reports')
        .update({ internal_notes: updatedNotes })
        .eq('id', input.bugReportId)
        .select()
        .single();

      if (error) throw error;
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
export function parseInternalNotes(notes: Json): InternalNote[] {
  if (!notes || !Array.isArray(notes)) return [];
  return notes as unknown as InternalNote[];
}
