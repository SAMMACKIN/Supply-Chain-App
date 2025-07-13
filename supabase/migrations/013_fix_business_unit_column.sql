-- Fix business unit ID column for quota table
-- Migration: 013_fix_business_unit_column.sql
-- Created: July 12, 2025

-- Add business_unit_id column to quota table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quota' AND column_name = 'business_unit_id') THEN
    ALTER TABLE quota ADD COLUMN business_unit_id UUID NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440001';
    
    -- Add foreign key constraint to business_units
    ALTER TABLE quota ADD CONSTRAINT fk_quota_business_unit 
      FOREIGN KEY (business_unit_id) REFERENCES business_units(id);
    
    -- Create index for business unit filtering
    CREATE INDEX idx_quota_business_unit ON quota (business_unit_id);
    
    -- Update table comment
    COMMENT ON COLUMN quota.business_unit_id IS 'Business unit for multi-tenant isolation';
  END IF;
END $$;