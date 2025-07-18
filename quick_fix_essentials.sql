-- Quick fix for essential issues

-- 1. Fix user profiles (without email column)
INSERT INTO user_profiles (
    user_id,
    display_name,
    role,
    business_unit,
    warehouse_ids,
    created_at,
    updated_at
)
VALUES (
    '33335e78-ff0b-4826-9b9b-3a35894bd655',
    'Admin User',
    'ADMIN'::"UserRole",
    'BU001',
    ARRAY[]::text[],
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- 2. Ensure call_off has updated_at column
ALTER TABLE call_off ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Check results
SELECT 
    'User Profile' as check_item,
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655') as exists
UNION ALL
SELECT 
    'Shipment Lines Table' as check_item,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_off_shipment_line') as exists
UNION ALL
SELECT 
    'Call-off updated_at' as check_item,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_off' AND column_name = 'updated_at') as exists;