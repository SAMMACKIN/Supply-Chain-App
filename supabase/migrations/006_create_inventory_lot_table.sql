-- Create inventory_lot table for 25-tonne manufacturer lots
-- Migration: 006_create_inventory_lot_table.sql
-- Created: July 12, 2025

CREATE TABLE inventory_lot (
  -- Primary key
  lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supplier and product details
  supplier_id UUID NOT NULL,
  metal_code VARCHAR(12) NOT NULL,
  purity_pct NUMERIC(5,2) NOT NULL CHECK (purity_pct BETWEEN 80.00 AND 99.99),
  manufactured_on DATE NOT NULL,
  
  -- Certificate and documentation
  certificate_url TEXT,
  
  -- Status tracking
  status inventory_lot_status_enum DEFAULT 'INBOUND' NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE inventory_lot IS '25-tonne manufacturer lots with full traceability';
COMMENT ON COLUMN inventory_lot.lot_id IS 'Unique lot identifier (25t unit)';
COMMENT ON COLUMN inventory_lot.supplier_id IS 'Manufacturing supplier reference';
COMMENT ON COLUMN inventory_lot.metal_code IS 'Metal type code (CU, AL, NI, etc.)';
COMMENT ON COLUMN inventory_lot.purity_pct IS 'Metal purity percentage (80.00-99.99)';
COMMENT ON COLUMN inventory_lot.manufactured_on IS 'Manufacturing/production date';
COMMENT ON COLUMN inventory_lot.certificate_url IS 'Quality certificate storage path';
COMMENT ON COLUMN inventory_lot.status IS 'Lot-level status (INBOUND → ON_HAND → CLOSED)';
COMMENT ON COLUMN inventory_lot.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN inventory_lot.updated_at IS 'Last modification timestamp';

-- Create indexes for query performance
CREATE INDEX idx_inventory_lot_supplier_metal ON inventory_lot (supplier_id, metal_code, status);
CREATE INDEX idx_inventory_lot_manufactured ON inventory_lot (manufactured_on, metal_code);
CREATE INDEX idx_inventory_lot_certificate ON inventory_lot (certificate_url) 
WHERE certificate_url IS NOT NULL;
CREATE INDEX idx_inventory_lot_status ON inventory_lot (status);

-- Add constraint for reasonable manufacturing date
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_manufactured_date
CHECK (manufactured_on BETWEEN '2020-01-01' AND CURRENT_DATE + INTERVAL '30 days');

-- Create trigger for automatic updated_at
CREATE TRIGGER update_inventory_lot_updated_at 
    BEFORE UPDATE ON inventory_lot 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();