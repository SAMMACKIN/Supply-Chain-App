-- Create call_off_shipment_line table for shipment planning
-- Migration: 004_create_call_off_shipment_line_table.sql
-- Created: July 12, 2025

CREATE TABLE call_off_shipment_line (
  -- Primary key
  shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  call_off_id UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE,
  transport_order_id UUID, -- References transport_order(transport_order_id), added later
  
  -- Shipment details
  bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
  metal_code VARCHAR(12) NOT NULL,
  destination_party_id UUID,
  expected_ship_date DATE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE call_off_shipment_line IS 'Shipment lines for call-offs, enabling split deliveries';
COMMENT ON COLUMN call_off_shipment_line.shipment_line_id IS 'Unique shipment line identifier';
COMMENT ON COLUMN call_off_shipment_line.call_off_id IS 'Parent call-off reference';
COMMENT ON COLUMN call_off_shipment_line.transport_order_id IS 'Assigned transport order (NULL until planned)';
COMMENT ON COLUMN call_off_shipment_line.bundle_qty IS 'Quantity to ship in 1-tonne bundles';
COMMENT ON COLUMN call_off_shipment_line.metal_code IS 'Metal type (defaults from quota)';
COMMENT ON COLUMN call_off_shipment_line.destination_party_id IS 'Customer or distribution center';
COMMENT ON COLUMN call_off_shipment_line.expected_ship_date IS 'Planned shipment date';
COMMENT ON COLUMN call_off_shipment_line.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN call_off_shipment_line.updated_at IS 'Last modification timestamp';

-- Create indexes for query performance
CREATE INDEX idx_shipment_line_call_off ON call_off_shipment_line (call_off_id);
CREATE INDEX idx_shipment_line_transport_order ON call_off_shipment_line (transport_order_id) 
WHERE transport_order_id IS NOT NULL;
CREATE INDEX idx_shipment_line_ship_date ON call_off_shipment_line (expected_ship_date, metal_code)
WHERE expected_ship_date IS NOT NULL;

-- Add constraint for expected ship date
ALTER TABLE call_off_shipment_line ADD CONSTRAINT chk_ship_date_future
CHECK (expected_ship_date IS NULL OR expected_ship_date >= CURRENT_DATE);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_call_off_shipment_line_updated_at 
    BEFORE UPDATE ON call_off_shipment_line 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();