-- Add business unit ID to quota table for multi-tenant security
-- Migration: 012_add_business_unit_to_quota.sql
-- Created: July 12, 2025

-- Add business_unit_id column to quota table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'quota' AND column_name = 'business_unit_id') THEN
    ALTER TABLE quota ADD COLUMN business_unit_id UUID NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440001';
  END IF;
END $$;

-- Add foreign key constraint to business_units if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_quota_business_unit') THEN
    ALTER TABLE quota ADD CONSTRAINT fk_quota_business_unit 
      FOREIGN KEY (business_unit_id) REFERENCES business_units(id);
  END IF;
END $$;

-- Create index for business unit filtering if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quota_business_unit') THEN
    CREATE INDEX idx_quota_business_unit ON quota (business_unit_id);
  END IF;
END $$;

-- Update table comment
COMMENT ON COLUMN quota.business_unit_id IS 'Business unit for multi-tenant isolation';