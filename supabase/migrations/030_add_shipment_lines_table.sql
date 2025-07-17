-- Create shipment_line_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
    END IF;
END$$;

-- Create call_off_shipment_line table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipment_lines_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_status ON call_off_shipment_line(status);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_transport ON call_off_shipment_line(transport_order_id);

-- Create updated_at trigger
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

-- Enable RLS
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY shipment_line_select_policy ON call_off_shipment_line
    FOR SELECT USING (true);

CREATE POLICY shipment_line_insert_policy ON call_off_shipment_line
    FOR INSERT WITH CHECK (true);

CREATE POLICY shipment_line_update_policy ON call_off_shipment_line
    FOR UPDATE USING (true);

CREATE POLICY shipment_line_delete_policy ON call_off_shipment_line
    FOR DELETE USING (true);