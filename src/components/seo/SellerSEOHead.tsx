import { useEffect } from 'react';

interface Seller {
  id: string;
  full_name?: string;
  username?: string;
  bio?: string;
  is_verified?: boolean;
  avatar_url?: string;
  role?: string;
  specialties?: string[];
}

interface SellerSEOHeadProps {
  seller: Seller;
  songCount: number;
}

/**
 * SEO head component specifically for seller profile pages
 * Optimized for creator/artist discovery searches
 */
export function SellerSEOHead({ seller, songCount }: SellerSEOHeadProps) {
  useEffect(() => {
    const name = seller.full_name || 'Music Creator';
    const role = seller.role || 'Music Creator';
    const specialtiesText = seller.specialties?.length 
      ? seller.specialties.slice(0, 3).join(', ') 
      : '';
    
    // Build SEO title with role
    const title = `${name} - ${role} | Licensed Music on SongKart`;
    const truncatedTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
    document.title = truncatedTitle;

    // Build meta description
    let description = '';
    if (seller.bio) {
      description = seller.bio.slice(0, 100);
    } else {
      description = `Discover ${songCount} licensed tracks from ${name}`;
      if (specialtiesText) {
        description += ` specializing in ${specialtiesText}`;
      }
      description += '. Copyright-safe music for YouTube, ads & films.';
    }
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

    // Set core meta tags
    setMeta('description', truncatedDesc);
    setMeta('robots', 'index, follow, max-image-preview:large');

    // Open Graph
    setMeta('og:title', truncatedTitle, true);
    setMeta('og:description', truncatedDesc, true);
    setMeta('og:type', 'profile', true);
    setMeta('og:url', window.location.href, true);
    
    if (seller.avatar_url) {
      setMeta('og:image', seller.avatar_url, true);
      setMeta('og:image:alt', `${name} profile photo`, true);
    }

    // Twitter Card
    setMeta('twitter:card', 'summary');
    setMeta('twitter:title', truncatedTitle);
    setMeta('twitter:description', truncatedDesc);
    if (seller.avatar_url) {
      setMeta('twitter:image', seller.avatar_url);
    }

    // Profile specific
    setMeta('profile:username', seller.username || seller.id, true);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const canonicalUrl = seller.username 
      ? `${window.location.origin}/sellers/${seller.username}`
      : `${window.location.origin}/seller/${seller.id}`;
    canonical.setAttribute('href', canonicalUrl);

    return () => {
      // Cleanup is optional since we're replacing values
    };
  }, [seller, songCount]);

  return null;
}
