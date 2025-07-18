-- Apply all pending migrations in one go
-- Run this in Supabase SQL Editor

-- First, let's check what needs to be done
DO $$ 
BEGIN
    RAISE NOTICE 'Starting migration process...';
END$$;

-- 1. Ensure call_off has updated_at column
ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Fix call_off triggers
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

-- 3. Create counterparty addresses table (from migration 032)
DO $$ 
BEGIN
    -- Create address type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'address_type') THEN
        CREATE TYPE address_type AS ENUM ('BILLING', 'DELIVERY', 'BOTH');
    END IF;
END$$;

-- Create counterparty_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS counterparty_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id) ON DELETE CASCADE,
    address_type address_type NOT NULL DEFAULT 'DELIVERY',
    address_name VARCHAR(255) NOT NULL,
    street_address VARCHAR(500) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state_province VARCHAR(255),
    postal_code VARCHAR(50),
    country_code VARCHAR(2) NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_counterparty_addresses_cp ON counterparty_addresses(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_counterparty_addresses_active ON counterparty_addresses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_counterparty_addresses_default ON counterparty_addresses(counterparty_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE counterparty_addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS counterparty_addresses_select_policy ON counterparty_addresses;
CREATE POLICY counterparty_addresses_select_policy ON counterparty_addresses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS counterparty_addresses_insert_policy ON counterparty_addresses;
CREATE POLICY counterparty_addresses_insert_policy ON counterparty_addresses
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS counterparty_addresses_update_policy ON counterparty_addresses;
CREATE POLICY counterparty_addresses_update_policy ON counterparty_addresses
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS counterparty_addresses_delete_policy ON counterparty_addresses;
CREATE POLICY counterparty_addresses_delete_policy ON counterparty_addresses
    FOR DELETE USING (true);

-- Add delivery_address_id to call_off table
ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES counterparty_addresses(address_id);

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_call_off_delivery_address ON call_off(delivery_address_id) WHERE delivery_address_id IS NOT NULL;

-- Create trigger for counterparty_addresses updated_at
CREATE OR REPLACE FUNCTION update_counterparty_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_counterparty_addresses_updated_at ON counterparty_addresses;
CREATE TRIGGER update_counterparty_addresses_updated_at
    BEFORE UPDATE ON counterparty_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_counterparty_addresses_updated_at();

-- Function to ensure only one default address per counterparty
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE counterparty_addresses 
        SET is_default = false 
        WHERE counterparty_id = NEW.counterparty_id 
        AND address_id != NEW.address_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON counterparty_addresses;
CREATE TRIGGER ensure_single_default_address_trigger
    BEFORE INSERT OR UPDATE ON counterparty_addresses
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_address();

-- 4. Verify everything is set up
DO $$ 
BEGIN
    RAISE NOTICE 'Migration complete. Checking results...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_off_shipment_line') THEN
        RAISE NOTICE '✓ call_off_shipment_line table exists';
    ELSE
        RAISE NOTICE '✗ call_off_shipment_line table NOT FOUND';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'counterparty_addresses') THEN
        RAISE NOTICE '✓ counterparty_addresses table exists';
    ELSE
        RAISE NOTICE '✗ counterparty_addresses table NOT FOUND';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_off' AND column_name = 'updated_at') THEN
        RAISE NOTICE '✓ call_off.updated_at column exists';
    ELSE
        RAISE NOTICE '✗ call_off.updated_at column NOT FOUND';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'call_off' AND column_name = 'delivery_address_id') THEN
        RAISE NOTICE '✓ call_off.delivery_address_id column exists';
    ELSE
        RAISE NOTICE '✗ call_off.delivery_address_id column NOT FOUND';
    END IF;
END$$;

-- Final message
SELECT 'All migrations applied successfully!' as status;