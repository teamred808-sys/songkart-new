import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Calendar } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useContentBySlug } from "@/hooks/useCmsContent";
import { SEOHead } from "@/components/cms/SEOHead";
import { ContentRenderer } from "@/components/cms/ContentRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useContentBySlug(slug || '', 'post');

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEOHead content={post} />
      
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {post.featured_image && (
          <div className="aspect-video overflow-hidden rounded-lg mb-8">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-muted-foreground">
            {post.author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.author.avatar_url || undefined} />
                  <AvatarFallback>
                    {post.author.full_name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <span>{post.author.full_name || 'Admin'}</span>
              </div>
            )}
            
            {post.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.published_at), 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {post.excerpt && (
            <p className="text-xl text-muted-foreground mt-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </header>

        <ContentRenderer html={post.content_html || ''} className="prose-lg" />
      </article>
    </MainLayout>
  );
};

export default BlogPost;
