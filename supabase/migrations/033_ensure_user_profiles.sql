-- Ensure all auth users have corresponding user profiles

-- Create user_profiles for any auth users that don't have one
INSERT INTO user_profiles (
    user_id,
    email,
    display_name,
    role,
    business_unit,
    warehouse_ids,
    created_at,
    updated_at
)
SELECT 
    au.id as user_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
    COALESCE(au.raw_user_meta_data->>'role', 'OPS') as role,
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

-- Create a trigger to automatically create user_profiles when new users sign up
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        email,
        display_name,
        role,
        business_unit,
        warehouse_ids,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'OPS'),
        COALESCE(NEW.raw_user_meta_data->>'business_unit', 'BU001'),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'warehouse_ids')), 
            ARRAY[]::text[]
        ),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_on_signup_trigger ON auth.users;

-- Create the trigger
CREATE TRIGGER create_user_profile_on_signup_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_on_signup();

-- Verify the migration worked
DO $$ 
DECLARE
    missing_profiles INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO missing_profiles 
    FROM auth.users au 
    LEFT JOIN user_profiles up ON au.id = up.user_id 
    WHERE up.user_id IS NULL;
    
    RAISE NOTICE 'Total auth users: %', total_users;
    RAISE NOTICE 'Missing profiles: %', missing_profiles;
    
    IF missing_profiles = 0 THEN
        RAISE NOTICE '✓ All users have profiles';
    ELSE
        RAISE WARNING '✗ % users still missing profiles', missing_profiles;
    END IF;
END$$;