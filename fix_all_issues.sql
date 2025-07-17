-- Comprehensive fix for all database issues
-- Run this in Supabase SQL Editor to fix shipment lines and other issues

-- 1. First, let's check what exists
DO $$ 
BEGIN
    RAISE NOTICE 'Checking existing database state...';
    
    -- Check if shipment_line_status exists and drop it if it does
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        RAISE NOTICE 'Dropping existing shipment_line_status enum...';
        DROP TYPE shipment_line_status CASCADE;
    END IF;
END$$;

-- 2. Create the correct enum
CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- 3. Drop table if exists to start fresh
DROP TABLE IF EXISTS call_off_shipment_line CASCADE;

-- 4. Create the shipment lines table with correct schema
CREATE TABLE call_off_shipment_line (
    shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_off_id UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE,
    transport_order_id UUID,
    bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
    metal_code VARCHAR(12) NOT NULL,
    destination_party_id UUID,
    expected_ship_date DATE,
    delivery_location VARCHAR(255),
    requested_delivery_date DATE,
    notes TEXT,
    status shipment_line_status DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX idx_shipment_lines_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX idx_shipment_lines_status ON call_off_shipment_line(status);
CREATE INDEX idx_shipment_lines_transport ON call_off_shipment_line(transport_order_id) WHERE transport_order_id IS NOT NULL;

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shipment_line_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_call_off_shipment_line_updated_at ON call_off_shipment_line;
CREATE TRIGGER update_call_off_shipment_line_updated_at
    BEFORE UPDATE ON call_off_shipment_line
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_line_updated_at();

-- 7. Enable RLS
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;

-- 8. Create permissive RLS policies (since Edge Function uses service role)
DROP POLICY IF EXISTS shipment_line_select_policy ON call_off_shipment_line;
CREATE POLICY shipment_line_select_policy ON call_off_shipment_line
    FOR SELECT USING (true);

DROP POLICY IF EXISTS shipment_line_insert_policy ON call_off_shipment_line;
CREATE POLICY shipment_line_insert_policy ON call_off_shipment_line
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS shipment_line_update_policy ON call_off_shipment_line;
CREATE POLICY shipment_line_update_policy ON call_off_shipment_line
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS shipment_line_delete_policy ON call_off_shipment_line;
CREATE POLICY shipment_line_delete_policy ON call_off_shipment_line
    FOR DELETE USING (true);

-- 9. Fix call_off table issues
-- Ensure updated_at column exists
ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop and recreate the trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off CASCADE;
DROP FUNCTION IF EXISTS update_call_off_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_call_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_off_updated_at
    BEFORE UPDATE ON call_off
    FOR EACH ROW
    EXECUTE FUNCTION update_call_off_updated_at();

-- 10. Update any null updated_at values
UPDATE call_off 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- 11. Verify the setup
DO $$ 
BEGIN
    RAISE NOTICE 'Setup complete. Verifying...';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_off_shipment_line') THEN
        RAISE NOTICE '✓ call_off_shipment_line table exists';
    ELSE
        RAISE NOTICE '✗ call_off_shipment_line table NOT FOUND';
    END IF;
    
    -- Check if enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        RAISE NOTICE '✓ shipment_line_status enum exists';
    ELSE
        RAISE NOTICE '✗ shipment_line_status enum NOT FOUND';
    END IF;
    
    -- Check RLS
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'call_off_shipment_line' AND rowsecurity = true) THEN
        RAISE NOTICE '✓ RLS is enabled on call_off_shipment_line';
    ELSE
        RAISE NOTICE '✗ RLS is NOT enabled on call_off_shipment_line';
    END IF;
END$$;

-- Final message
SELECT 'All fixes applied. Please test creating shipment lines now.' as message;