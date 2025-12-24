-- Create content type enum
CREATE TYPE content_type AS ENUM ('page', 'post');

-- Create content status enum
CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled', 'archived');

-- Create cms_content table for pages and blog posts
CREATE TABLE public.cms_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type content_type NOT NULL DEFAULT 'page',
  
  -- Core Content
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content_json JSONB NOT NULL DEFAULT '{}',
  content_html TEXT,
  featured_image TEXT,
  
  -- Author & Status
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  
  -- SEO Fields
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  canonical_url TEXT,
  og_image TEXT,
  og_title TEXT,
  og_description TEXT,
  no_index BOOLEAN DEFAULT false,
  
  -- Metadata
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique slug constraint
  CONSTRAINT cms_content_slug_unique UNIQUE (slug)
);

-- Create cms_media table for media library
CREATE TABLE public.cms_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cms_content
CREATE POLICY "Public can view published content" 
ON public.cms_content 
FOR SELECT 
USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

CREATE POLICY "Admins can manage all content" 
ON public.cms_content 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for cms_media
CREATE POLICY "Admins can manage media" 
ON public.cms_media 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view media" 
ON public.cms_media 
FOR SELECT 
USING (true);

-- Indexes for performance
CREATE INDEX idx_cms_content_slug ON public.cms_content(slug);
CREATE INDEX idx_cms_content_type_status ON public.cms_content(type, status);
CREATE INDEX idx_cms_content_published_at ON public.cms_content(published_at DESC);
CREATE INDEX idx_cms_content_author ON public.cms_content(author_id);

-- Create updated_at trigger for cms_content
CREATE TRIGGER update_cms_content_updated_at
  BEFORE UPDATE ON public.cms_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for CMS media
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-media', 'cms-media', true);

-- Storage policies for cms-media bucket
CREATE POLICY "Anyone can view cms media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cms-media');

CREATE POLICY "Admins can upload cms media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cms-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cms media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cms-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cms media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cms-media' AND has_role(auth.uid(), 'admin'));