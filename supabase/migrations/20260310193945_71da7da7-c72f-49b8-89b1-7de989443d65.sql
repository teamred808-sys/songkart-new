
-- FAQ table
CREATE TABLE public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge base table
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Response cache table
CREATE TABLE public.chat_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Add source column to chat_logs
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai';

-- RLS
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_response_cache ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active FAQ" ON public.faq FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active KB" ON public.knowledge_base FOR SELECT USING (is_active = true);
CREATE POLICY "Service can manage cache" ON public.chat_response_cache FOR ALL USING (true);
