-- Fix the updated_at column issue for call_off table
-- Run this in the Supabase SQL Editor

-- 1. First drop the problematic trigger
DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off;

-- 2. Add the updated_at column if it doesn't exist
ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. Update existing records to have updated_at = created_at
UPDATE call_off 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 4. Recreate the trigger
CREATE TRIGGER update_call_off_updated_at 
BEFORE UPDATE ON call_off 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_call_off_updated_at ON call_off (updated_at DESC);

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'call_off' 
  AND column_name = 'updated_at';