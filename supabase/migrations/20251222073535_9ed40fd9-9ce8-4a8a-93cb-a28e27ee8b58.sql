-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'buyer');

-- Create song status enum
CREATE TYPE public.song_status AS ENUM ('pending', 'approved', 'rejected');

-- Create license type enum  
CREATE TYPE public.license_type AS ENUM ('personal', 'youtube', 'commercial', 'film', 'exclusive');

-- Create withdrawal status enum
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'processed', 'rejected');

-- Create dispute status enum
CREATE TYPE public.dispute_status AS ENUM ('open', 'in_review', 'resolved', 'closed');

-- =====================
-- USER ROLES TABLE (Security Critical)
-- =====================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'buyer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================
-- GENRES TABLE
-- =====================
CREATE TABLE public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default genres
INSERT INTO public.genres (name) VALUES 
    ('Pop'), ('Rock'), ('Hip-Hop'), ('R&B'), ('Country'), 
    ('Electronic'), ('Jazz'), ('Classical'), ('Folk'), ('Indie'),
    ('Metal'), ('Reggae'), ('Blues'), ('Soul'), ('Funk');

-- =====================
-- MOODS TABLE
-- =====================
CREATE TABLE public.moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default moods
INSERT INTO public.moods (name) VALUES 
    ('Happy'), ('Sad'), ('Energetic'), ('Calm'), ('Romantic'),
    ('Dark'), ('Uplifting'), ('Melancholic'), ('Aggressive'), ('Dreamy'),
    ('Nostalgic'), ('Hopeful'), ('Angry'), ('Peaceful'), ('Mysterious');

-- =====================
-- SONGS TABLE
-- =====================
CREATE TABLE public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    genre_id UUID REFERENCES public.genres(id),
    mood_id UUID REFERENCES public.moods(id),
    language TEXT DEFAULT 'English',
    bpm INTEGER,
    duration INTEGER, -- in seconds
    
    -- Lyrics
    full_lyrics TEXT,
    preview_lyrics TEXT,
    
    -- Audio files
    audio_url TEXT,
    preview_audio_url TEXT,
    
    -- Cover art
    cover_image_url TEXT,
    
    -- Status
    status song_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    
    -- Pricing (base prices, can be overridden by license_tiers)
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Stats
    play_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Flags
    is_featured BOOLEAN DEFAULT false,
    has_audio BOOLEAN DEFAULT false,
    has_lyrics BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- =====================
-- LICENSE TIERS TABLE
-- =====================
CREATE TABLE public.license_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    license_type license_type NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    terms TEXT,
    is_available BOOLEAN DEFAULT true,
    max_sales INTEGER, -- NULL means unlimited (except exclusive = 1)
    current_sales INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(song_id, license_type)
);

ALTER TABLE public.license_tiers ENABLE ROW LEVEL SECURITY;

-- =====================
-- SELLER WALLETS TABLE
-- =====================
CREATE TABLE public.seller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    available_balance DECIMAL(10,2) DEFAULT 0,
    pending_balance DECIMAL(10,2) DEFAULT 0,
    withdrawal_threshold DECIMAL(10,2) DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;

-- =====================
-- TRANSACTIONS TABLE
-- =====================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    license_tier_id UUID NOT NULL REFERENCES public.license_tiers(id),
    
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    seller_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment details
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    
    -- License document
    license_pdf_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- =====================
-- WITHDRAWAL REQUESTS TABLE
-- =====================
CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status withdrawal_status DEFAULT 'pending',
    
    -- Bank/UPI details (encrypted in production)
    payout_method TEXT,
    payout_details JSONB,
    
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- =====================
-- DISPUTES TABLE
-- =====================
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id),
    raised_by UUID NOT NULL REFERENCES auth.users(id),
    against UUID NOT NULL REFERENCES auth.users(id),
    
    reason TEXT NOT NULL,
    description TEXT,
    status dispute_status DEFAULT 'open',
    
    resolution TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- =====================
-- CART TABLE
-- =====================
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    license_tier_id UUID NOT NULL REFERENCES public.license_tiers(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, song_id, license_tier_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- =====================
-- PLATFORM SETTINGS TABLE (Admin only)
-- =====================
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Insert default commission rate
INSERT INTO public.platform_settings (key, value) VALUES 
    ('commission_rate', '{"percentage": 15}'),
    ('min_withdrawal', '{"amount": 500}');

-- =====================
-- RLS POLICIES
-- =====================

-- User Roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Genres policies (public read)
CREATE POLICY "Genres are viewable by everyone" ON public.genres
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage genres" ON public.genres
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Moods policies (public read)
CREATE POLICY "Moods are viewable by everyone" ON public.moods
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage moods" ON public.moods
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Songs policies
CREATE POLICY "Approved songs are viewable by everyone" ON public.songs
    FOR SELECT USING (status = 'approved' OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can insert their own songs" ON public.songs
    FOR INSERT WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Sellers can update their own songs" ON public.songs
    FOR UPDATE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can delete their own pending songs" ON public.songs
    FOR DELETE USING (auth.uid() = seller_id AND status = 'pending');

-- License Tiers policies
CREATE POLICY "License tiers are viewable by everyone" ON public.license_tiers
    FOR SELECT USING (true);

CREATE POLICY "Song owners can manage license tiers" ON public.license_tiers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND seller_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

-- Seller Wallets policies
CREATE POLICY "Sellers can view their own wallet" ON public.seller_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage wallets" ON public.seller_wallets
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can insert their own wallet" ON public.seller_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Withdrawal Requests policies
CREATE POLICY "Sellers can view their own withdrawals" ON public.withdrawal_requests
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can request withdrawals" ON public.withdrawal_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Disputes policies
CREATE POLICY "Involved parties can view disputes" ON public.disputes
    FOR SELECT USING (auth.uid() = raised_by OR auth.uid() = against OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can raise disputes" ON public.disputes
    FOR INSERT WITH CHECK (auth.uid() = raised_by);

CREATE POLICY "Admins can manage disputes" ON public.disputes
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Cart policies
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

-- Platform Settings policies
CREATE POLICY "Settings are viewable by everyone" ON public.platform_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.platform_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- FUNCTIONS & TRIGGERS
-- =====================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    selected_role app_role;
BEGIN
    -- Get role from metadata, default to 'buyer'
    selected_role := COALESCE(
        (NEW.raw_user_meta_data ->> 'role')::app_role, 
        'buyer'
    );
    
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, selected_role);
    
    -- If seller, create wallet
    IF selected_role = 'seller' THEN
        INSERT INTO public.seller_wallets (user_id)
        VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON public.songs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_wallets_updated_at
    BEFORE UPDATE ON public.seller_wallets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(song_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.songs SET view_count = view_count + 1 WHERE id = song_uuid;
END;
$$;

-- Function to increment play count
CREATE OR REPLACE FUNCTION public.increment_play_count(song_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.songs SET play_count = play_count + 1 WHERE id = song_uuid;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_songs_seller_id ON public.songs(seller_id);
CREATE INDEX idx_songs_status ON public.songs(status);
CREATE INDEX idx_songs_genre ON public.songs(genre_id);
CREATE INDEX idx_songs_mood ON public.songs(mood_id);
CREATE INDEX idx_songs_featured ON public.songs(is_featured) WHERE is_featured = true;
CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX idx_license_tiers_song ON public.license_tiers(song_id);