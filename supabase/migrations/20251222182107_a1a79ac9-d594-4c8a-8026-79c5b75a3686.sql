-- Create license_templates table for versioned legal templates
CREATE TABLE public.license_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_type public.license_type NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  template_name TEXT NOT NULL,
  legal_clauses JSONB NOT NULL DEFAULT '{}',
  permitted_uses TEXT[] NOT NULL DEFAULT '{}',
  prohibited_uses TEXT[] NOT NULL DEFAULT '{}',
  ownership_clause TEXT NOT NULL,
  warranty_disclaimer TEXT NOT NULL,
  indemnification_clause TEXT NOT NULL,
  termination_conditions TEXT NOT NULL,
  governing_law TEXT DEFAULT 'Laws of India',
  platform_disclaimer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(license_type, version)
);

-- Create license_documents table for generated licenses
CREATE TABLE public.license_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number TEXT NOT NULL UNIQUE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.license_templates(id),
  template_version INTEGER NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  song_id UUID NOT NULL,
  buyer_name TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  license_type public.license_type NOT NULL,
  price NUMERIC NOT NULL,
  document_hash TEXT NOT NULL,
  pdf_storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create private storage bucket for license documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('license-documents', 'license-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on license_templates
ALTER TABLE public.license_templates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on license_documents  
ALTER TABLE public.license_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for license_templates
CREATE POLICY "Anyone can view active templates"
ON public.license_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.license_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for license_documents
CREATE POLICY "Buyers can view their own licenses"
ON public.license_documents FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view licenses for their songs"
ON public.license_documents FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all licenses"
ON public.license_documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for license-documents bucket
CREATE POLICY "Buyers can download their licenses"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'license-documents' 
  AND EXISTS (
    SELECT 1 FROM public.license_documents ld 
    WHERE ld.pdf_storage_path = name 
    AND ld.buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view licenses for their songs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'license-documents'
  AND EXISTS (
    SELECT 1 FROM public.license_documents ld 
    WHERE ld.pdf_storage_path = name 
    AND ld.seller_id = auth.uid()
  )
);

CREATE POLICY "Admins have full access to licenses"
ON storage.objects FOR ALL
USING (
  bucket_id = 'license-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Insert default license templates
INSERT INTO public.license_templates (license_type, version, template_name, permitted_uses, prohibited_uses, ownership_clause, warranty_disclaimer, indemnification_clause, termination_conditions, platform_disclaimer, legal_clauses) VALUES
(
  'personal',
  1,
  'Personal Non-Exclusive License',
  ARRAY['Personal listening and enjoyment', 'Private non-commercial projects', 'Personal video background music (not for distribution)'],
  ARRAY['Commercial use of any kind', 'Public performance or broadcast', 'Resale, sublicensing, or redistribution', 'Modification or creation of derivative works for commercial purposes'],
  'The Licensor retains all ownership rights, including copyright, in and to the Song. This license grants only the specific usage rights outlined herein.',
  'THE SONG IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. THE LICENSOR DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.',
  'The Licensee agrees to indemnify and hold harmless the Licensor and the Platform from any claims, damages, or expenses arising from the Licensee''s use of the Song beyond the scope of this license.',
  'This license may be terminated immediately if the Licensee breaches any terms. Upon termination, the Licensee must cease all use of the Song and destroy any copies.',
  'This license is facilitated by the Platform acting solely as an intermediary. The Platform does not guarantee the originality of the Song and is not liable for any disputes between Licensor and Licensee.',
  '{"territory": "Worldwide", "duration": "Perpetual", "exclusivity": "Non-Exclusive", "credit_required": false}'::jsonb
),
(
  'youtube',
  1,
  'YouTube/Social Media License',
  ARRAY['Monetized YouTube videos', 'Social media content (Instagram, TikTok, Facebook, etc.)', 'Podcasts and audio-visual presentations', 'Streaming content on platforms like Twitch'],
  ARRAY['Television or radio broadcast', 'Film or theatrical releases', 'Resale or sublicensing', 'Use in content that promotes illegal activities or hate speech'],
  'The Licensor retains all ownership rights, including copyright, in and to the Song. The Licensee receives a non-exclusive license for the specified uses only.',
  'THE SONG IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. THE LICENSOR DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.',
  'The Licensee agrees to indemnify and hold harmless the Licensor and the Platform from any claims arising from the use of the Song in their content.',
  'This license may be terminated for breach of terms. The Licensee must remove the Song from all published content within 30 days of termination notice.',
  'The Platform acts as an intermediary and does not guarantee Content ID clearance. The Licensee should retain proof of license for any copyright disputes.',
  '{"territory": "Worldwide", "duration": "Perpetual", "exclusivity": "Non-Exclusive", "credit_required": true, "monetization_allowed": true}'::jsonb
),
(
  'commercial',
  1,
  'Commercial Non-Exclusive License',
  ARRAY['Advertising and marketing campaigns', 'Corporate presentations and videos', 'Commercial websites and applications', 'Product demonstrations', 'Background music for businesses'],
  ARRAY['Exclusive ownership or full buyout', 'Resale as a standalone music product', 'Use in adult content or illegal activities', 'Sublicensing to third parties'],
  'The Licensor retains full ownership and copyright. The Licensee receives a non-exclusive commercial license for the specified uses.',
  'THE SONG IS PROVIDED "AS IS". THE LICENSOR MAKES NO WARRANTIES REGARDING THIRD-PARTY SAMPLE CLEARANCES OR COPYRIGHT CLAIMS.',
  'The Licensee shall indemnify the Licensor and Platform against all claims arising from commercial use, including but not limited to advertising disputes.',
  'License terminates upon material breach. Commercial content must be modified or removed within 60 days of termination.',
  'The Platform facilitates this transaction as an intermediary. Commercial users should conduct their own due diligence regarding music rights.',
  '{"territory": "Worldwide", "duration": "Perpetual", "exclusivity": "Non-Exclusive", "credit_required": false, "commercial_use": true, "max_impressions": "Unlimited"}'::jsonb
),
(
  'film',
  1,
  'Film/TV Sync License',
  ARRAY['Feature films and documentaries', 'Television shows and series', 'Streaming platform content (Netflix, Prime, etc.)', 'Short films and independent productions', 'Music videos'],
  ARRAY['Theatrical release without separate negotiation for major distributions', 'Use in projects promoting violence or illegal activities', 'Sublicensing or transfer without written consent', 'Modification of the Song without Licensor approval'],
  'The Licensor retains ownership and copyright. The Licensee receives synchronization rights for audio-visual productions as specified.',
  'THE LICENSOR WARRANTS THEY HAVE THE RIGHT TO GRANT THIS LICENSE. NO OTHER WARRANTIES ARE PROVIDED.',
  'The Licensee indemnifies the Licensor and Platform against claims arising from the production, including performer rights and union disputes.',
  'License may be terminated for breach. Existing distributed content may continue but no new productions or distributions are permitted.',
  'The Platform acts as intermediary only. For major theatrical releases or network television, additional rights negotiations may be required.',
  '{"territory": "Worldwide", "duration": "Perpetual", "exclusivity": "Non-Exclusive", "sync_rights": true, "distribution_limit": "Unlimited"}'::jsonb
),
(
  'exclusive',
  1,
  'Exclusive Full Rights License',
  ARRAY['All commercial and non-commercial uses', 'Full synchronization rights', 'Right to modify and create derivative works', 'Right to register with PROs and collection societies', 'Right to sublicense (with restrictions)'],
  ARRAY['Claim of original authorship/composition', 'Use that defames the original creator', 'Resale of the exclusive license without Licensor consent'],
  'Upon full payment, all rights, title, and interest in the Song transfer to the Licensee. The Licensor waives all future claims except moral rights where applicable under law.',
  'THE LICENSOR WARRANTS ORIGINAL CREATION AND FULL RIGHTS TO TRANSFER. THE SONG IS PROVIDED "AS IS" WITH NO OTHER WARRANTIES.',
  'The Licensee assumes all liability for future use. The Licensor is indemnified against all future claims arising from the Licensee''s use.',
  'This license is irrevocable upon full payment except in cases of fraud or material misrepresentation.',
  'The Platform facilitates this exclusive transfer as intermediary. Post-transfer disputes are between Licensor and Licensee directly.',
  '{"territory": "Worldwide", "duration": "Perpetual", "exclusivity": "Exclusive", "full_transfer": true, "modification_rights": true}'::jsonb
);

-- Create trigger for updated_at
CREATE TRIGGER update_license_templates_updated_at
BEFORE UPDATE ON public.license_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_license_documents_buyer_id ON public.license_documents(buyer_id);
CREATE INDEX idx_license_documents_seller_id ON public.license_documents(seller_id);
CREATE INDEX idx_license_documents_order_item_id ON public.license_documents(order_item_id);
CREATE INDEX idx_license_templates_type_active ON public.license_templates(license_type, is_active);