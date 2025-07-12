-- Create quota table for Titan CDC import
-- Migration: 002_create_quota_table.sql
-- Created: July 12, 2025

CREATE TABLE quota (
  -- Primary key - matches Titan quota ID
  quota_id UUID PRIMARY KEY,
  
  -- Trading partner identification
  counterparty_id UUID NOT NULL,
  
  -- Trade characteristics
  direction direction_enum NOT NULL,
  period_month DATE NOT NULL CHECK (EXTRACT(day FROM period_month) = 1), -- Force YYYY-MM-01 format
  qty_t NUMERIC(12,3) NOT NULL CHECK (qty_t > 0),
  tolerance_pct NUMERIC(4,2) CHECK (tolerance_pct >= 0 AND tolerance_pct <= 100),
  
  -- Commercial terms
  incoterm_code CHAR(3), -- FOB, CIF, EXW, etc.
  metal_code VARCHAR(12) NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE quota IS 'Quota definitions imported from Titan via CDC';
COMMENT ON COLUMN quota.quota_id IS 'Primary key matching Titan quota identifier';
COMMENT ON COLUMN quota.counterparty_id IS 'Trading partner/customer UUID';
COMMENT ON COLUMN quota.direction IS 'BUY (purchase) or SELL (sales) quota';
COMMENT ON COLUMN quota.period_month IS 'Monthly bucket (first day of month)';
COMMENT ON COLUMN quota.qty_t IS 'Contract quantity in metric tonnes';
COMMENT ON COLUMN quota.tolerance_pct IS 'Allowed over/under percentage (0-100)';
COMMENT ON COLUMN quota.incoterm_code IS 'International commercial terms (FOB, CIF, etc.)';
COMMENT ON COLUMN quota.metal_code IS 'Metal type code (CU, AL, NI, ZN, etc.)';
COMMENT ON COLUMN quota.created_at IS 'Record creation timestamp';

-- Create basic indexes for common access patterns
CREATE INDEX idx_quota_counterparty ON quota (counterparty_id);
CREATE INDEX idx_quota_period_metal ON quota (period_month, metal_code);
CREATE INDEX idx_quota_direction ON quota (direction);

-- Add check constraint for reasonable date range
ALTER TABLE quota ADD CONSTRAINT chk_quota_period_range 
CHECK (period_month >= '2020-01-01' AND period_month <= '2030-12-01');