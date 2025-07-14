-- Step 1: Create counterparty table (MOST IMPORTANT)
-- This is the main table that's missing in production

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_counterparty_company_code ON counterparty(company_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_type ON counterparty(counterparty_type);
CREATE INDEX IF NOT EXISTS idx_counterparty_active ON counterparty(is_active);

-- Insert sample data
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, is_active)
VALUES
    ('Glencore International AG', 'GLEN', 'BOTH', 'CH', true),
    ('Trafigura Group', 'TRAF', 'BOTH', 'SG', true),
    ('Rio Tinto', 'RIO', 'SUPPLIER', 'AU', true),
    ('ArcelorMittal', 'MT', 'CUSTOMER', 'LU', true),
    ('BHP Group', 'BHP', 'SUPPLIER', 'AU', true)
ON CONFLICT (company_code) DO NOTHING;

-- Enable RLS
ALTER TABLE counterparty ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow authenticated read access" ON counterparty
    FOR SELECT TO authenticated USING (true);

-- Verify
SELECT COUNT(*) as counterparty_count FROM counterparty;