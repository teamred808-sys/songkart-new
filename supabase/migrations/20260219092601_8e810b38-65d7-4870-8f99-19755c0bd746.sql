
-- Create cms_categories table
CREATE TABLE public.cms_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cms_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.cms_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.cms_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create cms_content_categories junction table
CREATE TABLE public.cms_content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.cms_content(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.cms_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, category_id)
);

ALTER TABLE public.cms_content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read content categories" ON public.cms_content_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage content categories" ON public.cms_content_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
