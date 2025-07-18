-- Fix user profiles with actual schema
-- This script adapts to whatever columns actually exist

-- 1. First, check what columns we actually have
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Create a minimal profile insert that will work with any schema
-- This uses dynamic SQL to only insert into columns that exist
DO $$
DECLARE
    v_columns TEXT;
    v_values TEXT;
    v_user_id UUID := '33335e78-ff0b-4826-9b9b-3a35894bd655';
BEGIN
    -- Build column list dynamically based on what exists
    SELECT 
        string_agg(
            CASE column_name
                WHEN 'user_id' THEN 'user_id'
                WHEN 'display_name' THEN 'display_name'
                WHEN 'email' THEN 'email'
                WHEN 'role' THEN 'role'
                WHEN 'business_unit' THEN 'business_unit'
                WHEN 'warehouse_ids' THEN 'warehouse_ids'
                WHEN 'created_at' THEN 'created_at'
                WHEN 'updated_at' THEN 'updated_at'
                ELSE NULL
            END, ', '
        ),
        string_agg(
            CASE column_name
                WHEN 'user_id' THEN quote_literal(v_user_id::TEXT)
                WHEN 'display_name' THEN quote_literal('Admin User')
                WHEN 'email' THEN '(SELECT email FROM auth.users WHERE id = ' || quote_literal(v_user_id::TEXT) || ')'
                WHEN 'role' THEN quote_literal('ADMIN') || '::' || quote_ident('UserRole')
                WHEN 'business_unit' THEN quote_literal('BU001')
                WHEN 'warehouse_ids' THEN 'ARRAY[]::text[]'
                WHEN 'created_at' THEN 'NOW()'
                WHEN 'updated_at' THEN 'NOW()'
                ELSE NULL
            END, ', '
        )
    INTO v_columns, v_values
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name IN ('user_id', 'display_name', 'email', 'role', 'business_unit', 'warehouse_ids', 'created_at', 'updated_at');

    -- Execute the insert
    IF v_columns IS NOT NULL THEN
        EXECUTE format(
            'INSERT INTO user_profiles (%s) VALUES (%s) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()',
            v_columns,
            v_values
        );
        RAISE NOTICE 'Profile created/updated for user %', v_user_id;
    ELSE
        RAISE NOTICE 'No recognized columns found in user_profiles table';
    END IF;
END$$;

-- 3. Create profiles for all auth users
DO $$
DECLARE
    v_user RECORD;
    v_columns TEXT;
    v_values TEXT;
BEGIN
    -- Get column list once
    SELECT 
        string_agg(
            CASE 
                WHEN column_name IN ('user_id', 'display_name', 'email', 'role', 'business_unit', 'warehouse_ids', 'created_at', 'updated_at') 
                THEN column_name 
                ELSE NULL 
            END, ', '
        )
    INTO v_columns
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name IN ('user_id', 'display_name', 'email', 'role', 'business_unit', 'warehouse_ids', 'created_at', 'updated_at');

    -- Create profile for each user that doesn't have one
    FOR v_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN user_profiles up ON au.id = up.user_id
        WHERE up.user_id IS NULL
    LOOP
        BEGIN
            -- Build values based on available columns
            SELECT string_agg(
                CASE column_name
                    WHEN 'user_id' THEN quote_literal(v_user.id::TEXT)
                    WHEN 'display_name' THEN quote_literal(COALESCE(v_user.raw_user_meta_data->>'display_name', split_part(v_user.email, '@', 1)))
                    WHEN 'email' THEN quote_literal(v_user.email)
                    WHEN 'role' THEN quote_literal(COALESCE(v_user.raw_user_meta_data->>'role', 'OPS')) || '::' || quote_ident('UserRole')
                    WHEN 'business_unit' THEN quote_literal(COALESCE(v_user.raw_user_meta_data->>'business_unit', 'BU001'))
                    WHEN 'warehouse_ids' THEN 'ARRAY[]::text[]'
                    WHEN 'created_at' THEN quote_literal(v_user.created_at::TEXT) || '::TIMESTAMPTZ'
                    WHEN 'updated_at' THEN 'NOW()'
                    ELSE NULL
                END, ', '
            )
            INTO v_values
            FROM information_schema.columns
            WHERE table_name = 'user_profiles'
            AND column_name IN ('user_id', 'display_name', 'email', 'role', 'business_unit', 'warehouse_ids', 'created_at', 'updated_at');

            IF v_columns IS NOT NULL AND v_values IS NOT NULL THEN
                EXECUTE format('INSERT INTO user_profiles (%s) VALUES (%s)', v_columns, v_values);
                RAISE NOTICE 'Created profile for user %', v_user.email;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create profile for %: %', v_user.email, SQLERRM;
        END;
    END LOOP;
END$$;

-- 4. Update the AuthProvider fallback
-- Since we don't know which columns exist, create a generic insert function
CREATE OR REPLACE FUNCTION create_user_profile_safe(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_columns TEXT;
    v_values TEXT;
BEGIN
    -- Build insert dynamically based on existing columns
    SELECT 
        string_agg(
            CASE 
                WHEN column_name = 'user_id' THEN 'user_id'
                WHEN column_name = 'display_name' THEN 'display_name'
                WHEN column_name = 'email' THEN 'email'
                WHEN column_name = 'role' THEN 'role'
                WHEN column_name = 'business_unit' THEN 'business_unit'
                WHEN column_name = 'warehouse_ids' THEN 'warehouse_ids'
                WHEN column_name = 'created_at' THEN 'created_at'
                WHEN column_name = 'updated_at' THEN 'updated_at'
                ELSE NULL
            END, ', '
        ),
        string_agg(
            CASE 
                WHEN column_name = 'user_id' THEN quote_literal(p_user_id::TEXT)
                WHEN column_name = 'display_name' THEN quote_literal(split_part(p_email, '@', 1))
                WHEN column_name = 'email' THEN quote_literal(p_email)
                WHEN column_name = 'role' THEN quote_literal('OPS') || '::' || quote_ident('UserRole')
                WHEN column_name = 'business_unit' THEN quote_literal('BU001')
                WHEN column_name = 'warehouse_ids' THEN 'ARRAY[]::text[]'
                WHEN column_name = 'created_at' THEN 'NOW()'
                WHEN column_name = 'updated_at' THEN 'NOW()'
                ELSE NULL
            END, ', '
        )
    INTO v_columns, v_values
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name IN ('user_id', 'display_name', 'email', 'role', 'business_unit', 'warehouse_ids', 'created_at', 'updated_at');

    IF v_columns IS NOT NULL THEN
        EXECUTE format(
            'INSERT INTO user_profiles (%s) VALUES (%s) ON CONFLICT (user_id) DO NOTHING',
            v_columns,
            v_values
        );
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Verify results
SELECT 
    'Total Auth Users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Users with Profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Missing Profiles' as metric,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- Check your specific user
SELECT 
    'Your User Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655')
        THEN '✓ Profile exists'
        ELSE '✗ Profile missing - Run this script to fix!'
    END as status;