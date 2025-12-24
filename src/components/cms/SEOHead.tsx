import { useEffect } from 'react';
import type { CmsContent } from '@/hooks/useCmsContent';

interface SEOHeadProps {
  content?: CmsContent;
  defaultTitle?: string;
  defaultDescription?: string;
}

export function SEOHead({ content, defaultTitle, defaultDescription }: SEOHeadProps) {
  useEffect(() => {
    if (!content) {
      // Set defaults
      document.title = defaultTitle || 'SongKart - Premium Music Marketplace';
      return;
    }

    // Set page title
    const title = content.seo_title || content.title || defaultTitle || 'SongKart';
    document.title = title;

    // Helper function to update meta tags
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Set meta description
    const description = content.seo_description || content.excerpt || defaultDescription || '';
    if (description) {
      setMeta('description', description);
    }

    // Set keywords
    if (content.seo_keywords?.length) {
      setMeta('keywords', content.seo_keywords.join(', '));
    }

    // Set canonical URL
    if (content.canonical_url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', content.canonical_url);
    }

    // Set robots
    if (content.no_index) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow');
    }

    // Open Graph tags
    setMeta('og:title', content.og_title || title, true);
    setMeta('og:description', content.og_description || description, true);
    setMeta('og:type', content.type === 'post' ? 'article' : 'website', true);
    
    if (content.og_image || content.featured_image) {
      setMeta('og:image', content.og_image || content.featured_image || '', true);
    }

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', content.og_title || title);
    setMeta('twitter:description', content.og_description || description);
    
    if (content.og_image || content.featured_image) {
      setMeta('twitter:image', content.og_image || content.featured_image || '');
    }

    // Cleanup function
    return () => {
      // Optionally reset to defaults on unmount
    };
  }, [content, defaultTitle, defaultDescription]);

  return null;
}
