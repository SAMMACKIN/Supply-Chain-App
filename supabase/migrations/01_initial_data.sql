-- Initial Test Data for Supply Chain App
-- This file loads sample counterparties and quotas for testing
-- Created: 2025-01-15

BEGIN;

-- =====================================================
-- 1. SAMPLE COUNTERPARTIES
-- =====================================================

INSERT INTO counterparty (
    company_name, 
    company_code, 
    counterparty_type, 
    country_code, 
    primary_contact_name,
    primary_contact_email,
    city,
    is_active
) VALUES
    -- Suppliers
    ('Glencore International AG', 'GLEN', 'SUPPLIER', 'CH', 'Hans Mueller', 'hans@glencore.com', 'Baar', true),
    ('Rio Tinto Group', 'RIO', 'SUPPLIER', 'AU', 'Sarah Chen', 'sarah@riotinto.com', 'Melbourne', true),
    ('BHP Group Limited', 'BHP', 'SUPPLIER', 'AU', 'James Wilson', 'james@bhp.com', 'Perth', true),
    ('Vale S.A.', 'VALE', 'SUPPLIER', 'BR', 'Carlos Silva', 'carlos@vale.com', 'Rio de Janeiro', true),
    
    -- Customers
    ('ArcelorMittal', 'MT', 'CUSTOMER', 'LU', 'Marie Dubois', 'marie@arcelormittal.com', 'Luxembourg', true),
    ('Nippon Steel Corporation', 'NSSMC', 'CUSTOMER', 'JP', 'Takeshi Yamamoto', 'takeshi@nipponsteel.com', 'Tokyo', true),
    ('ThyssenKrupp AG', 'TKA', 'CUSTOMER', 'DE', 'Klaus Weber', 'klaus@thyssenkrupp.com', 'Essen', true),
    ('POSCO', 'POSCO', 'CUSTOMER', 'KR', 'Min-jun Park', 'minjun@posco.com', 'Seoul', true),
    
    -- Both (Traders)
    ('Trafigura Group', 'TRAF', 'BOTH', 'SG', 'David Lee', 'david@trafigura.com', 'Singapore', true),
    ('Mercuria Energy', 'MERC', 'BOTH', 'CH', 'Emma Brown', 'emma@mercuria.com', 'Geneva', true)
ON CONFLICT (company_code) DO NOTHING;

-- =====================================================
-- 2. SAMPLE QUOTAS
-- =====================================================

-- Create quotas with proper counterparty relationships
WITH counterparty_data AS (
    SELECT counterparty_id, company_code, counterparty_type
    FROM counterparty
    WHERE is_active = true
)
INSERT INTO quota (
    quota_id,
    counterparty_id,
    direction,
    period_month,
    qty_t,
    tolerance_pct,
    metal_code,
    business_unit_id,
    incoterm_code
)
SELECT 
    gen_random_uuid(),
    cd.counterparty_id,
    CASE 
        WHEN cd.counterparty_type = 'SUPPLIER' THEN 'BUY'::direction_enum
        WHEN cd.counterparty_type = 'CUSTOMER' THEN 'SELL'::direction_enum
        ELSE 'BUY'::direction_enum
    END,
    period_month,
    qty_t,
    tolerance_pct,
    metal_code,
    business_unit_id,
    incoterm_code
FROM counterparty_data cd
CROSS JOIN (VALUES
    -- January 2025 quotas
    ('GLEN', '2025-01-01'::DATE, 1000.0, 5.0, 'CU', 'EU', 'CIF'),
    ('GLEN', '2025-01-01'::DATE, 1500.0, 10.0, 'AL', 'EU', 'CIF'),
    ('RIO', '2025-01-01'::DATE, 2000.0, 5.0, 'CU', 'US', 'FOB'),
    ('BHP', '2025-01-01'::DATE, 500.0, 7.5, 'NI', 'APAC', 'DAP'),
    ('MT', '2025-01-01'::DATE, 750.0, 5.0, 'CU', 'EU', 'DDP'),
    ('NSSMC', '2025-01-01'::DATE, 1200.0, 10.0, 'AL', 'APAC', 'FOB'),
    ('TRAF', '2025-01-01'::DATE, 800.0, 5.0, 'ZN', 'DEFAULT', 'EXW'),
    
    -- February 2025 quotas  
    ('VALE', '2025-02-01'::DATE, 3000.0, 5.0, 'CU', 'US', 'CIF'),
    ('TKA', '2025-02-01'::DATE, 600.0, 10.0, 'AL', 'EU', 'DAP'),
    ('POSCO', '2025-02-01'::DATE, 900.0, 5.0, 'CU', 'APAC', 'FOB'),
    ('MERC', '2025-02-01'::DATE, 1100.0, 7.5, 'NI', 'DEFAULT', 'CIF'),
    
    -- March 2025 quotas
    ('GLEN', '2025-03-01'::DATE, 1500.0, 5.0, 'ZN', 'EU', 'CIF'),
    ('RIO', '2025-03-01'::DATE, 2500.0, 10.0, 'AL', 'US', 'FOB'),
    ('MT', '2025-03-01'::DATE, 1000.0, 5.0, 'CU', 'EU', 'DDP'),
    ('TRAF', '2025-03-01'::DATE, 700.0, 10.0, 'NI', 'DEFAULT', 'DAP')
) AS quota_data(company_code, period_month, qty_t, tolerance_pct, metal_code, business_unit_id, incoterm_code)
WHERE cd.company_code = quota_data.company_code;

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- Show summary of loaded data
SELECT 'Counterparties loaded:' as info, COUNT(*) as count FROM counterparty
UNION ALL
SELECT 'Quotas loaded:', COUNT(*) FROM quota
UNION ALL
SELECT 'Unique metals:', COUNT(DISTINCT metal_code) FROM quota
UNION ALL
SELECT 'Period range:', COUNT(DISTINCT period_month) FROM quota;

COMMIT;