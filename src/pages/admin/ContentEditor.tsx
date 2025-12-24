import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RichTextEditor } from '@/components/cms/RichTextEditor';
import { useContentById, useCreateContent, useUpdateContent, usePublishContent, slugify, type ContentType } from '@/hooks/useCmsContent';
import type { Json } from '@/integrations/supabase/types';

export default function ContentEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id;
  const defaultType = (searchParams.get('type') as ContentType) || 'page';

  const { data: existingContent, isLoading } = useContentById(id);
  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const publishContent = usePublishContent();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentJson, setContentJson] = useState<Json>({});
  const [contentHtml, setContentHtml] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [noIndex, setNoIndex] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (existingContent) {
      setTitle(existingContent.title);
      setSlug(existingContent.slug);
      setExcerpt(existingContent.excerpt || '');
      setContentJson(existingContent.content_json);
      setContentHtml(existingContent.content_html || '');
      setFeaturedImage(existingContent.featured_image || '');
      setSeoTitle(existingContent.seo_title || '');
      setSeoDescription(existingContent.seo_description || '');
      setNoIndex(existingContent.no_index);
      setAutoSlug(false);
    }
  }, [existingContent]);

  useEffect(() => {
    if (autoSlug && title) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug]);

  const handleEditorChange = useCallback((json: Record<string, unknown>, html: string) => {
    setContentJson(json as Json);
    setContentHtml(html);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (isNew) {
      const result = await createContent.mutateAsync({
        type: defaultType,
        title,
        slug,
        excerpt,
        content_json: contentJson,
        content_html: contentHtml,
        featured_image: featuredImage || undefined,
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        no_index: noIndex,
      });
      navigate(`/admin/content/${result.id}/edit`, { replace: true });
    } else {
      await updateContent.mutateAsync({
        id,
        title,
        slug,
        excerpt,
        content_json: contentJson,
        content_html: contentHtml,
        featured_image: featuredImage || undefined,
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        no_index: noIndex,
      });
    }
    setHasChanges(false);
  };

  const handlePublish = async () => {
    if (isNew) {
      const result = await createContent.mutateAsync({
        type: defaultType,
        title,
        slug,
        excerpt,
        content_json: contentJson,
        content_html: contentHtml,
        featured_image: featuredImage || undefined,
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        no_index: noIndex,
      });
      await publishContent.mutateAsync(result.id);
      navigate(`/admin/content/${result.id}/edit`, { replace: true });
    } else {
      await handleSave();
      await publishContent.mutateAsync(id!);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSaving = createContent.isPending || updateContent.isPending;
  const isPublishing = publishContent.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/content')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? `New ${defaultType === 'page' ? 'Page' : 'Post'}` : 'Edit Content'}
            </h1>
            {hasChanges && <p className="text-sm text-warning">Unsaved changes</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && existingContent?.status === 'published' && (
            <Button variant="outline" asChild>
              <a href={`/${slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                View Live
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleSave} disabled={isSaving || !title}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing || !title}>
            {isPublishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                  placeholder="Enter title..."
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); setHasChanges(true); }}
                    placeholder="url-slug"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={contentJson as Record<string, unknown>}
                onChange={handleEditorChange}
                placeholder="Start writing your content..."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Excerpt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={excerpt}
                onChange={(e) => { setExcerpt(e.target.value); setHasChanges(true); }}
                placeholder="Brief description..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={featuredImage}
                onChange={(e) => { setFeaturedImage(e.target.value); setHasChanges(true); }}
                placeholder="Image URL..."
              />
              {featuredImage && (
                <img src={featuredImage} alt="Featured" className="mt-2 rounded-lg max-h-32 object-cover" />
              )}
            </CardContent>
          </Card>

          <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base">SEO Settings</CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>SEO Title ({seoTitle.length}/60)</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => { setSeoTitle(e.target.value); setHasChanges(true); }}
                      placeholder={title || 'Page title...'}
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description ({seoDescription.length}/160)</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={(e) => { setSeoDescription(e.target.value); setHasChanges(true); }}
                      placeholder="Brief description for search engines..."
                      rows={3}
                      maxLength={160}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="noindex">Hide from search engines</Label>
                    <Switch
                      id="noindex"
                      checked={noIndex}
                      onCheckedChange={(v) => { setNoIndex(v); setHasChanges(true); }}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
