-- Emergency fix - find out what columns exist and fix the issue

-- 1. Show EXACTLY what columns user_profiles has
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Show a sample row to understand the structure
SELECT * FROM user_profiles LIMIT 1;

-- 3. Just create a minimal profile with only the columns that exist
-- We'll do this dynamically based on what we find
DO $$
DECLARE
    column_list TEXT;
    value_list TEXT;
BEGIN
    -- Get the list of columns (excluding user_id since we'll set it explicitly)
    SELECT string_agg(column_name, ', ')
    INTO column_list
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name != 'user_id'
    AND column_default IS NULL;  -- Skip columns with defaults
    
    RAISE NOTICE 'Columns found: %', column_list;
    
    -- Try the simplest possible insert - just user_id
    BEGIN
        INSERT INTO user_profiles (user_id) 
        VALUES ('33335e78-ff0b-4826-9b9b-3a35894bd655')
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Basic profile created/exists';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create basic profile: %', SQLERRM;
    END;
END$$;

-- 4. Check if it worked
SELECT 
    'Profile Check' as status,
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655') as profile_exists,
    EXISTS (SELECT 1 FROM auth.users WHERE id = '33335e78-ff0b-4826-9b9b-3a35894bd655') as auth_user_exists;

-- 5. If profile still doesn't exist, show what's blocking it
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL');