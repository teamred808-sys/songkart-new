import { useEffect } from 'react';

interface PageSEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  noIndex?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  };
}

/**
 * Generic SEO head component for all page types
 */
export function PageSEOHead({
  title,
  description,
  canonical,
  noIndex = false,
  ogImage,
  ogType = 'website',
  article
}: PageSEOHeadProps) {
  useEffect(() => {
    // Set title (max 60 chars)
    const truncatedTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
    document.title = truncatedTitle;

    // Truncate description (max 160 chars)
    const truncatedDesc = description.length > 160 ? description.slice(0, 157) + '...' : description;

    // Helper to set meta tags
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Core meta tags
    setMeta('description', truncatedDesc);
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMeta('og:title', truncatedTitle, true);
    setMeta('og:description', truncatedDesc, true);
    setMeta('og:type', ogType, true);
    setMeta('og:url', canonical || window.location.href, true);
    setMeta('og:site_name', 'SongKart', true);
    
    if (ogImage) {
      setMeta('og:image', ogImage, true);
    }

    // Article specific
    if (article && ogType === 'article') {
      if (article.publishedTime) {
        setMeta('article:published_time', article.publishedTime, true);
      }
      if (article.modifiedTime) {
        setMeta('article:modified_time', article.modifiedTime, true);
      }
      if (article.author) {
        setMeta('article:author', article.author, true);
      }
    }

    // Twitter Card
    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', truncatedTitle);
    setMeta('twitter:description', truncatedDesc);
    if (ogImage) {
      setMeta('twitter:image', ogImage);
    }

    // Canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    return () => {
      // Cleanup is optional
    };
  }, [title, description, canonical, noIndex, ogImage, ogType, article]);

  return null;
}

// Pre-configured SEO heads for common pages
export function BrowseSEOHead({ genre, mood }: { genre?: string; mood?: string }) {
  let title = 'Browse Licensed Music';
  let description = 'Discover and license professional music for your projects. Copyright-safe tracks for YouTube, ads, films, and more.';

  if (genre) {
    title = `${genre} Music - Licensed Tracks for Commercial Use`;
    description = `Browse and license ${genre.toLowerCase()} music tracks. Copyright-safe, instant download, perfect for YouTube, advertisements, and creative projects.`;
  } else if (mood) {
    title = `${mood} Music - Licensed Tracks for Commercial Use`;
    description = `Find ${mood.toLowerCase()} music for your projects. Fully licensed, copyright-safe tracks ready for commercial use.`;
  }

  return (
    <PageSEOHead
      title={`${title} | SongKart`}
      description={description}
      canonical={`${window.location.origin}/browse${genre ? `?genre=${genre}` : mood ? `?mood=${mood}` : ''}`}
    />
  );
}

export function HomeSEOHead() {
  return (
    <PageSEOHead
      title="SongKart - Licensed Music Marketplace for Content Creators"
      description="Buy legally licensed songs, lyrics, and compositions for your YouTube videos, ads, films, and podcasts. Instant downloads, verified sellers, and full legal protection."
      canonical={window.location.origin}
    />
  );
}

export function BlogSEOHead() {
  return (
    <PageSEOHead
      title="Music Licensing Blog - Tips, Guides & Industry News | SongKart"
      description="Learn about music licensing, copyright, content creation tips, and industry insights. Expert guides for creators and musicians."
      canonical={`${window.location.origin}/blog`}
    />
  );
}
