import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SongLinkProps {
  song: {
    id: string;
    slug?: string;
    title: string;
  };
  children?: React.ReactNode;
  className?: string;
}

/**
 * SEO-optimized link to a song page
 * Uses slug-based URL if available, falls back to ID
 */
export function SongLink({ song, children, className }: SongLinkProps) {
  const href = song.slug ? `/songs/${song.slug}` : `/song/${song.id}`;
  const defaultText = `${song.title}`;
  
  return (
    <Link 
      to={href} 
      className={cn("text-primary hover:underline", className)}
      title={`License "${song.title}" - View details and pricing`}
    >
      {children || defaultText}
    </Link>
  );
}

interface SellerLinkProps {
  seller: {
    id: string;
    username?: string;
    full_name?: string;
    role?: string;
  };
  children?: React.ReactNode;
  className?: string;
}

/**
 * SEO-optimized link to a seller profile page
 * Uses username-based URL if available, falls back to ID
 */
export function SellerLink({ seller, children, className }: SellerLinkProps) {
  const href = seller.username ? `/sellers/${seller.username}` : `/seller/${seller.id}`;
  const name = seller.full_name || 'Music Creator';
  const role = seller.role || 'Music Creator';
  const defaultText = name;
  
  return (
    <Link 
      to={href} 
      className={cn("text-primary hover:underline", className)}
      title={`${name} - ${role} on SongKart`}
    >
      {children || defaultText}
    </Link>
  );
}

interface GenreLinkProps {
  genre: {
    id?: string;
    name: string;
  };
  children?: React.ReactNode;
  className?: string;
}

/**
 * SEO-optimized link to a genre browse page
 */
export function GenreLink({ genre, children, className }: GenreLinkProps) {
  const slug = genre.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const href = `/browse?genre=${encodeURIComponent(genre.name)}`;
  const defaultText = genre.name;
  
  return (
    <Link 
      to={href} 
      className={cn("text-primary hover:underline", className)}
      title={`Browse ${genre.name} music for licensing`}
    >
      {children || defaultText}
    </Link>
  );
}

interface MoodLinkProps {
  mood: {
    id?: string;
    name: string;
  };
  children?: React.ReactNode;
  className?: string;
}

/**
 * SEO-optimized link to a mood browse page
 */
export function MoodLink({ mood, children, className }: MoodLinkProps) {
  const href = `/browse?mood=${encodeURIComponent(mood.name)}`;
  const defaultText = mood.name;
  
  return (
    <Link 
      to={href} 
      className={cn("text-primary hover:underline", className)}
      title={`Browse ${mood.name} music for licensing`}
    >
      {children || defaultText}
    </Link>
  );
}

interface LicenseLinkProps {
  licenseType: 'commercial' | 'exclusive';
  children?: React.ReactNode;
  className?: string;
}

/**
 * SEO-optimized link to a license information page
 */
export function LicenseLink({ licenseType, children, className }: LicenseLinkProps) {
  const href = `/licenses/${licenseType}`;
  const labels: Record<string, string> = {
    commercial: 'Commercial License',
    exclusive: 'Exclusive License'
  };
  const defaultText = labels[licenseType] || licenseType;
  
  return (
    <Link 
      to={href} 
      className={cn("text-primary hover:underline", className)}
      title={`Learn about ${defaultText} on SongKart`}
    >
      {children || defaultText}
    </Link>
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * SEO-optimized breadcrumb navigation
 * Uses semantic HTML and proper link structure
 */
export function SEOBreadcrumbs({ items, className }: SEOBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex items-center gap-2" itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, index) => (
          <li 
            key={item.url} 
            className="flex items-center gap-2"
            itemProp="itemListElement" 
            itemScope 
            itemType="https://schema.org/ListItem"
          >
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === items.length - 1 ? (
              <span itemProp="name" className="text-foreground font-medium">
                {item.name}
              </span>
            ) : (
              <Link 
                to={item.url} 
                itemProp="item"
                className="hover:text-primary transition-colors"
              >
                <span itemProp="name">{item.name}</span>
              </Link>
            )}
            <meta itemProp="position" content={String(index + 1)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
