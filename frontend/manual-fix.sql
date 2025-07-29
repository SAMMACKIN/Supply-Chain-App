-- Manual fix for user_profiles schema issues
-- Run this in Supabase SQL Editor

-- 1. Create the user_role_enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('OPS', 'TRADE', 'PLANNER', 'ADMIN');
        RAISE NOTICE 'Created user_role_enum type';
    ELSE
        -- Ensure ADMIN value exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'user_role_enum'::regtype::oid 
            AND enumlabel = 'ADMIN'
        ) THEN
            ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'ADMIN';
            RAISE NOTICE 'Added ADMIN to user_role_enum';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error with enum type: %', SQLERRM;
END$$;

-- 2. Check what columns actually exist in user_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Insert user profile using only existing columns
-- First check if the profile already exists
DO $$
DECLARE
    v_exists BOOLEAN;
    v_user_id UUID := '33335e78-ff0b-4826-9b9b-3a35894bd655';
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = v_user_id) INTO v_exists;
    
    IF NOT v_exists THEN
        -- Try to insert with minimal fields
        BEGIN
            INSERT INTO user_profiles (user_id) 
            VALUES (v_user_id);
            RAISE NOTICE 'Created profile with just user_id';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed with minimal insert: %', SQLERRM;
            
            -- Try with role if column exists
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'user_profiles' AND column_name = 'role') THEN
                BEGIN
                    INSERT INTO user_profiles (user_id, role) 
                    VALUES (v_user_id, 'OPS'::user_role_enum);
                    RAISE NOTICE 'Created profile with user_id and role';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Failed with role: %', SQLERRM;
                END;
            END IF;
        END;
    ELSE
        RAISE NOTICE 'Profile already exists for user %', v_user_id;
    END IF;
END$$;

-- 4. Show the result
SELECT * FROM user_profiles WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655';

-- 5. If still having issues, check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 6. Create a simple function to bypass RLS for profile creation
CREATE OR REPLACE FUNCTION create_user_profile_admin(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if profile exists
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Insert minimal profile
    INSERT INTO user_profiles (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- 7. Use the function to create the profile
SELECT create_user_profile_admin('33335e78-ff0b-4826-9b9b-3a35894bd655');