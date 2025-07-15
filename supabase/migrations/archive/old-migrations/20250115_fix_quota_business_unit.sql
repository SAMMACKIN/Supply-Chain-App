-- Fix missing business_unit_id in quota table (production hotfix)
-- This migration specifically addresses the production error where business_unit_id doesn't exist
-- Date: 2025-01-15

BEGIN;

-- 1. Add the missing column to quota table
ALTER TABLE quota 
ADD COLUMN IF NOT EXISTS business_unit_id VARCHAR(20);

-- 2. Set a default value for existing rows (required since frontend expects it)
UPDATE quota 
SET business_unit_id = 'DEFAULT' 
WHERE business_unit_id IS NULL;

-- 3. Make the column NOT NULL after setting values
ALTER TABLE quota 
ALTER COLUMN business_unit_id SET NOT NULL;

-- 4. Create an index for performance
CREATE INDEX IF NOT EXISTS idx_quota_business_unit ON quota(business_unit_id);

-- 5. Add a comment for documentation
COMMENT ON COLUMN quota.business_unit_id IS 'Business unit identifier for multi-tenant isolation';

COMMIT;

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quota' 
AND column_name = 'business_unit_id';