-- Create license tier definitions table (backend-driven licensing)
CREATE TABLE public.license_tier_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key text UNIQUE NOT NULL, -- 'personal', 'commercial', 'exclusive'
  name text NOT NULL,
  display_order integer NOT NULL,
  description text,
  rights jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create license rights labels table for UI display
CREATE TABLE public.license_rights_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  right_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  tooltip text,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.license_tier_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_rights_labels ENABLE ROW LEVEL SECURITY;

-- RLS policies - anyone can read, only admins can modify
CREATE POLICY "Anyone can view tier definitions" ON public.license_tier_definitions
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tier definitions" ON public.license_tier_definitions
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view rights labels" ON public.license_rights_labels
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage rights labels" ON public.license_rights_labels
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert the three license tiers with their rights
INSERT INTO public.license_tier_definitions (tier_key, name, display_order, description, rights) VALUES
('personal', 'Personal', 1, 'For personal, non-commercial use only', '{
  "personal_use": true,
  "youtube": false,
  "streaming": false,
  "ads_marketing": false,
  "full_ownership": false
}'::jsonb),
('commercial', 'Commercial', 2, 'For commercial use including monetization', '{
  "personal_use": true,
  "youtube": true,
  "streaming": true,
  "ads_marketing": true,
  "full_ownership": false
}'::jsonb),
('exclusive', 'Exclusive', 3, 'Full ownership - removed from marketplace', '{
  "personal_use": true,
  "youtube": true,
  "streaming": true,
  "ads_marketing": true,
  "full_ownership": true
}'::jsonb);

-- Insert rights labels with tooltips
INSERT INTO public.license_rights_labels (right_key, display_name, tooltip, display_order) VALUES
('personal_use', 'Personal Use', 'Use in personal videos, demos, and non-commercial content', 1),
('youtube', 'YouTube', 'Earn ad revenue on YouTube without copyright claims', 2),
('streaming', 'Streaming', 'Use on Twitch, podcasts, and other streaming platforms', 3),
('ads_marketing', 'Ads & Marketing', 'Use in ads, commercials, and promotional content', 4),
('full_ownership', 'Full Ownership', 'Complete ownership - song is removed from marketplace', 5);

-- Add rights_snapshot column to license_documents for immutability
ALTER TABLE public.license_documents 
ADD COLUMN IF NOT EXISTS rights_snapshot jsonb DEFAULT '{}'::jsonb;

-- Create trigger for updated_at
CREATE TRIGGER update_license_tier_definitions_updated_at
BEFORE UPDATE ON public.license_tier_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();