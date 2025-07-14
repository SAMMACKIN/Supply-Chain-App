-- Create inventory_bundle table for 1-tonne bundle units
-- Migration: 007_create_inventory_bundle_table.sql
-- Created: July 12, 2025

CREATE TABLE inventory_bundle (
  -- Primary key
  bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  lot_id UUID NOT NULL REFERENCES inventory_lot(lot_id) ON DELETE RESTRICT,
  
  -- Physical characteristics
  weight_kg NUMERIC(9,3) DEFAULT 1000.000 NOT NULL 
    CHECK (weight_kg BETWEEN 950.000 AND 1050.000), -- ±5% tolerance
  
  -- Location tracking
  warehouse_id UUID NOT NULL,
  bin_location TEXT,
  
  -- Status tracking
  status inventory_bundle_status_enum DEFAULT 'RECEIPTED' NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE inventory_bundle IS '1-tonne bundle units (25 per lot) with location tracking';
COMMENT ON COLUMN inventory_bundle.bundle_id IS 'Unique bundle identifier (1t unit)';
COMMENT ON COLUMN inventory_bundle.lot_id IS 'Parent lot reference (25t)';
COMMENT ON COLUMN inventory_bundle.weight_kg IS 'Actual weight with ±5% tolerance of 1000kg';
COMMENT ON COLUMN inventory_bundle.warehouse_id IS '3PL distribution center reference';
COMMENT ON COLUMN inventory_bundle.bin_location IS 'Zone/bin location within warehouse';
COMMENT ON COLUMN inventory_bundle.status IS 'Bundle lifecycle status';
COMMENT ON COLUMN inventory_bundle.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN inventory_bundle.updated_at IS 'Last modification timestamp';

-- Create indexes for ATP (Available-to-Promise) and location queries
CREATE INDEX idx_inventory_bundle_wh_status ON inventory_bundle (warehouse_id, status, lot_id);
CREATE INDEX idx_inventory_bundle_lot ON inventory_bundle (lot_id);
CREATE INDEX idx_inventory_bundle_location ON inventory_bundle (warehouse_id, bin_location, status) 
WHERE status IN ('ON_HAND', 'RESERVED');
CREATE INDEX idx_inventory_bundle_weight_variance ON inventory_bundle (weight_kg) 
WHERE ABS(weight_kg - 1000) > 5; -- Flag significant weight variances

-- Create trigger for automatic updated_at
CREATE TRIGGER update_inventory_bundle_updated_at 
    BEFORE UPDATE ON inventory_bundle 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure reasonable bin location format
ALTER TABLE inventory_bundle ADD CONSTRAINT chk_bin_location_format
CHECK (bin_location IS NULL OR length(bin_location) BETWEEN 1 AND 50);