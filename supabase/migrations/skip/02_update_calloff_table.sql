-- Step 2: Update call_off table with missing columns

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'updated_at') THEN
        ALTER TABLE call_off ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add location columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'fulfillment_location') THEN
        ALTER TABLE call_off ADD COLUMN fulfillment_location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off ADD COLUMN delivery_location VARCHAR(255);
    END IF;
END $$;

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to call_off table
DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off;
CREATE TRIGGER update_call_off_updated_at 
BEFORE UPDATE ON call_off 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_off' 
AND column_name IN ('updated_at', 'fulfillment_location', 'delivery_location');