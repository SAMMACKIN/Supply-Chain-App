-- Fix missing user profile

-- 1. Check if user exists in auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE id = '33335e78-ff0b-4826-9b9b-3a35894bd655';

-- 2. Check if user_profile exists
SELECT * FROM user_profiles 
WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655';

-- 3. Create missing user profile (update email and details as needed)
INSERT INTO user_profiles (
    user_id,
    email,
    display_name,
    role,
    business_unit,
    warehouse_ids,
    created_at,
    updated_at
) VALUES (
    '33335e78-ff0b-4826-9b9b-3a35894bd655',
    (SELECT email FROM auth.users WHERE id = '33335e78-ff0b-4826-9b9b-3a35894bd655'),
    'Admin User', -- Change this as needed
    'ADMIN', -- Change to appropriate role: 'VIEWER', 'OPS', 'TRADE', 'PLANNER', 'ADMIN'
    'BU001', -- Change to appropriate business unit
    ARRAY[]::text[],
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- 4. Verify it was created
SELECT * FROM user_profiles 
WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655';

-- 5. Check why call-offs can't be edited
-- First, let's see a sample call-off
SELECT 
    call_off_id,
    call_off_number,
    status,
    direction,
    created_by
FROM call_off 
LIMIT 5;