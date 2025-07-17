-- Manual migration script to fix shipment lines
-- Run this in your Supabase SQL editor

-- 1. Create shipment_line_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
    END IF;
END$$;

-- 2. Create call_off_shipment_line table
CREATE TABLE IF NOT EXISTS call_off_shipment_line (
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

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipment_lines_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_status ON call_off_shipment_line(status);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_transport ON call_off_shipment_line(transport_order_id);

-- 4. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shipment_line_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_off_shipment_line_updated_at
    BEFORE UPDATE ON call_off_shipment_line
    FOR EACH ROW
    EXECUTE FUNCTION update_shipment_line_updated_at();

-- 5. Enable RLS
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY shipment_line_select_policy ON call_off_shipment_line
    FOR SELECT USING (true);

CREATE POLICY shipment_line_insert_policy ON call_off_shipment_line
    FOR INSERT WITH CHECK (true);

CREATE POLICY shipment_line_update_policy ON call_off_shipment_line
    FOR UPDATE USING (true);

CREATE POLICY shipment_line_delete_policy ON call_off_shipment_line
    FOR DELETE USING (true);

-- 7. Fix call_off table triggers
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