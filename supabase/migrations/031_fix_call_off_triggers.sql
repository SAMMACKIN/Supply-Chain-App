-- Fix potential trigger issues on call_off table

-- Drop any existing problematic triggers
DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off CASCADE;

-- Ensure updated_at column exists
ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a clean updated_at trigger function
CREATE OR REPLACE FUNCTION update_call_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_call_off_updated_at
    BEFORE UPDATE ON call_off
    FOR EACH ROW
    EXECUTE FUNCTION update_call_off_updated_at();

-- Update any existing rows that might have null updated_at
UPDATE call_off 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;