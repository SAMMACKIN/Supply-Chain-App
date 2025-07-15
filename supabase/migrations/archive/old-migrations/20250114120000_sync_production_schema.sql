-- Migration: Sync Production Schema with Development
-- This migration brings production up to date with all development improvements

BEGIN;

-- 1. Create counterparty table if it doesn't exist
CREATE TABLE IF NOT EXISTS counterparty (
    counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
    country_code CHAR(2) NOT NULL,
    tax_id VARCHAR(50),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    payment_terms_days INTEGER,
    credit_limit NUMERIC(15,2),
    preferred_currency CHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add foreign key constraints if counterparty exists
DO $$ 
BEGIN
    -- Add counterparty_id to quota if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quota' AND column_name = 'counterparty_id') THEN
        ALTER TABLE quota ADD COLUMN counterparty_id UUID;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'quota_counterparty_id_fkey') THEN
        ALTER TABLE quota ADD CONSTRAINT quota_counterparty_id_fkey 
        FOREIGN KEY (counterparty_id) REFERENCES counterparty(counterparty_id);
    END IF;
    
    -- Add counterparty_id to call_off if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'counterparty_id') THEN
        ALTER TABLE call_off ADD COLUMN counterparty_id UUID;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'call_off_counterparty_id_fkey') THEN
        ALTER TABLE call_off ADD CONSTRAINT call_off_counterparty_id_fkey 
        FOREIGN KEY (counterparty_id) REFERENCES counterparty(counterparty_id);
    END IF;
END $$;

-- 3. Update call_off table with missing columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'updated_at') THEN
        ALTER TABLE call_off ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'fulfillment_location') THEN
        ALTER TABLE call_off ADD COLUMN fulfillment_location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off ADD COLUMN delivery_location VARCHAR(255);
    END IF;
END $$;

-- 4. Update call_off_shipment_line table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN delivery_location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'requested_delivery_date') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN requested_delivery_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'delivery_notes') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN delivery_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'status') THEN
        -- Create enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
            CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED');
        END IF;
        ALTER TABLE call_off_shipment_line ADD COLUMN status shipment_line_status DEFAULT 'PLANNED';
    END IF;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_counterparty_company_code ON counterparty(company_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_type ON counterparty(counterparty_type);
CREATE INDEX IF NOT EXISTS idx_counterparty_active ON counterparty(is_active);
CREATE INDEX IF NOT EXISTS idx_quota_counterparty ON quota(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_call_off_counterparty ON call_off(counterparty_id);

-- 6. Enable RLS
ALTER TABLE counterparty ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'counterparty' 
        AND policyname = 'Allow authenticated read access'
    ) THEN
        CREATE POLICY "Allow authenticated read access" ON counterparty
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 8. Insert sample counterparty data if table is empty
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, is_active)
SELECT * FROM (VALUES
    ('Glencore International AG', 'GLEN', 'BOTH', 'CH', true),
    ('Trafigura Group', 'TRAF', 'BOTH', 'SG', true),
    ('Rio Tinto', 'RIO', 'SUPPLIER', 'AU', true),
    ('ArcelorMittal', 'MT', 'CUSTOMER', 'LU', true),
    ('BHP Group', 'BHP', 'SUPPLIER', 'AU', true)
) AS v(company_name, company_code, counterparty_type, country_code, is_active)
WHERE NOT EXISTS (SELECT 1 FROM counterparty LIMIT 1);

COMMIT;