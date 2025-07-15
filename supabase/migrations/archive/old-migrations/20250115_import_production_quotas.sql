-- Import quotas into production
-- This script creates sample quotas linked to existing counterparties
-- Date: 2025-01-15

BEGIN;

-- First, let's check what counterparties exist
DO $$
DECLARE
    v_counterparty_count INTEGER;
    v_first_counterparty_id UUID;
BEGIN
    SELECT COUNT(*) INTO v_counterparty_count FROM counterparty WHERE is_active = true;
    
    IF v_counterparty_count = 0 THEN
        RAISE NOTICE 'No active counterparties found. Creating sample counterparties first...';
        
        -- Create sample counterparties
        INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, is_active) VALUES
            ('Global Metals Trading', 'GMT', 'BOTH', 'US', true),
            ('European Copper Co', 'ECC', 'SUPPLIER', 'DE', true),
            ('Asia Pacific Metals', 'APM', 'CUSTOMER', 'SG', true),
            ('Nordic Aluminum AB', 'NAL', 'SUPPLIER', 'SE', true),
            ('American Steel Corp', 'ASC', 'CUSTOMER', 'US', true)
        ON CONFLICT (company_code) DO NOTHING;
    END IF;
END $$;

-- Create quotas linked to actual counterparties
-- Using current month data for immediate testing
WITH counterparty_data AS (
    SELECT 
        counterparty_id,
        company_code,
        counterparty_type,
        ROW_NUMBER() OVER (ORDER BY company_code) as rn
    FROM counterparty 
    WHERE is_active = true
    LIMIT 5
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
    incoterm_code, 
    created_at
)
SELECT 
    gen_random_uuid(),
    cd.counterparty_id,
    CASE 
        WHEN cd.counterparty_type = 'SUPPLIER' THEN 'BUY'::direction_enum
        WHEN cd.counterparty_type = 'CUSTOMER' THEN 'SELL'::direction_enum
        ELSE CASE WHEN cd.rn % 2 = 0 THEN 'BUY'::direction_enum ELSE 'SELL'::direction_enum END
    END as direction,
    dates.period_month,
    quantities.qty_t,
    tolerances.tolerance_pct,
    metals.metal_code,
    'DEFAULT' as business_unit_id,
    incoterms.incoterm_code,
    NOW() - INTERVAL '1 day' * (cd.rn - 1)
FROM counterparty_data cd
CROSS JOIN (
    VALUES 
        ('2025-01-01'::DATE),
        ('2025-02-01'::DATE),
        ('2025-03-01'::DATE)
) AS dates(period_month)
CROSS JOIN (
    VALUES 
        ('CU'), -- Copper
        ('AL'), -- Aluminum
        ('ZN'), -- Zinc
        ('NI')  -- Nickel
) AS metals(metal_code)
CROSS JOIN (
    VALUES 
        (500.0),
        (1000.0),
        (1500.0)
) AS quantities(qty_t)
CROSS JOIN (
    VALUES 
        (5.0),
        (10.0)
) AS tolerances(tolerance_pct)
CROSS JOIN (
    VALUES 
        ('DAP'),
        ('EXW'),
        ('FOB')
) AS incoterms(incoterm_code)
WHERE 
    -- Create a subset of combinations, not all
    (cd.rn = 1 AND metals.metal_code = 'CU' AND quantities.qty_t = 1000.0 AND dates.period_month = '2025-01-01' AND tolerances.tolerance_pct = 5.0 AND incoterms.incoterm_code = 'DAP') OR
    (cd.rn = 1 AND metals.metal_code = 'AL' AND quantities.qty_t = 1500.0 AND dates.period_month = '2025-02-01' AND tolerances.tolerance_pct = 10.0 AND incoterms.incoterm_code = 'FOB') OR
    (cd.rn = 2 AND metals.metal_code = 'CU' AND quantities.qty_t = 500.0 AND dates.period_month = '2025-01-01' AND tolerances.tolerance_pct = 5.0 AND incoterms.incoterm_code = 'EXW') OR
    (cd.rn = 2 AND metals.metal_code = 'ZN' AND quantities.qty_t = 1000.0 AND dates.period_month = '2025-03-01' AND tolerances.tolerance_pct = 10.0 AND incoterms.incoterm_code = 'DAP') OR
    (cd.rn = 3 AND metals.metal_code = 'NI' AND quantities.qty_t = 500.0 AND dates.period_month = '2025-02-01' AND tolerances.tolerance_pct = 5.0 AND incoterms.incoterm_code = 'FOB') OR
    (cd.rn = 3 AND metals.metal_code = 'AL' AND quantities.qty_t = 1000.0 AND dates.period_month = '2025-01-01' AND tolerances.tolerance_pct = 10.0 AND incoterms.incoterm_code = 'DAP') OR
    (cd.rn = 4 AND metals.metal_code = 'CU' AND quantities.qty_t = 1500.0 AND dates.period_month = '2025-03-01' AND tolerances.tolerance_pct = 5.0 AND incoterms.incoterm_code = 'EXW') OR
    (cd.rn = 5 AND metals.metal_code = 'ZN' AND quantities.qty_t = 500.0 AND dates.period_month = '2025-01-01' AND tolerances.tolerance_pct = 10.0 AND incoterms.incoterm_code = 'FOB');

-- Add some additional realistic quotas
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
    counterparty_id,
    CASE 
        WHEN counterparty_type = 'SUPPLIER' THEN 'BUY'::direction_enum
        WHEN counterparty_type = 'CUSTOMER' THEN 'SELL'::direction_enum
        ELSE 'BUY'::direction_enum
    END,
    '2025-01-01'::DATE,
    750.0,
    7.5,
    'CU',
    'DEFAULT',
    'CIF'
FROM counterparty
WHERE is_active = true
LIMIT 2;

COMMIT;

-- Show results
SELECT 
    COUNT(*) as total_quotas,
    COUNT(DISTINCT counterparty_id) as unique_counterparties,
    COUNT(DISTINCT metal_code) as unique_metals,
    COUNT(DISTINCT period_month) as unique_periods,
    MIN(period_month) as earliest_period,
    MAX(period_month) as latest_period
FROM quota;