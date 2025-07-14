-- Seed data for development and testing
-- This file is run after migrations

-- Insert sample counterparties if they don't exist
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, is_active)
VALUES
    ('Glencore International AG', 'GLEN', 'BOTH', 'CH', true),
    ('Trafigura Group', 'TRAF', 'BOTH', 'SG', true),
    ('Rio Tinto', 'RIO', 'SUPPLIER', 'AU', true),
    ('ArcelorMittal', 'MT', 'CUSTOMER', 'LU', true),
    ('BHP Group', 'BHP', 'SUPPLIER', 'AU', true),
    ('Vale S.A.', 'VALE', 'SUPPLIER', 'BR', true),
    ('Anglo American', 'AAL', 'SUPPLIER', 'GB', true),
    ('Freeport-McMoRan', 'FCX', 'SUPPLIER', 'US', true),
    ('Codelco', 'CODELCO', 'SUPPLIER', 'CL', true),
    ('Sumitomo Metal Mining', 'SMM', 'CUSTOMER', 'JP', true)
ON CONFLICT (company_code) DO NOTHING;

-- Insert sample quotas (only in development)
INSERT INTO quota (counterparty_id, direction, period_month, qty_t, tolerance_pct, metal_code, business_unit_id, incoterm_code)
SELECT 
    c.counterparty_id,
    CASE WHEN c.counterparty_type = 'SUPPLIER' THEN 'BUY' ELSE 'SELL' END,
    '2025-01-01'::date,
    1000,
    5,
    'CU',
    'BU001',
    'DAP'
FROM counterparty c
WHERE c.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM quota q 
    WHERE q.counterparty_id = c.counterparty_id 
    AND q.period_month = '2025-01-01'::date
)
LIMIT 5;