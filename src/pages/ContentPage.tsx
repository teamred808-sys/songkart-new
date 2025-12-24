import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentRenderer } from '@/components/cms/ContentRenderer';
import { SEOHead } from '@/components/cms/SEOHead';
import { useContentBySlug } from '@/hooks/useCmsContent';
import { MainLayout } from '@/components/layout/MainLayout';
import { format } from 'date-fns';

export default function ContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: content, isLoading, error } = useContentBySlug(slug || '');

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-12">
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-6 w-1/3 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !content) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEOHead content={content} />
      <article className="container max-w-4xl py-12">
        {content.featured_image && (
          <img
            src={content.featured_image}
            alt={content.title}
            className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
          />
        )}
        
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{content.title}</h1>
          {content.type === 'post' && (
            <div className="flex items-center gap-4 text-muted-foreground">
              {content.author?.full_name && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{content.author.full_name}</span>
                </div>
              )}
              {content.published_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={content.published_at}>
                    {format(new Date(content.published_at), 'MMMM d, yyyy')}
                  </time>
                </div>
              )}
            </div>
          )}
          {content.excerpt && (
            <p className="text-xl text-muted-foreground mt-4">{content.excerpt}</p>
          )}
        </header>

        <ContentRenderer html={content.content_html} />
      </article>
    </MainLayout>
  );
}
