-- Create admin_bug_reports table for bug tracking
CREATE TABLE public.admin_bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_section TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  reporter_id UUID REFERENCES public.profiles(id),
  assignee_id UUID REFERENCES public.profiles(id),
  screenshots JSONB DEFAULT '[]'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  internal_notes JSONB DEFAULT '[]'::jsonb,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create system_error_logs table for automatic error tracking
CREATE TABLE public.system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  module TEXT NOT NULL,
  action_performed TEXT,
  user_id UUID REFERENCES public.profiles(id),
  severity TEXT DEFAULT 'error',
  context JSONB DEFAULT '{}'::jsonb,
  browser_info JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  linked_bug_report_id UUID REFERENCES public.admin_bug_reports(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.admin_bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_bug_reports - Admin only
CREATE POLICY "Admins can manage bug reports"
ON public.admin_bug_reports
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for system_error_logs - Admin only
CREATE POLICY "Admins can manage error logs"
ON public.system_error_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on admin_bug_reports
CREATE TRIGGER update_admin_bug_reports_updated_at
BEFORE UPDATE ON public.admin_bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();