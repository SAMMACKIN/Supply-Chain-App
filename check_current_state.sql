-- Check current database state

-- 1. List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if specific tables exist
SELECT 
    'call_off_shipment_line' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_off_shipment_line') as exists
UNION ALL
SELECT 
    'counterparty_addresses' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'counterparty_addresses') as exists;

-- 3. Check columns in call_off table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_off' 
ORDER BY ordinal_position;

-- 4. Check what migrations Supabase thinks have been applied
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;