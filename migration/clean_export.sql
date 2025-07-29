-- Clean Export Script
-- This script removes Supabase-specific elements from your database export

-- Remove Supabase schemas (we'll handle auth differently)
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
DROP SCHEMA IF EXISTS realtime CASCADE;
DROP SCHEMA IF EXISTS extensions CASCADE;

-- Remove Supabase-specific extensions (keep the ones we need)
DROP EXTENSION IF EXISTS "pg_graphql" CASCADE;
DROP EXTENSION IF EXISTS "pg_net" CASCADE;
DROP EXTENSION IF EXISTS "pgsodium" CASCADE;
DROP EXTENSION IF EXISTS "supabase_vault" CASCADE;

-- Keep useful extensions
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Remove RLS policies (we'll handle authorization in the API)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Disable RLS on all tables
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', 
            tbl.schemaname, tbl.tablename);
    END LOOP;
END $$;

-- Remove Supabase-specific functions
DROP FUNCTION IF EXISTS auth.uid() CASCADE;
DROP FUNCTION IF EXISTS auth.role() CASCADE;
DROP FUNCTION IF EXISTS auth.email() CASCADE;

-- Remove any auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_on_signup_trigger ON auth.users;

-- Clean up any remaining auth references in user_profiles
-- This assumes you'll manage user IDs differently
COMMENT ON TABLE public.user_profiles IS 'User profiles - user_id will be managed by new auth system';

-- List what needs manual review
SELECT 'Review Required' as action, 'Check foreign key to auth.users' as description
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.table_schema = 'public'
)
UNION ALL
SELECT 'Review Required', 'Check views that might reference auth schema'
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public'
)
UNION ALL
SELECT 'Review Required', 'Check functions that might use auth context'
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
);

-- Summary
SELECT 
    'Cleanup Complete' as status,
    'Ready for import to Railway/Render' as message;