-- Add missing updated_at column to call_off table
-- This column is required by the update_call_off_updated_at trigger

-- Add the updated_at column
ALTER TABLE call_off 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Set existing records' updated_at to their created_at value
UPDATE call_off 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add comment for the new column
COMMENT ON COLUMN call_off.updated_at IS 'Last modification timestamp, automatically updated by trigger';

-- Create index for performance on updated_at queries
CREATE INDEX idx_call_off_updated_at ON call_off (updated_at DESC);

-- Verify the trigger exists and works (it should now since the column exists)
-- The trigger was already created in migration 023_create_triggers.sql