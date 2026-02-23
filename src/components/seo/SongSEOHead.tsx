import { useEffect } from 'react';

interface Song {
  id: string;
  title: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  cover_art_url?: string;
  genre?: { name: string };
  mood?: { name: string };
  language?: string;
  use_cases?: string[];
  canonical_url?: string;
  no_index?: boolean;
  base_price?: number;
  seller?: {
    full_name?: string;
  };
}

interface SongSEOHeadProps {
  song: Song;
}

/**
 * SEO head component specifically for song pages
 * Optimized for buyer-intent commercial licensing searches
 */
export function SongSEOHead({ song }: SongSEOHeadProps) {
  useEffect(() => {
    // Build SEO title with licensing intent
    const useCaseText = song.use_cases?.length 
      ? song.use_cases.slice(0, 2).join(', ') 
      : 'YouTube, Ads & Films';
    
    const title = song.seo_title || 
      `${song.title} - Licensed ${song.genre?.name || 'Music'} for ${useCaseText} | SongKart`;
    
    // Limit title to 60 chars for Google
    const truncatedTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
    document.title = truncatedTitle;

    // Build meta description with buyer intent
    const description = song.seo_description || 
      `License "${song.title}" - ${song.genre?.name || 'original'} ${song.mood?.name || 'music'} track${song.language ? ` in ${song.language}` : ''}. Copyright-safe, instant download, commercial use ready. Perfect for ${useCaseText.toLowerCase()}.`;
    
    // Limit description to 160 chars
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
    
    // Robots
    if (song.no_index) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow, max-image-preview:large');
    }

    // Open Graph
    setMeta('og:title', truncatedTitle, true);
    setMeta('og:description', truncatedDesc, true);
    setMeta('og:type', 'music.song', true);
    setMeta('og:url', song.canonical_url || window.location.href, true);
    
    if (song.cover_art_url) {
      setMeta('og:image', song.cover_art_url, true);
      setMeta('og:image:alt', `${song.title} cover art`, true);
    }

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', truncatedTitle);
    setMeta('twitter:description', truncatedDesc);
    if (song.cover_art_url) {
      setMeta('twitter:image', song.cover_art_url);
    }

    // Music specific
    if (song.seller?.full_name) {
      setMeta('music:musician', song.seller.full_name, true);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', song.canonical_url || `${window.location.origin}/song/${song.id}`);

    return () => {
      // Cleanup is optional since we're replacing values
    };
  }, [song]);

  return null;
}

/**
 * Generate default SEO content for a song based on its metadata
 */
export function generateSongSEOContent(song: {
  title: string;
  genre?: { name: string };
  mood?: { name: string };
  language?: string;
  use_cases?: string[];
  description?: string;
}): string {
  const genre = song.genre?.name || 'original';
  const mood = song.mood?.name || 'versatile';
  const language = song.language || 'universal';
  const useCases = song.use_cases?.length 
    ? song.use_cases.join(', ').toLowerCase()
    : 'YouTube videos, advertisements, social media reels, podcasts, and film projects';

  return `
"${song.title}" is a professionally produced ${genre.toLowerCase()} track with a ${mood.toLowerCase()} feel, available for instant licensing on SongKart. ${song.language ? `Featuring ${language} vocals, this` : 'This'} composition is perfect for ${useCases}.

As a fully licensed track, you get copyright-safe usage rights immediately upon purchase. Whether you're a content creator, filmmaker, advertiser, or business owner, this ${genre.toLowerCase()} music provides the professional sound you need without copyright concerns.

Our licensing options include Commercial License for business use with full monetization rights and Exclusive License for complete ownership. Each license comes with instant download access and a legally binding license certificate.

${song.description || `Discover the perfect sound for your next project with "${song.title}" - professionally crafted, legally licensed, ready to use.`}
  `.trim();
}
