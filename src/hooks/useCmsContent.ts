import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export type ContentType = 'page' | 'post';
export type ContentStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface CmsContent {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  excerpt: string | null;
  content_json: Record<string, unknown>;
  content_html: string | null;
  featured_image: string | null;
  author_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  no_index: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreateContentInput {
  type: ContentType;
  title: string;
  slug: string;
  excerpt?: string;
  content_json?: Record<string, unknown>;
  content_html?: string;
  featured_image?: string;
  status?: ContentStatus;
  published_at?: string;
  scheduled_at?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  canonical_url?: string;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  no_index?: boolean;
}

export interface UpdateContentInput extends Partial<CreateContentInput> {
  id: string;
}

// Generate URL-safe slug from title
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Validate content before publishing
export function validateForPublish(content: Partial<CmsContent>): string[] {
  const errors: string[] = [];
  
  if (!content.title?.trim()) errors.push('Title is required');
  if (!content.slug?.trim()) errors.push('Slug is required');
  if (!content.content_json || (typeof content.content_json === 'object' && Object.keys(content.content_json).length === 0)) {
    errors.push('Content is required');
  }
  if (content.seo_title && content.seo_title.length > 60) {
    errors.push('SEO title should be 60 characters or less');
  }
  if (content.seo_description && content.seo_description.length > 160) {
    errors.push('SEO description should be 160 characters or less');
  }
  
  return errors;
}

// Hook to fetch content list
export function useContentList(type?: ContentType, status?: ContentStatus) {
  return useQuery({
    queryKey: ['cms-content', type, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      
      const data = await apiFetch(`/cms_content/full?${params.toString()}`);
      return data as unknown as CmsContent[];
    },
  });
}

// Hook to fetch single content by slug (for public pages)
export function useContentBySlug(slug: string, type?: ContentType) {
  return useQuery({
    queryKey: ['cms-content-slug', slug, type],
    queryFn: async () => {
      const params = new URLSearchParams({ slug, status: 'published' });
      if (type) params.append('type', type);
      
      const dataArr = await apiFetch(`/cms_content/full?${params.toString()}`);
      const data = dataArr?.[0];
      
      if (!data) throw new Error('Content not found');
      
      // Increment view count
      await apiFetch(`/cms_content/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ view_count: (data.view_count || 0) + 1 })
      });
      
      return data as unknown as CmsContent;
    },
    enabled: !!slug,
  });
}

// Hook to fetch single content by ID (for editing)
export function useContentById(id: string | undefined) {
  return useQuery({
    queryKey: ['cms-content-id', id],
    queryFn: async () => {
      if (!id) return null;
      
      const dataArr = await apiFetch(`/cms_content/full?id=${id}`);
      return dataArr?.[0] as unknown as CmsContent || null;
    },
    enabled: !!id,
  });
}

// Reserved slugs that conflict with React routes
const RESERVED_SLUGS = ['blog', 'auth', 'browse', 'sellers', 'seller', 'buyer', 'admin', 'cart', 'verify-email'];

// Hook to fetch published pages for footer/navigation
export function usePublishedPages() {
  return useQuery({
    queryKey: ['cms-published-pages'],
    queryFn: async () => {
      const data = await apiFetch('/cms_content?type=page&status=published');
      const sortedData = (data as any[]).sort((a, b) => a.title.localeCompare(b.title));
      
      // Filter out reserved slugs that conflict with React routes
      return sortedData.filter((page: any) => !RESERVED_SLUGS.includes(page.slug)) || [];
    },
  });
}

// Hook to fetch published blog posts
export function usePublishedPosts() {
  return useQuery({
    queryKey: ['cms-published-posts'],
    queryFn: async () => {
      const data = await apiFetch('/cms_content/full?type=post&status=published');
      
      // Filter out future scheduled posts
      const now = new Date().toISOString();
      const filtered = (data as any[]).filter(post => post.published_at <= now);
      
      // Sort by published_at desc
      return filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()) as unknown as CmsContent[];
    },
  });
}

// Hook to create content
export function useCreateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateContentInput) => {
      const { user } = await apiFetch('/auth/me');
      if (!user) throw new Error('Not authenticated');
      
      const data = await apiFetch('/cms_content', {
        method: 'POST',
        body: JSON.stringify({
          type: input.type,
          title: input.title,
          slug: input.slug,
          excerpt: input.excerpt || null,
          content_json: input.content_json || {},
          content_html: input.content_html || null,
          featured_image: input.featured_image || null,
          status: input.status || 'draft',
          published_at: input.published_at || null,
          scheduled_at: input.scheduled_at || null,
          seo_title: input.seo_title || null,
          seo_description: input.seo_description || null,
          seo_keywords: input.seo_keywords || null,
          canonical_url: input.canonical_url || null,
          og_image: input.og_image || null,
          og_title: input.og_title || null,
          og_description: input.og_description || null,
          no_index: input.no_index || false,
          author_id: user.id,
        })
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      toast.success('Content created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create content');
    },
  });
}

// Hook to update content
export function useUpdateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateContentInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.type !== undefined) updateData.type = input.type;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.slug !== undefined) updateData.slug = input.slug;
      if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
      if (input.content_json !== undefined) updateData.content_json = input.content_json;
      if (input.content_html !== undefined) updateData.content_html = input.content_html;
      if (input.featured_image !== undefined) updateData.featured_image = input.featured_image;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.published_at !== undefined) updateData.published_at = input.published_at;
      if (input.scheduled_at !== undefined) updateData.scheduled_at = input.scheduled_at;
      if (input.seo_title !== undefined) updateData.seo_title = input.seo_title;
      if (input.seo_description !== undefined) updateData.seo_description = input.seo_description;
      if (input.seo_keywords !== undefined) updateData.seo_keywords = input.seo_keywords;
      if (input.canonical_url !== undefined) updateData.canonical_url = input.canonical_url;
      if (input.og_image !== undefined) updateData.og_image = input.og_image;
      if (input.og_title !== undefined) updateData.og_title = input.og_title;
      if (input.og_description !== undefined) updateData.og_description = input.og_description;
      if (input.no_index !== undefined) updateData.no_index = input.no_index;
      
      const data = await apiFetch(`/cms_content/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['cms-content-id', data.id] });
      toast.success('Content saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save content');
    },
  });
}

// Hook to publish content
export function usePublishContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First validate content
      const content = await apiFetch(`/cms_content/${id}`);
      
      const errors = validateForPublish(content as unknown as Partial<CmsContent>);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      
      const data = await apiFetch(`/cms_content/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'published',
          published_at: new Date().toISOString(),
        })
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['cms-content-id', data.id] });
      toast.success('Content published successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish content');
    },
  });
}

// Hook to unpublish content
export function useUnpublishContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await apiFetch(`/cms_content/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'draft',
          published_at: null,
        })
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['cms-content-id', data.id] });
      toast.success('Content unpublished');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unpublish content');
    },
  });
}

// Hook to delete content
export function useDeleteContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/cms_content/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      toast.success('Content deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete content');
    },
  });
}

// Hook to check if slug is unique
export function useCheckSlug() {
  return useMutation({
    mutationFn: async ({ slug, excludeId }: { slug: string; excludeId?: string }) => {
      const data = await apiFetch(`/cms_content?slug=${slug}`);
      
      if (excludeId) {
        return !data.some((item: any) => item.id !== excludeId);
      }
      
      return data.length === 0;
    },
  });
}
