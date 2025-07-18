-- Fix user profiles based on actual schema

-- First, let's see what columns exist
DO $$ 
DECLARE
    has_email_column BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'email'
    ) INTO has_email_column;
    
    IF has_email_column THEN
        RAISE NOTICE 'user_profiles table has email column';
    ELSE
        RAISE NOTICE 'user_profiles table does NOT have email column';
    END IF;
END$$;

-- Create user profiles for missing users
-- This version doesn't assume email column exists
INSERT INTO user_profiles (
    user_id,
    display_name,
    role,
    business_unit,
    warehouse_ids,
    created_at,
    updated_at
)
SELECT 
    au.id as user_id,
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
    COALESCE(au.raw_user_meta_data->>'role', 'OPS')::"UserRole" as role,
    COALESCE(au.raw_user_meta_data->>'business_unit', 'BU001') as business_unit,
    COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(au.raw_user_meta_data->'warehouse_ids')), 
        ARRAY[]::text[]
    ) as warehouse_ids,
    au.created_at,
    au.created_at as updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- Check if it worked
SELECT 
    au.id,
    au.email,
    up.user_id,
    up.display_name,
    up.role,
    CASE WHEN up.user_id IS NOT NULL THEN '✓ Has Profile' ELSE '✗ Missing Profile' END as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.created_at DESC;

-- Specifically check your user
SELECT 
    'Your User Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655')
        THEN '✓ Profile exists'
        ELSE '✗ Profile missing'
    END as status;