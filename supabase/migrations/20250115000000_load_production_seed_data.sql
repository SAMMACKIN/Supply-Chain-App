-- Load seed data for production deployment
-- This migration adds essential counterparty and quota data for testing

-- =====================================================================================
-- COUNTERPARTY SEED DATA
-- =====================================================================================

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

-- =====================================================================================
-- QUOTA SEED DATA
-- =====================================================================================

-- Insert sample quotas using the counterparties we just created
WITH counterparty_mapping AS (
  SELECT 
    counterparty_id,
    company_code,
    counterparty_type,
    ROW_NUMBER() OVER (ORDER BY company_code) as rn
  FROM counterparty 
  WHERE company_code IN ('GLEN', 'TRAF', 'RIO', 'MT', 'BHP', 'VALE', 'AAL', 'FCX', 'CODELCO', 'SMM')
)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at)
SELECT 
  -- Generate predictable UUIDs for each quota
  CASE rn
    WHEN 1 THEN '650e8400-e29b-41d4-a716-446655440001'::uuid
    WHEN 2 THEN '650e8400-e29b-41d4-a716-446655440002'::uuid
    WHEN 3 THEN '650e8400-e29b-41d4-a716-446655440003'::uuid
    WHEN 4 THEN '650e8400-e29b-41d4-a716-446655440004'::uuid
    WHEN 5 THEN '650e8400-e29b-41d4-a716-446655440005'::uuid
    WHEN 6 THEN '650e8400-e29b-41d4-a716-446655440006'::uuid
    WHEN 7 THEN '650e8400-e29b-41d4-a716-446655440007'::uuid
    WHEN 8 THEN '650e8400-e29b-41d4-a716-446655440008'::uuid
    WHEN 9 THEN '650e8400-e29b-41d4-a716-446655440009'::uuid
    WHEN 10 THEN '650e8400-e29b-41d4-a716-446655440010'::uuid
  END as quota_id,
  counterparty_id,
  CASE 
    WHEN counterparty_type = 'SUPPLIER' THEN 'BUY'
    WHEN counterparty_type = 'CUSTOMER' THEN 'SELL'
    ELSE (CASE WHEN rn % 2 = 0 THEN 'BUY' ELSE 'SELL' END)
  END as direction,
  -- Mix of current and future periods
  CASE 
    WHEN rn <= 3 THEN '2025-01-01'::date  -- Current period
    WHEN rn <= 6 THEN '2025-02-01'::date  -- Next period
    ELSE '2025-03-01'::date               -- Future period
  END as period_month,
  -- Varying quantities
  CASE 
    WHEN rn <= 2 THEN 1000.000
    WHEN rn <= 5 THEN 500.000
    WHEN rn <= 7 THEN 750.000
    ELSE 250.000
  END as qty_t,
  -- Varying tolerances
  CASE 
    WHEN rn % 3 = 0 THEN 5.00
    WHEN rn % 3 = 1 THEN 7.50
    ELSE 2.50
  END as tolerance_pct,
  -- Mix of incoterms
  CASE 
    WHEN rn % 4 = 0 THEN 'CIF'
    WHEN rn % 4 = 1 THEN 'FOB'
    WHEN rn % 4 = 2 THEN 'DAP'
    ELSE 'EXW'
  END as incoterm_code,
  -- Mix of metals
  CASE 
    WHEN rn % 5 = 0 THEN 'CU'
    WHEN rn % 5 = 1 THEN 'AL'
    WHEN rn % 5 = 2 THEN 'ZN'
    WHEN rn % 5 = 3 THEN 'NI'
    ELSE 'PB'
  END as metal_code,
  '550e8400-e29b-41d4-a716-446655440001'::uuid as business_unit_id,  -- Default business unit
  NOW() as created_at
FROM counterparty_mapping
WHERE rn <= 10  -- Create 10 quotas
ON CONFLICT (quota_id) DO NOTHING;

-- Add additional quotas for comprehensive testing
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at)
SELECT 
  ('650e8400-e29b-41d4-a716-44665544' || LPAD((10 + rn)::text, 4, '0'))::uuid as quota_id,
  counterparty_id,
  CASE WHEN rn % 2 = 0 THEN 'BUY' ELSE 'SELL' END as direction,
  ('2025-0' || ((rn % 3) + 1)::text || '-01')::date as period_month,  -- Jan, Feb, Mar 2025
  (100 + (rn * 150))::numeric as qty_t,
  (2.5 + (rn * 1.5))::numeric as tolerance_pct,
  CASE 
    WHEN rn % 3 = 0 THEN 'CIF'
    WHEN rn % 3 = 1 THEN 'FOB'
    ELSE 'DAP'
  END as incoterm_code,
  CASE 
    WHEN rn % 4 = 0 THEN 'CU'
    WHEN rn % 4 = 1 THEN 'AL'
    WHEN rn % 4 = 2 THEN 'ZN'
    ELSE 'NI'
  END as metal_code,
  '550e8400-e29b-41d4-a716-446655440001'::uuid as business_unit_id,
  NOW() as created_at
FROM (
  SELECT counterparty_id, ROW_NUMBER() OVER (ORDER BY company_code) as rn
  FROM counterparty 
  WHERE company_code IN ('GLEN', 'TRAF', 'RIO', 'MT', 'BHP', 'VALE', 'AAL', 'FCX', 'CODELCO', 'SMM')
) t
WHERE rn <= 10
ON CONFLICT (quota_id) DO NOTHING;

-- Log completion
DO $$
DECLARE
  counterparty_count INT;
  quota_count INT;
BEGIN
  SELECT COUNT(*) INTO counterparty_count FROM counterparty;
  SELECT COUNT(*) INTO quota_count FROM quota;
  
  RAISE NOTICE 'Production seed data migration completed successfully';
  RAISE NOTICE 'Total counterparties: %', counterparty_count;
  RAISE NOTICE 'Total quotas: %', quota_count;
END $$;