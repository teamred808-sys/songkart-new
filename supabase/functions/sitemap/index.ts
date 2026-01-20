import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITEMAP_LIMIT = 10000; // Split into sub-sitemaps when exceeding this

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

function getCanonicalUrl(baseUrl: string, path: string, customCanonical?: string | null): string {
  if (customCanonical) {
    // Ensure custom canonical has no trailing slash
    return customCanonical.replace(/\/$/, '');
  }
  // Generate URL without trailing slash or query params
  return `${baseUrl}${path}`.replace(/\/$/, '');
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  
  for (const entry of entries) {
    xml += `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>
`;
  }
  
  xml += '</urlset>';
  return xml;
}

function generateSitemapIndex(baseUrl: string, sitemaps: { name: string; lastmod: string }[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  
  for (const sitemap of sitemaps) {
    xml += `  <sitemap>
    <loc>${baseUrl}/sitemap-${sitemap.name}.xml</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>
`;
  }
  
  xml += '</sitemapindex>';
  return xml;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get base URL and requested sitemap type
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get('baseUrl') || 'https://songkart.com';
    const sitemapType = url.searchParams.get('type') || 'index';

    // Fetch counts to determine if we need sitemap index
    const [songsResult, postsResult, pagesResult, sellersResult] = await Promise.all([
      supabase
        .from('songs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .or('no_index.is.null,no_index.eq.false'),
      supabase
        .from('cms_content')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'post')
        .eq('status', 'published')
        .or('no_index.is.null,no_index.eq.false'),
      supabase
        .from('cms_content')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'page')
        .eq('status', 'published')
        .or('no_index.is.null,no_index.eq.false')
        .not('slug', 'in', '(home,homepage,index)'),
      supabase
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'seller'),
    ]);

    const songCount = songsResult.count || 0;
    const postCount = postsResult.count || 0;
    const pageCount = pagesResult.count || 0;
    const sellerCount = sellersResult.count || 0;
    const totalCount = songCount + postCount + pageCount + sellerCount;
    const needsIndex = totalCount > SITEMAP_LIMIT;

    // Handle different sitemap types
    if (sitemapType === 'songs' || (!needsIndex && sitemapType === 'index')) {
      // Generate songs sitemap or combined sitemap
      const entries: SitemapEntry[] = [];

      // Static pages (only in main/combined sitemap)
      if (sitemapType === 'index' || !needsIndex) {
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/'),
          lastmod: formatDate(null),
          changefreq: 'daily',
          priority: '1.0',
        });
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/browse'),
          lastmod: formatDate(null),
          changefreq: 'daily',
          priority: '0.9',
        });
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/sellers'),
          lastmod: formatDate(null),
          changefreq: 'weekly',
          priority: '0.7',
        });
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/blog'),
          lastmod: formatDate(null),
          changefreq: 'daily',
          priority: '0.8',
        });
        
        // License pages
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/licenses'),
          lastmod: formatDate(null),
          changefreq: 'monthly',
          priority: '0.7',
        });
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/licenses/personal'),
          lastmod: formatDate(null),
          changefreq: 'monthly',
          priority: '0.6',
        });
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/licenses/commercial'),
          lastmod: formatDate(null),
          changefreq: 'monthly',
          priority: '0.6',
        });
        entries.push({
          loc: getCanonicalUrl(baseUrl, '/licenses/exclusive'),
          lastmod: formatDate(null),
          changefreq: 'monthly',
          priority: '0.6',
        });
      }

      // Fetch songs with slug
      const { data: songs } = await supabase
        .from('songs')
        .select('id, slug, updated_at, canonical_url, no_index')
        .eq('status', 'approved')
        .or('no_index.is.null,no_index.eq.false')
        .order('updated_at', { ascending: false });

      if (songs) {
        for (const song of songs) {
          // Use slug-based URL if available
          const songPath = song.slug ? `/songs/${song.slug}` : `/song/${song.id}`;
          entries.push({
            loc: getCanonicalUrl(baseUrl, songPath, song.canonical_url),
            lastmod: formatDate(song.updated_at),
            changefreq: 'weekly',
            priority: '0.9',
          });
        }
      }

      // If combined sitemap, also include sellers, blog and pages
      if (!needsIndex) {
        // Fetch sellers with username
        const { data: sellerRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'seller');

        if (sellerRoles && sellerRoles.length > 0) {
          const sellerIds = sellerRoles.map(r => r.user_id);
          const { data: sellers } = await supabase
            .from('profiles')
            .select('id, username, updated_at')
            .in('id', sellerIds);

          if (sellers) {
            for (const seller of sellers) {
              // Use username-based URL if available
              const sellerPath = seller.username 
                ? `/sellers/${seller.username}` 
                : `/seller/${seller.id}`;
              entries.push({
                loc: getCanonicalUrl(baseUrl, sellerPath),
                lastmod: formatDate(seller.updated_at),
                changefreq: 'weekly',
                priority: '0.7',
              });
            }
          }
        }

        // Fetch genres for genre pages
        const { data: genres } = await supabase
          .from('genres')
          .select('name')
          .order('name');

        if (genres) {
          for (const genre of genres) {
            entries.push({
              loc: getCanonicalUrl(baseUrl, `/browse?genre=${encodeURIComponent(genre.name)}`),
              lastmod: formatDate(null),
              changefreq: 'weekly',
              priority: '0.6',
            });
          }
        }

        // Fetch blog posts
        const { data: posts } = await supabase
          .from('cms_content')
          .select('slug, updated_at, no_index')
          .eq('type', 'post')
          .eq('status', 'published')
          .or('no_index.is.null,no_index.eq.false')
          .order('published_at', { ascending: false });

        if (posts) {
          for (const post of posts) {
            entries.push({
              loc: getCanonicalUrl(baseUrl, `/blog/${post.slug}`),
              lastmod: formatDate(post.updated_at),
              changefreq: 'weekly',
              priority: '0.7',
            });
          }
        }

        // Fetch CMS pages
        const { data: pages } = await supabase
          .from('cms_content')
          .select('slug, updated_at, no_index')
          .eq('type', 'page')
          .eq('status', 'published')
          .or('no_index.is.null,no_index.eq.false')
          .not('slug', 'in', '(home,homepage,index)')
          .order('updated_at', { ascending: false });

        if (pages) {
          for (const page of pages) {
            entries.push({
              loc: getCanonicalUrl(baseUrl, `/${page.slug}`),
              lastmod: formatDate(page.updated_at),
              changefreq: 'monthly',
              priority: '0.6',
            });
          }
        }
      }

      return new Response(generateSitemapXml(entries), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    if (sitemapType === 'sellers') {
      const entries: SitemapEntry[] = [];

      // Sellers listing page
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/sellers'),
        lastmod: formatDate(null),
        changefreq: 'weekly',
        priority: '0.7',
      });

      // Fetch sellers with username
      const { data: sellerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'seller');

      if (sellerRoles && sellerRoles.length > 0) {
        const sellerIds = sellerRoles.map(r => r.user_id);
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, username, updated_at')
          .in('id', sellerIds);

        if (sellers) {
          for (const seller of sellers) {
            const sellerPath = seller.username 
              ? `/sellers/${seller.username}` 
              : `/seller/${seller.id}`;
            entries.push({
              loc: getCanonicalUrl(baseUrl, sellerPath),
              lastmod: formatDate(seller.updated_at),
              changefreq: 'weekly',
              priority: '0.7',
            });
          }
        }
      }

      return new Response(generateSitemapXml(entries), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    if (sitemapType === 'blog') {
      const entries: SitemapEntry[] = [];

      // Blog listing page
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/blog'),
        lastmod: formatDate(null),
        changefreq: 'daily',
        priority: '0.8',
      });

      const { data: posts } = await supabase
        .from('cms_content')
        .select('slug, updated_at, no_index')
        .eq('type', 'post')
        .eq('status', 'published')
        .or('no_index.is.null,no_index.eq.false')
        .order('published_at', { ascending: false });

      if (posts) {
        for (const post of posts) {
          entries.push({
            loc: getCanonicalUrl(baseUrl, `/blog/${post.slug}`),
            lastmod: formatDate(post.updated_at),
            changefreq: 'weekly',
            priority: '0.7',
          });
        }
      }

      return new Response(generateSitemapXml(entries), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    if (sitemapType === 'pages') {
      const entries: SitemapEntry[] = [];

      // Static pages
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/'),
        lastmod: formatDate(null),
        changefreq: 'daily',
        priority: '1.0',
      });
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/browse'),
        lastmod: formatDate(null),
        changefreq: 'daily',
        priority: '0.9',
      });
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/sellers'),
        lastmod: formatDate(null),
        changefreq: 'weekly',
        priority: '0.7',
      });
      
      // License pages
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/licenses'),
        lastmod: formatDate(null),
        changefreq: 'monthly',
        priority: '0.7',
      });
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/licenses/personal'),
        lastmod: formatDate(null),
        changefreq: 'monthly',
        priority: '0.6',
      });
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/licenses/commercial'),
        lastmod: formatDate(null),
        changefreq: 'monthly',
        priority: '0.6',
      });
      entries.push({
        loc: getCanonicalUrl(baseUrl, '/licenses/exclusive'),
        lastmod: formatDate(null),
        changefreq: 'monthly',
        priority: '0.6',
      });

      const { data: pages } = await supabase
        .from('cms_content')
        .select('slug, updated_at, no_index')
        .eq('type', 'page')
        .eq('status', 'published')
        .or('no_index.is.null,no_index.eq.false')
        .not('slug', 'in', '(home,homepage,index)')
        .order('updated_at', { ascending: false });

      if (pages) {
        for (const page of pages) {
          entries.push({
            loc: getCanonicalUrl(baseUrl, `/${page.slug}`),
            lastmod: formatDate(page.updated_at),
            changefreq: 'monthly',
            priority: '0.6',
          });
        }
      }

      return new Response(generateSitemapXml(entries), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    // Generate sitemap index (when needed or explicitly requested)
    if (needsIndex && sitemapType === 'index') {
      const today = formatDate(null);
      const sitemaps = [
        { name: 'songs', lastmod: today },
        { name: 'sellers', lastmod: today },
        { name: 'blog', lastmod: today },
        { name: 'pages', lastmod: today },
      ];

      return new Response(generateSitemapIndex(baseUrl, sitemaps), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    // Fallback - generate combined sitemap
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://songkart.com/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    );
  }
});
