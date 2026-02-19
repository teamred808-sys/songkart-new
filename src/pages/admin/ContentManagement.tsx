import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Newspaper, Search, Eye, Pencil, Trash2, Globe, EyeOff, X, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
import { useAllContentCategories, useCategories, useDeleteCategory } from '@/hooks/useCmsCategories';
import { format } from 'date-fns';

export default function ContentManagement() {
  const ITEMS_PER_PAGE = 10;
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'pages' | 'posts'>('posts');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const { data: pages, isLoading: isLoadingPages } = useContentList('page');
  const { data: posts, isLoading: isLoadingPosts } = useContentList('post');
  const deleteContent = useDeleteContent();
  const publishContent = usePublishContent();
  const unpublishContent = useUnpublishContent();
  const { data: contentCategoriesMap } = useAllContentCategories();
  const { data: allCategories } = useCategories();
  const deleteCategory = useDeleteCategory();

  const filterBySearch = (items?: CmsContent[]) =>
    items?.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.slug.toLowerCase().includes(search.toLowerCase())
    );

  const filteredPages = filterBySearch(pages);
  const filteredPosts = filterBySearch(posts);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSection, search]);

  const activeItems = activeSection === 'pages' ? filteredPages : filteredPosts;
  const totalItems = activeItems?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedItems = activeItems?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

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
            {item.type === 'post' && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(contentCategoriesMap?.[item.id]?.length ?? 0) > 0 ? (
                  contentCategoriesMap![item.id].map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Uncategorized</Badge>
                )}
              </div>
            )}
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
          {activeSection === 'pages' && (
            <Button onClick={() => navigate('/admin/content/new?type=page')}>
              <FileText className="h-4 w-4 mr-2" />
              New Page
            </Button>
          )}
          {activeSection === 'posts' && (
            <Button onClick={() => navigate('/admin/content/new?type=post')} variant="outline">
              <Newspaper className="h-4 w-4 mr-2" />
              New Post
            </Button>
          )}
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

      {activeSection === 'posts' && allCategories && allCategories.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Manage Categories</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="flex items-center gap-1 pr-1">
                  {cat.name}
                  <button
                    onClick={() => setDeleteCategoryId(cat.id)}
                    className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(activeSection === 'pages' ? isLoadingPages : isLoadingPosts) ? (
          renderLoadingSkeleton()
        ) : totalItems === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No {activeSection === 'pages' ? 'pages' : 'blog posts'} found.
            </CardContent>
          </Card>
        ) : (
          paginatedItems?.map(renderContentCard)
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {getPageNumbers().map((page, i) =>
              page === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={currentPage === page}
                    onClick={() => setCurrentPage(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

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

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category. Blog posts using this category will become uncategorized. No posts will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCategoryId) {
                  deleteCategory.mutate(deleteCategoryId);
                  setDeleteCategoryId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
