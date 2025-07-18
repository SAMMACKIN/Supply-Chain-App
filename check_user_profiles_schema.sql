-- Check the actual schema of user_profiles table

-- 1. List all columns in user_profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Check if the table exists at all
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
) as user_profiles_exists;

-- 3. Show the CREATE statement for user_profiles (if you have access)
-- This might not work depending on permissions
SELECT 
    'CREATE TABLE ' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        data_type || 
        CASE WHEN character_maximum_length IS NOT NULL 
             THEN '(' || character_maximum_length || ')' 
             ELSE '' 
        END ||
        CASE WHEN is_nullable = 'NO' 
             THEN ' NOT NULL' 
             ELSE '' 
        END ||
        CASE WHEN column_default IS NOT NULL 
             THEN ' DEFAULT ' || column_default 
             ELSE '' 
        END,
        ', '
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_name = 'user_profiles'
GROUP BY table_name;