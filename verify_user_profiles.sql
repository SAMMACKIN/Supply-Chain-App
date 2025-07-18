-- Verify user profiles are set up correctly

-- 1. Check if your user has a profile now
SELECT 
    up.*,
    au.email as auth_email,
    au.created_at as user_created
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.id = '33335e78-ff0b-4826-9b9b-3a35894bd655';

-- 2. Check all users and their profile status
SELECT 
    au.id,
    au.email,
    CASE WHEN up.user_id IS NOT NULL THEN '✓ Has Profile' ELSE '✗ Missing Profile' END as profile_status,
    up.role,
    up.business_unit
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.created_at DESC;

-- 3. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'create_user_profile_on_signup_trigger';

-- 4. Test creating a shipment line (update with a real call_off_id)
-- This should work now that user profiles exist
/*
INSERT INTO call_off_shipment_line (
    call_off_id,
    bundle_qty,
    metal_code,
    status
) VALUES (
    'e06c8c36-31a0-4746-b948-de0f1cba9b0a', -- Update this with your call_off_id
    10,
    'CU',
    'PLANNED'
) RETURNING *;
*/