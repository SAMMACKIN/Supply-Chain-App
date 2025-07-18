-- Quick verification script to check database setup

-- 1. Check if shipment lines table exists and has data
SELECT 
    'Shipment Lines Table' as check_item,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_off_shipment_line') as exists,
    (SELECT COUNT(*) FROM call_off_shipment_line) as row_count;

-- 2. Check if counterparty addresses table exists
SELECT 
    'Counterparty Addresses Table' as check_item,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'counterparty_addresses') as exists,
    0 as row_count;

-- 3. Check call_off table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'call_off'
AND column_name IN ('updated_at', 'delivery_address_id')
ORDER BY column_name;

-- 4. Check recent migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;

-- 5. Test creating a shipment line (you can modify the IDs)
-- Uncomment and update with a real call_off_id to test
/*
INSERT INTO call_off_shipment_line (
    call_off_id,
    bundle_qty,
    metal_code,
    status
) VALUES (
    'YOUR_CALL_OFF_ID_HERE',
    10,
    'CU',
    'PLANNED'
) RETURNING *;
*/