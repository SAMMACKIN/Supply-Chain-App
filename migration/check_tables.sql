-- Check what tables exist in the database
-- Run this in Supabase SQL Editor

-- List all tables with row counts
SELECT 
    schemaname as schema,
    tablename as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all custom types/enums
SELECT 
    n.nspname as schema,
    t.typname as type_name,
    CASE t.typtype
        WHEN 'e' THEN 'enum'
        WHEN 'c' THEN 'composite'
        ELSE 'other'
    END as type_kind
FROM pg_type t
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
AND t.typtype IN ('e', 'c')
ORDER BY type_name;

-- Check if critical tables exist
SELECT 
    'Tables Check' as check_type,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quota') as quota_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'call_off') as call_off_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'call_off_shipment_line') as shipment_line_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'counterparty') as counterparty_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') as user_profiles_exists;

-- Get total data size
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';