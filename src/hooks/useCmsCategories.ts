import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['cms-categories'],
    queryFn: async () => {
      const data = await apiFetch('/cms_categories');
      return (data as any[]).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, slug, description }: { name: string; slug: string; description?: string }) => {
      const data = await apiFetch('/cms_categories', {
        method: 'POST',
        body: JSON.stringify({ name, slug, description }),
      });
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
      const data = await apiFetch(`/cms_content_category_map?content_id=${contentId}`);
      return data;
    },
    enabled: !!contentId,
  });
}

export function useSaveContentCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentId, categoryIds }: { contentId: string; categoryIds: string[] }) => {
      // First delete existing mappings
      await apiFetch(`/cms_content_category_map?content_id=${contentId}`, {
        method: 'DELETE'
      }).catch(() => {});
      
      // Then insert new ones if any
      if (categoryIds.length > 0) {
        const mappings = categoryIds.map(categoryId => ({
          content_id: contentId,
          category_id: categoryId,
        }));
        
        await apiFetch('/cms_content_category_map', {
          method: 'POST',
          body: JSON.stringify(mappings),
        });
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
      const data = await apiFetch('/cms_content_categories/full');
      const map: Record<string, string[]> = {};
      for (const row of data || []) {
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
      await apiFetch(`/cms_content_categories?category_id=${id}`, { method: 'DELETE' }).catch(() => {});
      await apiFetch(`/cms_categories/${id}`, { method: 'DELETE' });
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
