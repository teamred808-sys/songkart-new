-- Create activity_logs table for audit trail
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read activity logs
CREATE POLICY "Admins can view activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create featured_content table
CREATE TABLE public.featured_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid,
  title text,
  description text,
  image_url text,
  link_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on featured_content
ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

-- Everyone can view active featured content
CREATE POLICY "Public can view active featured content"
ON public.featured_content
FOR SELECT
USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- Admins can manage all featured content
CREATE POLICY "Admins can manage featured content"
ON public.featured_content
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add account control columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS upload_limit integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS fraud_flags jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_documents jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create trigger for featured_content updated_at
CREATE TRIGGER update_featured_content_updated_at
BEFORE UPDATE ON public.featured_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster activity log queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);

-- Create index for featured content
CREATE INDEX idx_featured_content_active ON public.featured_content(is_active, display_order);