import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCategories() {
  return useQuery({
    queryKey: ['cms-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      const { data, error } = await supabase
        .from('cms_categories')
        .insert({ name: name.trim(), slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-categories'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Category already exists');
      } else {
        toast.error('Failed to create category');
      }
    },
  });
}

export function useContentCategories(contentId: string | undefined) {
  return useQuery({
    queryKey: ['cms-content-categories', contentId],
    queryFn: async () => {
      if (!contentId) return [];
      const { data, error } = await supabase
        .from('cms_content_categories')
        .select('category_id')
        .eq('content_id', contentId);
      if (error) throw error;
      return data.map((r) => r.category_id);
    },
    enabled: !!contentId,
  });
}

export function useSaveContentCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentId, categoryIds }: { contentId: string; categoryIds: string[] }) => {
      const { error: delError } = await supabase
        .from('cms_content_categories')
        .delete()
        .eq('content_id', contentId);
      if (delError) throw delError;

      if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({ content_id: contentId, category_id }));
        const { error: insError } = await supabase
          .from('cms_content_categories')
          .insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['cms-content-categories', vars.contentId] });
      queryClient.invalidateQueries({ queryKey: ['all-content-categories'] });
    },
    onError: () => {
      toast.error('Failed to save categories');
    },
  });
}

export function useAllContentCategories() {
  return useQuery({
    queryKey: ['all-content-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_content_categories')
        .select('content_id, category_id, cms_categories(name)');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of data) {
        const name = (row as any).cms_categories?.name;
        if (name) {
          if (!map[row.content_id]) map[row.content_id] = [];
          map[row.content_id].push(name);
        }
      }
      return map;
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: junctionError } = await supabase
        .from('cms_content_categories')
        .delete()
        .eq('category_id', id);
      if (junctionError) throw junctionError;

      const { error } = await supabase
        .from('cms_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-content-categories'] });
      toast.success('Category deleted');
    },
    onError: () => {
      toast.error('Failed to delete category');
    },
  });
}
