-- Create call_off table for call-off management
-- Migration: 003_create_call_off_table.sql
-- Created: July 12, 2025

CREATE TABLE call_off (
  -- Primary key
  call_off_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  quota_id UUID NOT NULL REFERENCES quota(quota_id) ON DELETE RESTRICT,
  
  -- Business identifiers
  call_off_number TEXT UNIQUE NOT NULL,
  
  -- Workflow and business data
  status call_off_status_enum DEFAULT 'NEW' NOT NULL,
  bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
  requested_delivery_date DATE CHECK (requested_delivery_date >= CURRENT_DATE),
  
  -- Derived fields from quota (for performance)
  counterparty_id UUID NOT NULL,
  direction direction_enum NOT NULL,
  incoterm_code CHAR(3),
  
  -- Audit and workflow timestamps
  created_by UUID NOT NULL, -- References auth.users(id)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);

-- Add table and column comments
COMMENT ON TABLE call_off IS 'Call-off orders against quotas with workflow state management';
COMMENT ON COLUMN call_off.call_off_id IS 'Unique call-off identifier';
COMMENT ON COLUMN call_off.quota_id IS 'Parent quota reference';
COMMENT ON COLUMN call_off.call_off_number IS 'Human-readable identifier (CO-YYYY-NNNN)';
COMMENT ON COLUMN call_off.status IS 'Workflow state (NEW → CONFIRMED → FULFILLED/CANCELLED)';
COMMENT ON COLUMN call_off.bundle_qty IS 'Quantity in 1-tonne bundles';
COMMENT ON COLUMN call_off.requested_delivery_date IS 'Customer requested delivery date';
COMMENT ON COLUMN call_off.counterparty_id IS 'Cached from quota for performance';
COMMENT ON COLUMN call_off.direction IS 'Cached from quota for performance';
COMMENT ON COLUMN call_off.incoterm_code IS 'Cached from quota for performance';
COMMENT ON COLUMN call_off.created_by IS 'User who created the call-off';
COMMENT ON COLUMN call_off.created_at IS 'Call-off creation timestamp';
COMMENT ON COLUMN call_off.confirmed_at IS 'When call-off was confirmed';
COMMENT ON COLUMN call_off.cancelled_at IS 'When call-off was cancelled';
COMMENT ON COLUMN call_off.fulfilled_at IS 'When call-off was fulfilled';

-- Create indexes for common query patterns
CREATE INDEX idx_call_off_quota_status ON call_off (quota_id, status);
CREATE INDEX idx_call_off_number ON call_off (call_off_number);
CREATE INDEX idx_call_off_created_by ON call_off (created_by, created_at DESC);
CREATE INDEX idx_call_off_delivery_date ON call_off (requested_delivery_date) 
WHERE requested_delivery_date IS NOT NULL;
CREATE INDEX idx_call_off_status ON call_off (status);

-- Add constraint for call-off number pattern
ALTER TABLE call_off ADD CONSTRAINT chk_call_off_number_pattern
CHECK (call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$');

-- Add constraints for workflow timestamp logic
ALTER TABLE call_off ADD CONSTRAINT chk_confirmed_after_created
CHECK (confirmed_at IS NULL OR confirmed_at >= created_at);

ALTER TABLE call_off ADD CONSTRAINT chk_cancelled_after_created
CHECK (cancelled_at IS NULL OR cancelled_at >= created_at);

ALTER TABLE call_off ADD CONSTRAINT chk_fulfilled_after_confirmed
CHECK (fulfilled_at IS NULL OR (confirmed_at IS NOT NULL AND fulfilled_at >= confirmed_at));

-- Ensure only one completion status
ALTER TABLE call_off ADD CONSTRAINT chk_single_completion
CHECK (
  (cancelled_at IS NULL AND fulfilled_at IS NULL) OR
  (cancelled_at IS NOT NULL AND fulfilled_at IS NULL) OR
  (cancelled_at IS NULL AND fulfilled_at IS NOT NULL)
);