-- Audio playback sessions for tracking and rate limiting
CREATE TABLE public.audio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  started_at timestamptz DEFAULT now(),
  last_access timestamptz DEFAULT now(),
  play_count integer DEFAULT 0,
  is_valid boolean DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for audio_sessions
CREATE POLICY "Users can view their own sessions"
ON public.audio_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all sessions"
ON public.audio_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own sessions"
ON public.audio_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Abuse detection flags
CREATE TABLE public.abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  device_fingerprint text,
  flag_type text NOT NULL,
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}',
  action_taken text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for abuse_flags
CREATE POLICY "Admins can manage abuse flags"
ON public.abuse_flags FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Forensic watermark tracking for purchased audio
CREATE TABLE public.audio_watermarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  watermark_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_watermarks ENABLE ROW LEVEL SECURITY;

-- RLS policies for audio_watermarks
CREATE POLICY "Admins can manage watermarks"
ON public.audio_watermarks FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers can view their own watermarks"
ON public.audio_watermarks FOR SELECT
USING (auth.uid() = buyer_id);

-- Piracy reports and takedown records
CREATE TABLE public.piracy_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  watermark_code text,
  reported_url text,
  platform text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'takedown_sent', 'resolved', 'dismissed')),
  evidence jsonb DEFAULT '[]',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.piracy_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for piracy_reports
CREATE POLICY "Admins can manage piracy reports"
ON public.piracy_reports FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view reports on their songs"
ON public.piracy_reports FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = piracy_reports.song_id 
  AND songs.seller_id = auth.uid()
));

CREATE POLICY "Sellers can create reports for their songs"
ON public.piracy_reports FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_id 
  AND songs.seller_id = auth.uid()
));

-- Add exclusive license tracking columns to songs
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS exclusive_sold boolean DEFAULT false;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS exclusive_buyer_id uuid REFERENCES auth.users(id);
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS exclusive_sold_at timestamptz;

-- Add anti-piracy platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('preview_duration_seconds', '{"min": 30, "max": 60, "default": 45}'),
  ('preview_watermark_enabled', 'true'),
  ('purchased_watermark_enabled', 'true'),
  ('max_concurrent_sessions', '3'),
  ('session_token_expiry_minutes', '15'),
  ('abuse_threshold_plays_per_hour', '50'),
  ('abuse_threshold_ips_per_day', '10'),
  ('auto_ban_on_critical_abuse', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_audio_sessions_user_id ON public.audio_sessions(user_id);
CREATE INDEX idx_audio_sessions_song_id ON public.audio_sessions(song_id);
CREATE INDEX idx_audio_sessions_token ON public.audio_sessions(session_token);
CREATE INDEX idx_audio_sessions_expires ON public.audio_sessions(expires_at);
CREATE INDEX idx_abuse_flags_user_id ON public.abuse_flags(user_id);
CREATE INDEX idx_abuse_flags_ip ON public.abuse_flags(ip_address);
CREATE INDEX idx_abuse_flags_severity ON public.abuse_flags(severity);
CREATE INDEX idx_audio_watermarks_code ON public.audio_watermarks(watermark_code);
CREATE INDEX idx_audio_watermarks_buyer ON public.audio_watermarks(buyer_id);
CREATE INDEX idx_piracy_reports_song ON public.piracy_reports(song_id);
CREATE INDEX idx_piracy_reports_status ON public.piracy_reports(status);