-- Create seed data for quota table to enable development and testing
-- Migration: 025_seed_quota_data.sql
-- Created: July 12, 2025

-- =====================================================================================
-- QUOTA SEED DATA FOR DEVELOPMENT TESTING
-- =====================================================================================

-- Insert representative quota data covering multiple scenarios
-- Using existing business units: EU, US, APAC

-- =====================================================================================
-- EUROPEAN OPERATIONS QUOTAS (Business Unit ID: 550e8400-e29b-41d4-a716-446655440001)
-- =====================================================================================

-- Copper quotas - Current month (July 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
-- Large copper purchase quota for EU
('650e8400-e29b-41d4-a716-446655440001', uuid_generate_v4(), 'BUY', '2025-07-01', 1000.000, 5.00, 'CIF', 'CU', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 09:00:00+00'),

-- Medium copper sales quota for EU
('650e8400-e29b-41d4-a716-446655440002', uuid_generate_v4(), 'SELL', '2025-07-01', 750.000, 3.00, 'FOB', 'CU', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 09:15:00+00'),

-- Small copper purchase with high tolerance for testing
('650e8400-e29b-41d4-a716-446655440003', uuid_generate_v4(), 'BUY', '2025-07-01', 100.000, 15.00, 'EXW', 'CU', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 10:00:00+00');

-- Aluminum quotas - Next month (August 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
-- Large aluminum purchase quota for EU
('650e8400-e29b-41d4-a716-446655440004', uuid_generate_v4(), 'BUY', '2025-08-01', 2000.000, 7.50, 'CIF', 'AL', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 11:00:00+00'),

-- Medium aluminum sales quota for EU
('650e8400-e29b-41d4-a716-446655440005', uuid_generate_v4(), 'SELL', '2025-08-01', 1500.000, 5.00, 'FOB', 'AL', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 11:15:00+00');

-- Zinc quota - Current month with zero tolerance for strict testing
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440006', uuid_generate_v4(), 'BUY', '2025-07-01', 200.000, 0.00, 'CIF', 'ZN', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 12:00:00+00');

-- =====================================================================================
-- AMERICAS TRADING QUOTAS (Business Unit ID: 550e8400-e29b-41d4-a716-446655440002)
-- =====================================================================================

-- Nickel quotas - Current month (July 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
-- Medium nickel purchase quota for US
('650e8400-e29b-41d4-a716-446655440007', uuid_generate_v4(), 'BUY', '2025-07-01', 500.000, 10.00, 'CIF', 'NI', '550e8400-e29b-41d4-a716-446655440002', '2025-07-01 14:00:00+00'),

-- Small nickel sales quota for US
('650e8400-e29b-41d4-a716-446655440008', uuid_generate_v4(), 'SELL', '2025-07-01', 300.000, 2.50, 'FOB', 'NI', '550e8400-e29b-41d4-a716-446655440002', '2025-07-01 14:30:00+00');

-- Copper quotas - Next month (August 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
-- Medium copper purchase quota for US
('650e8400-e29b-41d4-a716-446655440009', uuid_generate_v4(), 'BUY', '2025-08-01', 800.000, 6.00, 'CIF', 'CU', '550e8400-e29b-41d4-a716-446655440002', '2025-07-01 15:00:00+00'),

-- Small copper sales quota with zero tolerance
('650e8400-e29b-41d4-a716-446655440010', uuid_generate_v4(), 'SELL', '2025-08-01', 250.000, 0.00, 'FOB', 'CU', '550e8400-e29b-41d4-a716-446655440002', '2025-07-01 15:30:00+00');

-- Lead quota - Future month (September 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440011', uuid_generate_v4(), 'BUY', '2025-09-01', 400.000, 8.00, 'CIF', 'PB', '550e8400-e29b-41d4-a716-446655440002', '2025-07-01 16:00:00+00');

-- =====================================================================================
-- ASIA PACIFIC QUOTAS (Business Unit ID: 550e8400-e29b-41d4-a716-446655440003)
-- =====================================================================================

-- Mixed metals - Future month (September 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
-- Large copper purchase quota for APAC
('650e8400-e29b-41d4-a716-446655440012', uuid_generate_v4(), 'BUY', '2025-09-01', 1200.000, 6.00, 'CIF', 'CU', '550e8400-e29b-41d4-a716-446655440003', '2025-07-01 18:00:00+00'),

-- Large aluminum purchase quota for APAC
('650e8400-e29b-41d4-a716-446655440013', uuid_generate_v4(), 'BUY', '2025-09-01', 1500.000, 8.00, 'CIF', 'AL', '550e8400-e29b-41d4-a716-446655440003', '2025-07-01 18:30:00+00'),

-- Tin purchase quota (specialized metal)
('650e8400-e29b-41d4-a716-446655440014', uuid_generate_v4(), 'BUY', '2025-09-01', 150.000, 12.00, 'EXW', 'SN', '550e8400-e29b-41d4-a716-446655440003', '2025-07-01 19:00:00+00');

-- Current month quotas for immediate testing
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
-- Copper sales quota for APAC - current month
('650e8400-e29b-41d4-a716-446655440015', uuid_generate_v4(), 'SELL', '2025-07-01', 600.000, 4.00, 'FOB', 'CU', '550e8400-e29b-41d4-a716-446655440003', '2025-07-01 20:00:00+00'),

-- Aluminum sales quota for APAC - current month
('650e8400-e29b-41d4-a716-446655440016', uuid_generate_v4(), 'SELL', '2025-07-01', 900.000, 6.50, 'FOB', 'AL', '550e8400-e29b-41d4-a716-446655440003', '2025-07-01 20:30:00+00');

-- =====================================================================================
-- EDGE CASE QUOTAS FOR TESTING
-- =====================================================================================

-- Very small quota for quick testing
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440017', uuid_generate_v4(), 'BUY', '2025-07-01', 25.000, 20.00, 'EXW', 'ZN', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 21:00:00+00');

-- Very large quota for stress testing
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440018', uuid_generate_v4(), 'BUY', '2025-08-01', 5000.000, 2.00, 'CIF', 'CU', '550e8400-e29b-41d4-a716-446655440002', '2025-07-01 22:00:00+00');

-- Future period quota for calendar testing (October 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440019', uuid_generate_v4(), 'SELL', '2025-10-01', 1000.000, 5.00, 'FOB', 'AL', '550e8400-e29b-41d4-a716-446655440001', '2025-07-01 23:00:00+00');

-- Past period quota for historical testing (June 2025)
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, business_unit_id, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440020', uuid_generate_v4(), 'BUY', '2025-06-01', 750.000, 7.00, 'CIF', 'NI', '550e8400-e29b-41d4-a716-446655440003', '2025-06-15 10:00:00+00');

-- Add helpful comments
COMMENT ON TABLE quota IS 'Quota table with seed data for development testing - covers multiple metals, business units, periods, and tolerance scenarios';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Quota seed data migration completed successfully';
  RAISE NOTICE 'Inserted 20 quota records across 3 business units';
  RAISE NOTICE 'Covered metals: CU, AL, NI, ZN, PB, SN';
  RAISE NOTICE 'Period range: June 2025 to October 2025';
  RAISE NOTICE 'Tolerance range: 0%% to 20%%';
END $$;