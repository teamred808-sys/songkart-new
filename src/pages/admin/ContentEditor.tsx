import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Globe, Loader2, Upload, X, ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/cms/RichTextEditor';
import { useContentById, useCreateContent, useUpdateContent, usePublishContent, slugify, type ContentType } from '@/hooks/useCmsContent';
import { useUploadMedia } from '@/hooks/useCmsMedia';
import { useCategories, useCreateCategory, useContentCategories, useSaveContentCategories } from '@/hooks/useCmsCategories';
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
  const uploadMedia = useUploadMedia();
  const { data: allCategories } = useCategories();
  const createCategory = useCreateCategory();
  const { data: existingCategoryIds } = useContentCategories(id);
  const saveContentCategories = useSaveContentCategories();
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const excerptManuallyEdited = useRef(false);
  const seoTitleManuallyEdited = useRef(false);
  const seoDescManuallyEdited = useRef(false);

  const [selectedType, setSelectedType] = useState<ContentType>(defaultType);
  const contentType = existingContent?.type || selectedType;

  const stripHtml = (html: string): string =>
    html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
  const [isFeaturedDragging, setIsFeaturedDragging] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

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
      excerptManuallyEdited.current = true;
      seoTitleManuallyEdited.current = true;
      seoDescManuallyEdited.current = true;
    }
  }, [existingContent]);

  useEffect(() => {
    if (existingCategoryIds) {
      setSelectedCategoryIds(existingCategoryIds);
    }
  }, [existingCategoryIds]);

  useEffect(() => {
    if (autoSlug && title) {
      setSlug(slugify(title));
    }
  }, [title, autoSlug]);

  useEffect(() => {
    if (!seoTitleManuallyEdited.current && title) {
      setSeoTitle(title.substring(0, 60));
    }
  }, [title]);

  const handleEditorChange = useCallback((json: Record<string, unknown>, html: string) => {
    setContentJson(json as Json);
    setContentHtml(html);
    setHasChanges(true);
    const plainText = stripHtml(html);
    if (!excerptManuallyEdited.current) {
      setExcerpt(plainText.substring(0, 200));
    }
    if (!seoDescManuallyEdited.current) {
      setSeoDescription(plainText.substring(0, 155));
    }
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
    setHasChanges(true);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const created = await createCategory.mutateAsync(name);
      setSelectedCategoryIds((prev) => [...prev, created.id]);
      setNewCategoryName('');
      setHasChanges(true);
    } catch {
      // error handled by hook
    }
  };

  const handleFeaturedImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const result = await uploadMedia.mutateAsync({ file, altText: title || file.name });
      setFeaturedImage(result.avif_url || result.public_url);
      setHasChanges(true);
    } catch {
      // error toast handled by hook
    }
  }, [uploadMedia, title]);

  const handleFeaturedImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFeaturedDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFeaturedImageUpload(file);
  }, [handleFeaturedImageUpload]);

  const handleFeaturedFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFeaturedImageUpload(file);
    if (featuredImageInputRef.current) featuredImageInputRef.current.value = '';
  }, [handleFeaturedImageUpload]);

  const saveCategoriesForContent = async (contentId: string) => {
    if (contentType === 'post') {
      await saveContentCategories.mutateAsync({ contentId, categoryIds: selectedCategoryIds });
    }
  };

  const handleSave = async () => {
    if (isNew) {
      const result = await createContent.mutateAsync({
        type: selectedType,
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
      await saveCategoriesForContent(result.id);
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
      await saveCategoriesForContent(id!);
    }
    setHasChanges(false);
  };

  const handlePublish = async () => {
    if (isNew) {
      const result = await createContent.mutateAsync({
        type: selectedType,
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
      await saveCategoriesForContent(result.id);
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
              {isNew ? `New ${selectedType === 'page' ? 'Page' : 'Post'}` : 'Edit Content'}
            </h1>
            {isNew && (
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant={selectedType === 'page' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setSelectedType('page'); setHasChanges(true); }}
                >
                  Page
                </Button>
                <Button
                  type="button"
                  variant={selectedType === 'post' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setSelectedType('post'); setHasChanges(true); }}
                >
                  Post
                </Button>
              </div>
            )}
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
          {contentType === 'post' && (
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allCategories && allCategories.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allCategories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedCategoryIds.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No categories yet</p>
                )}
                <Separator />
                <div className="flex items-center gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim() || createCategory.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Excerpt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={excerpt}
                onChange={(e) => { setExcerpt(e.target.value); setHasChanges(true); excerptManuallyEdited.current = true; }}
                placeholder="Brief description..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {featuredImage ? (
                <div className="relative group">
                  <img src={featuredImage} alt="Featured" className="rounded-lg w-full max-h-48 object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setFeaturedImage(''); setHasChanges(true); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsFeaturedDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsFeaturedDragging(false); }}
                  onDrop={handleFeaturedImageDrop}
                  onClick={() => featuredImageInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isFeaturedDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {uploadMedia.isPending ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag & drop or click to upload
                      </p>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={featuredImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFeaturedFileChange}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                <span>or enter URL</span>
                <Separator className="flex-1" />
              </div>
              <Input
                value={featuredImage}
                onChange={(e) => { setFeaturedImage(e.target.value); setHasChanges(true); }}
                placeholder="https://example.com/image.jpg"
              />
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
                      onChange={(e) => { setSeoTitle(e.target.value); setHasChanges(true); seoTitleManuallyEdited.current = true; }}
                      placeholder={title || 'Page title...'}
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description ({seoDescription.length}/160)</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={(e) => { setSeoDescription(e.target.value); setHasChanges(true); seoDescManuallyEdited.current = true; }}
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
