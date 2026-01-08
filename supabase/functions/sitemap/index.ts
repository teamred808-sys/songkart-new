import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get base URL from request or environment
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get('baseUrl') || 'https://songkart.com';

    // Fetch all approved songs
    const { data: songs } = await supabase
      .from('songs')
      .select('id, updated_at, no_index')
      .eq('status', 'approved')
      .or('no_index.is.null,no_index.eq.false');

    // Fetch all published blog posts
    const { data: posts } = await supabase
      .from('cms_content')
      .select('slug, updated_at, no_index')
      .eq('type', 'post')
      .eq('status', 'published')
      .or('no_index.is.null,no_index.eq.false');

    // Fetch all published pages (excluding reserved slugs)
    const { data: pages } = await supabase
      .from('cms_content')
      .select('slug, updated_at, no_index')
      .eq('type', 'page')
      .eq('status', 'published')
      .or('no_index.is.null,no_index.eq.false')
      .not('slug', 'in', '(home,homepage,index)');

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/browse</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/sellers</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add song pages
    if (songs && songs.length > 0) {
      sitemap += '\n  <!-- Song Pages -->\n';
      for (const song of songs) {
        const lastmod = song.updated_at ? new Date(song.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        sitemap += `  <url>
    <loc>${baseUrl}/song/${song.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add blog posts
    if (posts && posts.length > 0) {
      sitemap += '\n  <!-- Blog Posts -->\n';
      for (const post of posts) {
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        sitemap += `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Add CMS pages
    if (pages && pages.length > 0) {
      sitemap += '\n  <!-- CMS Pages -->\n';
      for (const page of pages) {
        const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        sitemap += `  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    sitemap += '</urlset>';

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
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
      { headers: corsHeaders }
    );
  }
});
