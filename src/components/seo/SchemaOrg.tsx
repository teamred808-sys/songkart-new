import { useEffect } from 'react';

interface SchemaOrgProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Injects JSON-LD structured data into the document head
 */
export function SchemaOrg({ schema }: SchemaOrgProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = `schema-${JSON.stringify(schema).slice(0, 20).replace(/[^a-z0-9]/gi, '')}`;
    
    // Remove existing schema with same id if exists
    const existing = document.getElementById(script.id);
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      script.remove();
    };
  }, [schema]);

  return null;
}

// Helper to format duration as ISO 8601 duration
export function formatDurationISO(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `PT${minutes}M${remainingSeconds}S`;
}

// Organization schema for the platform
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SongKart",
    "description": "Premium licensed music marketplace for content creators, filmmakers, and businesses",
    "url": window.location.origin,
    "logo": `${window.location.origin}/songkart-logo.png`,
    "sameAs": [],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["English", "Hindi"]
    }
  };

  return <SchemaOrg schema={schema} />;
}

// Breadcrumb schema generator
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return <SchemaOrg schema={schema} />;
}

// MusicRecording schema for song pages
interface MusicRecordingSchemaProps {
  name: string;
  artist: string;
  genre?: string;
  duration?: number; // in seconds
  description?: string;
  image?: string;
  datePublished?: string;
  averageRating?: number;
  ratingCount?: number;
  offers?: {
    price: number;
    currency: string;
  }[];
}

export function MusicRecordingSchema({
  name,
  artist,
  genre,
  duration,
  description,
  image,
  datePublished,
  averageRating,
  ratingCount,
  offers
}: MusicRecordingSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": name,
    "byArtist": {
      "@type": "Person",
      "name": artist
    }
  };

  if (genre) schema.genre = genre;
  if (duration) schema.duration = formatDurationISO(duration);
  if (description) schema.description = description;
  if (image) schema.image = image;
  if (datePublished) schema.datePublished = datePublished;

  // Add aggregate rating if available
  if (averageRating && ratingCount && ratingCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": averageRating,
      "ratingCount": ratingCount,
      "bestRating": 5,
      "worstRating": 1
    };
  }

  if (offers && offers.length > 0) {
    schema.offers = offers.map(offer => ({
      "@type": "Offer",
      "price": offer.price,
      "priceCurrency": offer.currency,
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "SongKart"
      }
    }));
  }

  return <SchemaOrg schema={schema} />;
}

// Product schema for license offerings
interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  brand?: string;
  offers: {
    name: string;
    price: number;
    currency: string;
  }[];
}

export function ProductSchema({
  name,
  description,
  image,
  brand,
  offers
}: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "image": image,
    "brand": {
      "@type": "Brand",
      "name": brand || "SongKart"
    },
    "offers": offers.map(offer => ({
      "@type": "Offer",
      "name": offer.name,
      "price": offer.price,
      "priceCurrency": offer.currency,
      "availability": "https://schema.org/InStock"
    }))
  };

  return <SchemaOrg schema={schema} />;
}

// BlogPosting schema
interface BlogPostingSchemaProps {
  headline: string;
  description?: string;
  image?: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  url: string;
}

export function BlogPostingSchema({
  headline,
  description,
  image,
  author,
  datePublished,
  dateModified,
  url
}: BlogPostingSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": headline,
    "description": description,
    "image": image,
    "author": {
      "@type": "Person",
      "name": author
    },
    "publisher": {
      "@type": "Organization",
      "name": "SongKart",
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/songkart-logo.png`
      }
    },
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  };

  return <SchemaOrg schema={schema} />;
}

// FAQ schema for license explanations
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return <SchemaOrg schema={schema} />;
}

// WebSite schema with search action
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SongKart",
    "url": window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${window.location.origin}/browse?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return <SchemaOrg schema={schema} />;
}

// ProfilePage schema for seller profiles
interface ProfilePageSchemaProps {
  name: string;
  description?: string;
  image?: string;
  url: string;
  sameAs?: string[];
  role?: string;
  worksCount?: number;
}

export function ProfilePageSchema({
  name,
  description,
  image,
  url,
  sameAs,
  role,
  worksCount
}: ProfilePageSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": name,
      "description": description,
      "image": image,
      "url": url,
      "sameAs": sameAs || [],
      "jobTitle": role || "Music Creator",
      "worksFor": {
        "@type": "Organization",
        "name": "SongKart"
      },
      ...(worksCount && {
        "makesOffer": {
          "@type": "Offer",
          "itemOffered": {
            "@type": "CreativeWork",
            "name": `${worksCount} Licensed Tracks`
          }
        }
      })
    }
  };

  return <SchemaOrg schema={schema} />;
}

// ItemList schema for browse/category pages
interface ItemListSchemaProps {
  name: string;
  description?: string;
  items: {
    name: string;
    url: string;
    image?: string;
  }[];
}

export function ItemListSchema({ name, description, items }: ItemListSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": name,
    "description": description,
    "numberOfItems": items.length,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url,
      ...(item.image && { "image": item.image })
    }))
  };

  return <SchemaOrg schema={schema} />;
}
