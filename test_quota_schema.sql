-- Quick test to check if business_unit_id column exists in quota table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quota' 
ORDER BY ordinal_position;