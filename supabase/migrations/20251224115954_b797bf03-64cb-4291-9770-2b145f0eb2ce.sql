-- Create table for seller verification tokens
CREATE TABLE public.seller_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_verification_tokens_user ON public.seller_verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON public.seller_verification_tokens(token);

-- Enable RLS
ALTER TABLE public.seller_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own tokens" ON public.seller_verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- System/admin can manage all tokens
CREATE POLICY "Admins can manage tokens" ON public.seller_verification_tokens
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));