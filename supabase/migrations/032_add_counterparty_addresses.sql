-- Add counterparty addresses table for multiple delivery locations

-- Create address type enum
CREATE TYPE address_type AS ENUM ('BILLING', 'DELIVERY', 'BOTH');

-- Create counterparty_addresses table
CREATE TABLE counterparty_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id) ON DELETE CASCADE,
    address_type address_type NOT NULL DEFAULT 'DELIVERY',
    address_name VARCHAR(255) NOT NULL, -- e.g., "Main Warehouse", "Port Office"
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

-- Create indexes
CREATE INDEX idx_counterparty_addresses_cp ON counterparty_addresses(counterparty_id);
CREATE INDEX idx_counterparty_addresses_active ON counterparty_addresses(is_active) WHERE is_active = true;
CREATE INDEX idx_counterparty_addresses_default ON counterparty_addresses(counterparty_id, is_default) WHERE is_default = true;

-- Create updated_at trigger
CREATE TRIGGER update_counterparty_addresses_updated_at
    BEFORE UPDATE ON counterparty_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE counterparty_addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY counterparty_addresses_select_policy ON counterparty_addresses
    FOR SELECT USING (true);

CREATE POLICY counterparty_addresses_insert_policy ON counterparty_addresses
    FOR INSERT WITH CHECK (true);

CREATE POLICY counterparty_addresses_update_policy ON counterparty_addresses
    FOR UPDATE USING (true);

CREATE POLICY counterparty_addresses_delete_policy ON counterparty_addresses
    FOR DELETE USING (true);

-- Add delivery_address_id to call_off table to track which address was selected
ALTER TABLE call_off 
ADD COLUMN delivery_address_id UUID REFERENCES counterparty_addresses(address_id);

-- Add index for the new column
CREATE INDEX idx_call_off_delivery_address ON call_off(delivery_address_id) WHERE delivery_address_id IS NOT NULL;

-- Function to ensure only one default address per counterparty
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Set all other addresses for this counterparty to non-default
        UPDATE counterparty_addresses 
        SET is_default = false 
        WHERE counterparty_id = NEW.counterparty_id 
        AND address_id != NEW.address_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_address_trigger
    BEFORE INSERT OR UPDATE ON counterparty_addresses
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_address();

-- Insert some sample addresses for existing counterparties (optional)
-- This will be commented out but shows how to add addresses
/*
INSERT INTO counterparty_addresses (counterparty_id, address_type, address_name, street_address, city, country_code, is_default)
SELECT 
    counterparty_id,
    'DELIVERY',
    'Main Office',
    '123 Business Street',
    'London',
    country_code,
    true
FROM counterparty
WHERE is_active = true
LIMIT 5;
*/