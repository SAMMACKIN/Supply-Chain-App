-- Complete CSLA Database Schema Setup
-- Generated from migrations 001-009
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/brixbdbunhwlhuwunqxw/sql

-- =============================================================================
-- 001: Create ENUM types
-- =============================================================================

-- Direction enum for trade direction
CREATE TYPE direction_enum AS ENUM ('BUY', 'SELL');

-- Call-off status enum for workflow state machine
CREATE TYPE call_off_status_enum AS ENUM (
  'NEW',
  'CONFIRMED', 
  'FULFILLED',
  'CANCELLED'
);

-- Transport order status enum
CREATE TYPE transport_order_status_enum AS ENUM (
  'NEW',
  'BOOKED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED'
);

-- Inventory lot status enum
CREATE TYPE inventory_lot_status_enum AS ENUM (
  'INBOUND',
  'ON_HAND',
  'CLOSED'
);

-- Inventory bundle status enum
CREATE TYPE inventory_bundle_status_enum AS ENUM (
  'RECEIPTED',
  'ON_HAND',
  'RESERVED',
  'PICKED',
  'SHIPPED',
  'DELIVERED'
);

-- Transport mode enum
CREATE TYPE transport_mode_enum AS ENUM (
  'ROAD',
  'SEA', 
  'RAIL',
  'AIR'
);

-- Milestone event codes enum
CREATE TYPE milestone_event_enum AS ENUM (
  'DEP',  -- Departure
  'ARR',  -- Arrival
  'POD',  -- Proof of Delivery
  'EXC'   -- Exception
);

-- User role enum
CREATE TYPE user_role_enum AS ENUM (
  'OPS',
  'TRADE',
  'PLANNER'
);

-- =============================================================================
-- 002: Create quota table
-- =============================================================================

CREATE TABLE quota (
  -- Primary key - matches Titan quota ID
  quota_id UUID PRIMARY KEY,
  
  -- Trading partner identification
  counterparty_id UUID NOT NULL,
  
  -- Trade characteristics
  direction direction_enum NOT NULL,
  period_month DATE NOT NULL CHECK (EXTRACT(day FROM period_month) = 1), -- Force YYYY-MM-01 format
  qty_t NUMERIC(12,3) NOT NULL CHECK (qty_t > 0),
  tolerance_pct NUMERIC(4,2) CHECK (tolerance_pct >= 0 AND tolerance_pct <= 100),
  
  -- Commercial terms
  incoterm_code CHAR(3), -- FOB, CIF, EXW, etc.
  metal_code VARCHAR(12) NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create basic indexes for common access patterns
CREATE INDEX idx_quota_counterparty ON quota (counterparty_id);
CREATE INDEX idx_quota_period_metal ON quota (period_month, metal_code);
CREATE INDEX idx_quota_direction ON quota (direction);

-- Add check constraint for reasonable date range
ALTER TABLE quota ADD CONSTRAINT chk_quota_period_range 
CHECK (period_month >= '2020-01-01' AND period_month <= '2030-12-01');

-- =============================================================================
-- 003: Create call_off table
-- =============================================================================

CREATE TABLE call_off (
  -- Primary key
  call_off_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  quota_id UUID NOT NULL REFERENCES quota(quota_id) ON DELETE RESTRICT,
  
  -- Business identifiers
  call_off_number TEXT UNIQUE NOT NULL,
  
  -- Workflow and business data
  status call_off_status_enum DEFAULT 'NEW' NOT NULL,
  bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
  requested_delivery_date DATE CHECK (requested_delivery_date >= CURRENT_DATE),
  
  -- Derived fields from quota (for performance)
  counterparty_id UUID NOT NULL,
  direction direction_enum NOT NULL,
  incoterm_code CHAR(3),
  
  -- Audit and workflow timestamps
  created_by UUID NOT NULL, -- References auth.users(id)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);

-- Create indexes for common query patterns
CREATE INDEX idx_call_off_quota_status ON call_off (quota_id, status);
CREATE INDEX idx_call_off_number ON call_off (call_off_number);
CREATE INDEX idx_call_off_created_by ON call_off (created_by, created_at DESC);
CREATE INDEX idx_call_off_delivery_date ON call_off (requested_delivery_date) 
WHERE requested_delivery_date IS NOT NULL;
CREATE INDEX idx_call_off_status ON call_off (status);

-- Add constraint for call-off number pattern
ALTER TABLE call_off ADD CONSTRAINT chk_call_off_number_pattern
CHECK (call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$');

-- Add constraints for workflow timestamp logic
ALTER TABLE call_off ADD CONSTRAINT chk_confirmed_after_created
CHECK (confirmed_at IS NULL OR confirmed_at >= created_at);

ALTER TABLE call_off ADD CONSTRAINT chk_cancelled_after_created
CHECK (cancelled_at IS NULL OR cancelled_at >= created_at);

ALTER TABLE call_off ADD CONSTRAINT chk_fulfilled_after_confirmed
CHECK (fulfilled_at IS NULL OR (confirmed_at IS NOT NULL AND fulfilled_at >= confirmed_at));

-- Ensure only one completion status
ALTER TABLE call_off ADD CONSTRAINT chk_single_completion
CHECK (
  (cancelled_at IS NULL AND fulfilled_at IS NULL) OR
  (cancelled_at IS NOT NULL AND fulfilled_at IS NULL) OR
  (cancelled_at IS NULL AND fulfilled_at IS NOT NULL)
);

-- =============================================================================
-- 004: Create transport_order table (stub)
-- =============================================================================

CREATE TABLE transport_order (
  -- Primary key
  transport_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic transport details
  carrier_id UUID,
  booking_reference TEXT UNIQUE,
  mode transport_mode_enum DEFAULT 'ROAD' NOT NULL,
  equipment_type VARCHAR(20),
  gross_weight_t NUMERIC(12,3) CHECK (gross_weight_t > 0),
  
  -- Status and workflow
  status transport_order_status_enum DEFAULT 'NEW' NOT NULL,
  
  -- Audit fields
  created_by UUID NOT NULL, -- References auth.users(id)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create basic indexes
CREATE INDEX idx_transport_order_status ON transport_order (status);
CREATE INDEX idx_transport_order_carrier ON transport_order (carrier_id);
CREATE INDEX idx_transport_order_created_by ON transport_order (created_by, created_at DESC);

-- =============================================================================
-- 005: Create helper functions and triggers
-- =============================================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transport_order
CREATE TRIGGER update_transport_order_updated_at 
    BEFORE UPDATE ON transport_order 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 006: Create call_off_shipment_line table
-- =============================================================================

CREATE TABLE call_off_shipment_line (
  -- Primary key
  shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  call_off_id UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE,
  transport_order_id UUID REFERENCES transport_order(transport_order_id) ON DELETE SET NULL,
  
  -- Shipment details
  bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
  metal_code VARCHAR(12) NOT NULL,
  destination_party_id UUID,
  expected_ship_date DATE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for query performance
CREATE INDEX idx_shipment_line_call_off ON call_off_shipment_line (call_off_id);
CREATE INDEX idx_shipment_line_transport_order ON call_off_shipment_line (transport_order_id) 
WHERE transport_order_id IS NOT NULL;
CREATE INDEX idx_shipment_line_ship_date ON call_off_shipment_line (expected_ship_date, metal_code)
WHERE expected_ship_date IS NOT NULL;

-- Add constraint for expected ship date
ALTER TABLE call_off_shipment_line ADD CONSTRAINT chk_ship_date_future
CHECK (expected_ship_date IS NULL OR expected_ship_date >= CURRENT_DATE);

-- Create trigger for automatic updated_at
CREATE TRIGGER update_call_off_shipment_line_updated_at 
    BEFORE UPDATE ON call_off_shipment_line 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 007: Create inventory_lot table
-- =============================================================================

CREATE TABLE inventory_lot (
  -- Primary key
  lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supplier and product details
  supplier_id UUID NOT NULL,
  metal_code VARCHAR(12) NOT NULL,
  purity_pct NUMERIC(5,2) NOT NULL CHECK (purity_pct BETWEEN 80.00 AND 99.99),
  manufactured_on DATE NOT NULL,
  
  -- Certificate and documentation
  certificate_url TEXT,
  
  -- Status tracking
  status inventory_lot_status_enum DEFAULT 'INBOUND' NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for query performance
CREATE INDEX idx_inventory_lot_supplier_metal ON inventory_lot (supplier_id, metal_code, status);
CREATE INDEX idx_inventory_lot_manufactured ON inventory_lot (manufactured_on, metal_code);
CREATE INDEX idx_inventory_lot_certificate ON inventory_lot (certificate_url) 
WHERE certificate_url IS NOT NULL;
CREATE INDEX idx_inventory_lot_status ON inventory_lot (status);

-- Add constraint for reasonable manufacturing date
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_manufactured_date
CHECK (manufactured_on BETWEEN '2020-01-01' AND CURRENT_DATE + INTERVAL '30 days');

-- Create trigger for automatic updated_at
CREATE TRIGGER update_inventory_lot_updated_at 
    BEFORE UPDATE ON inventory_lot 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 008: Create inventory_bundle table
-- =============================================================================

CREATE TABLE inventory_bundle (
  -- Primary key
  bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  lot_id UUID NOT NULL REFERENCES inventory_lot(lot_id) ON DELETE RESTRICT,
  
  -- Physical characteristics
  weight_kg NUMERIC(9,3) DEFAULT 1000.000 NOT NULL 
    CHECK (weight_kg BETWEEN 950.000 AND 1050.000), -- ±5% tolerance
  
  -- Location tracking
  warehouse_id UUID NOT NULL,
  bin_location TEXT,
  
  -- Status tracking
  status inventory_bundle_status_enum DEFAULT 'RECEIPTED' NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for ATP (Available-to-Promise) and location queries
CREATE INDEX idx_inventory_bundle_wh_status ON inventory_bundle (warehouse_id, status, lot_id);
CREATE INDEX idx_inventory_bundle_lot ON inventory_bundle (lot_id);
CREATE INDEX idx_inventory_bundle_location ON inventory_bundle (warehouse_id, bin_location, status) 
WHERE status IN ('ON_HAND', 'RESERVED');
CREATE INDEX idx_inventory_bundle_weight_variance ON inventory_bundle (weight_kg) 
WHERE ABS(weight_kg - 1000) > 5; -- Flag significant weight variances

-- Create trigger for automatic updated_at
CREATE TRIGGER update_inventory_bundle_updated_at 
    BEFORE UPDATE ON inventory_bundle 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure reasonable bin location format
ALTER TABLE inventory_bundle ADD CONSTRAINT chk_bin_location_format
CHECK (bin_location IS NULL OR length(bin_location) BETWEEN 1 AND 50);

-- =============================================================================
-- 009: Create call-off number generation
-- =============================================================================

-- Function to generate sequential call-off numbers by year
CREATE OR REPLACE FUNCTION generate_call_off_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_num INT;
    new_number TEXT;
BEGIN
    -- Only generate if call_off_number is NULL (not provided)
    IF NEW.call_off_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Extract year from current date
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(SUBSTRING(call_off_number FROM 9 FOR 4)::INT), 0) + 1
    INTO sequence_num
    FROM call_off 
    WHERE call_off_number LIKE 'CO-' || year_part || '-%';
    
    -- Generate new call-off number: CO-YYYY-NNNN
    new_number := 'CO-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.call_off_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate call-off numbers
CREATE TRIGGER generate_call_off_number_trigger
    BEFORE INSERT ON call_off 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_call_off_number();

-- =============================================================================
-- 010: Create business views
-- =============================================================================

-- Call-off summary view with quota and shipment line details
CREATE VIEW v_call_off_summary AS
SELECT 
    co.call_off_id,
    co.call_off_number,
    co.status,
    co.bundle_qty,
    co.requested_delivery_date,
    co.created_by,
    co.created_at,
    co.confirmed_at,
    co.cancelled_at,
    co.fulfilled_at,
    
    -- Quota details
    q.quota_id,
    q.metal_code,
    q.direction,
    q.counterparty_id,
    q.period_month,
    q.qty_t as quota_qty_t,
    q.tolerance_pct,
    q.incoterm_code,
    
    -- Shipment line aggregations
    COUNT(csl.shipment_line_id) as shipment_line_count,
    COALESCE(SUM(csl.bundle_qty), 0) as planned_bundle_qty,
    COUNT(CASE WHEN csl.transport_order_id IS NOT NULL THEN 1 END) as assigned_shipment_lines
    
FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
LEFT JOIN call_off_shipment_line csl ON co.call_off_id = csl.call_off_id
GROUP BY 
    co.call_off_id, co.call_off_number, co.status, co.bundle_qty, 
    co.requested_delivery_date, co.created_by, co.created_at, 
    co.confirmed_at, co.cancelled_at, co.fulfilled_at,
    q.quota_id, q.metal_code, q.direction, q.counterparty_id, 
    q.period_month, q.qty_t, q.tolerance_pct, q.incoterm_code;

-- Quota balance view for remaining capacity calculations
CREATE VIEW v_quota_balance AS
SELECT 
    q.quota_id,
    q.counterparty_id,
    q.direction,
    q.period_month,
    q.metal_code,
    q.qty_t as quota_qty,
    q.tolerance_pct,
    q.incoterm_code,
    
    -- Call-off consumption (only CONFIRMED and FULFILLED count)
    COALESCE(SUM(CASE WHEN co.status IN ('CONFIRMED', 'FULFILLED') THEN co.bundle_qty ELSE 0 END), 0) as consumed_bundles,
    
    -- Remaining capacity calculations
    q.qty_t - COALESCE(SUM(CASE WHEN co.status IN ('CONFIRMED', 'FULFILLED') THEN co.bundle_qty ELSE 0 END), 0) as remaining_qty,
    
    -- Utilization percentage
    CASE 
        WHEN q.qty_t > 0 THEN 
            (COALESCE(SUM(CASE WHEN co.status IN ('CONFIRMED', 'FULFILLED') THEN co.bundle_qty ELSE 0 END), 0) / q.qty_t) * 100
        ELSE 0 
    END as utilization_pct,
    
    -- Tolerance limits
    q.qty_t * (1 + q.tolerance_pct / 100) as max_with_tolerance,
    q.qty_t * (1 - q.tolerance_pct / 100) as min_with_tolerance,
    
    -- Pending call-offs (NEW status)
    COALESCE(SUM(CASE WHEN co.status = 'NEW' THEN co.bundle_qty ELSE 0 END), 0) as pending_bundles
    
FROM quota q
LEFT JOIN call_off co ON q.quota_id = co.quota_id 
GROUP BY 
    q.quota_id, q.counterparty_id, q.direction, q.period_month, 
    q.metal_code, q.qty_t, q.tolerance_pct, q.incoterm_code;

-- Inventory bundle availability view for ATP (Available-to-Promise)
CREATE VIEW v_bundle_availability AS
SELECT 
    ib.bundle_id,
    ib.lot_id,
    ib.weight_kg,
    ib.warehouse_id,
    ib.bin_location,
    ib.status,
    ib.created_at,
    ib.updated_at,
    
    -- Lot details
    il.supplier_id,
    il.metal_code,
    il.purity_pct,
    il.manufactured_on,
    il.certificate_url,
    il.status as lot_status,
    
    -- Availability flags
    CASE 
        WHEN ib.status = 'ON_HAND' THEN true 
        ELSE false 
    END as is_available,
    
    -- Age calculations
    CURRENT_DATE - il.manufactured_on as age_days,
    
    -- Weight variance from standard 1000kg
    ib.weight_kg - 1000.000 as weight_variance_kg,
    ((ib.weight_kg - 1000.000) / 1000.000) * 100 as weight_variance_pct
    
FROM inventory_bundle ib
JOIN inventory_lot il ON ib.lot_id = il.lot_id;

-- =============================================================================
-- Schema setup complete!
-- =============================================================================

-- Add helpful comments
COMMENT ON SCHEMA public IS 'Supply Chain Logistics App (CSLA) - Complete schema for Drop 1';

-- Success message
SELECT 'CSLA Database Schema Setup Complete! 🚀' as status,
       'Tables: ' || count(*) || ' created successfully' as summary
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quota', 'call_off', 'call_off_shipment_line', 'transport_order', 'inventory_lot', 'inventory_bundle');