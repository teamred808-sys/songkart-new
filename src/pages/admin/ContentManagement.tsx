import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Newspaper, Search, Eye, Pencil, Trash2, Globe, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useContentList, useDeleteContent, usePublishContent, useUnpublishContent, type ContentStatus, type CmsContent } from '@/hooks/useCmsContent';
import { format } from 'date-fns';

export default function ContentManagement() {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'pages' | 'posts'>('posts');
  const navigate = useNavigate();

  const { data: pages, isLoading: isLoadingPages } = useContentList('page');
  const { data: posts, isLoading: isLoadingPosts } = useContentList('post');
  const deleteContent = useDeleteContent();
  const publishContent = usePublishContent();
  const unpublishContent = useUnpublishContent();

  const filterBySearch = (items?: CmsContent[]) =>
    items?.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.slug.toLowerCase().includes(search.toLowerCase())
    );

  const filteredPages = filterBySearch(pages);
  const filteredPosts = filterBySearch(posts);

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-success/20 text-success border-success/30">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Scheduled</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteContent.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const renderContentCard = (item: CmsContent) => (
    <Card key={item.id} className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {item.type === 'page' ? (
                <FileText className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Newspaper className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-semibold truncate">{item.title}</h3>
              {getStatusBadge(item.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              /{item.slug} • Updated {format(new Date(item.updated_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {item.status === 'published' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unpublishContent.mutate(item.id)}
                disabled={unpublishContent.isPending}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => publishContent.mutate(item.id)}
                disabled={publishContent.isPending}
              >
                <Globe className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to={item.type === 'post' ? `/blog/${item.slug}` : `/${item.slug}`} target="_blank">
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/admin/content/${item.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteId(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Manage pages and blog posts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/content/new?type=page')}>
            <FileText className="h-4 w-4 mr-2" />
            New Page
          </Button>
          <Button onClick={() => navigate('/admin/content/new?type=post')} variant="outline">
            <Newspaper className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeSection === 'pages' ? 'default' : 'outline'}
          onClick={() => setActiveSection('pages')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Pages ({filteredPages?.length || 0})
        </Button>
        <Button
          variant={activeSection === 'posts' ? 'default' : 'outline'}
          onClick={() => setActiveSection('posts')}
        >
          <Newspaper className="h-4 w-4 mr-2" />
          Blog Posts ({filteredPosts?.length || 0})
        </Button>
      </div>

      <div className="space-y-4">
        {activeSection === 'pages' ? (
          isLoadingPages ? renderLoadingSkeleton() : filteredPages?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No pages found.
              </CardContent>
            </Card>
          ) : (
            filteredPages?.map(renderContentCard)
          )
        ) : (
          isLoadingPosts ? renderLoadingSkeleton() : filteredPosts?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No blog posts found.
              </CardContent>
            </Card>
          ) : (
            filteredPosts?.map(renderContentCard)
          )
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
