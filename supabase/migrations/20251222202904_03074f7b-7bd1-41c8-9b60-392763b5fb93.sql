-- Add foreign key constraints from transactions, withdrawal_requests, disputes, and activity_logs to profiles table
-- This allows embedded selects to work correctly in Supabase queries

-- 1. Add FK for transactions.buyer_id -> profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_buyer_id_profiles_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT transactions_buyer_id_profiles_fkey 
        FOREIGN KEY (buyer_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Add FK for transactions.seller_id -> profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_seller_id_profiles_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT transactions_seller_id_profiles_fkey 
        FOREIGN KEY (seller_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 3. Add FK for withdrawal_requests.user_id -> profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'withdrawal_requests_user_id_profiles_fkey' 
        AND table_name = 'withdrawal_requests'
    ) THEN
        ALTER TABLE public.withdrawal_requests 
        ADD CONSTRAINT withdrawal_requests_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 4. Add FK for disputes.raised_by -> profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'disputes_raised_by_profiles_fkey' 
        AND table_name = 'disputes'
    ) THEN
        ALTER TABLE public.disputes 
        ADD CONSTRAINT disputes_raised_by_profiles_fkey 
        FOREIGN KEY (raised_by) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 5. Add FK for disputes.against -> profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'disputes_against_profiles_fkey' 
        AND table_name = 'disputes'
    ) THEN
        ALTER TABLE public.disputes 
        ADD CONSTRAINT disputes_against_profiles_fkey 
        FOREIGN KEY (against) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 6. Add FK for activity_logs.user_id -> profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activity_logs_user_id_profiles_fkey' 
        AND table_name = 'activity_logs'
    ) THEN
        ALTER TABLE public.activity_logs 
        ADD CONSTRAINT activity_logs_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;