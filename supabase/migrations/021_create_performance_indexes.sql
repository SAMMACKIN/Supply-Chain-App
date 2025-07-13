-- Create performance indexes for query optimization
-- Migration: 021_create_performance_indexes.sql
-- Created: July 12, 2025

-- =====================================================================================
-- CALL-OFF DOMAIN INDEXES
-- =====================================================================================

-- Fast filtering by quota and status (primary use case)
CREATE INDEX idx_calloff_quota_status 
ON call_off (quota_id, status);

-- Call-off number lookups (human-readable IDs) - already exists but ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_calloff_number_unique
ON call_off (call_off_number);

-- Created by user for audit queries
CREATE INDEX idx_calloff_created_by 
ON call_off (created_by, created_at DESC);

-- Date range queries for reporting
CREATE INDEX idx_calloff_delivery_date 
ON call_off (requested_delivery_date) 
WHERE requested_delivery_date IS NOT NULL;

-- Direction and counterparty filtering
CREATE INDEX idx_calloff_counterparty_direction
ON call_off (counterparty_id, direction, status);

-- =====================================================================================
-- SHIPMENT LINE INDEXES  
-- =====================================================================================

-- Transport Order aggregation queries
CREATE INDEX idx_line_transport_order 
ON call_off_shipment_line (transport_order_id) 
WHERE transport_order_id IS NOT NULL;

-- Call-off to shipment line lookups (already exists but ensure coverage)
CREATE INDEX IF NOT EXISTS idx_line_calloff_comprehensive
ON call_off_shipment_line (call_off_id, bundle_qty);

-- Expected ship date planning queries
CREATE INDEX idx_line_ship_date_metal 
ON call_off_shipment_line (expected_ship_date, metal_code, bundle_qty)
WHERE expected_ship_date IS NOT NULL;

-- Destination party logistics planning
CREATE INDEX idx_line_destination
ON call_off_shipment_line (destination_party_id, expected_ship_date)
WHERE destination_party_id IS NOT NULL;

-- =====================================================================================
-- QUOTA INDEXES
-- =====================================================================================

-- Counterparty and period lookups (common filter pattern)
CREATE INDEX idx_quota_counterparty_period 
ON quota (counterparty_id, period_month, direction);

-- Metal code filtering with business unit
CREATE INDEX idx_quota_metal_business_unit 
ON quota (metal_code, period_month, business_unit_id);

-- Active quota lookups for balance calculations (remove CURRENT_DATE predicate)
CREATE INDEX idx_quota_active_periods 
ON quota (quota_id, period_month, business_unit_id);

-- Direction-based queries
CREATE INDEX idx_quota_direction_metal
ON quota (direction, metal_code, period_month);

-- =====================================================================================
-- INVENTORY LOT INDEXES
-- =====================================================================================

-- Supplier and metal lookups (already exists but ensure comprehensive coverage)
CREATE INDEX IF NOT EXISTS idx_lot_supplier_metal_comprehensive
ON inventory_lot (supplier_id, metal_code, status, manufactured_on);

-- Manufacturing date for FIFO/aging queries (already exists but ensure coverage)
CREATE INDEX IF NOT EXISTS idx_lot_manufactured_fifo
ON inventory_lot (manufactured_on DESC, metal_code, status);

-- Certificate lookup optimization (already exists but ensure coverage)
CREATE INDEX IF NOT EXISTS idx_lot_certificate_lookup
ON inventory_lot (certificate_url) 
WHERE certificate_url IS NOT NULL;

-- Status-based queries for operational reports
CREATE INDEX idx_lot_status_metal
ON inventory_lot (status, metal_code, manufactured_on);

-- =====================================================================================
-- INVENTORY BUNDLE INDEXES
-- =====================================================================================

-- Available-to-Promise lookups (critical performance) - already exists but ensure comprehensive
CREATE INDEX IF NOT EXISTS idx_bundle_atp_comprehensive
ON inventory_bundle (warehouse_id, status, lot_id, weight_kg);

-- Location-based queries for picking (already exists but ensure coverage)
CREATE INDEX IF NOT EXISTS idx_bundle_location_picking
ON inventory_bundle (warehouse_id, bin_location, status, bundle_id) 
WHERE status IN ('ON_HAND', 'RESERVED');

-- Weight variance monitoring (already exists but ensure coverage)
CREATE INDEX IF NOT EXISTS idx_bundle_weight_variance
ON inventory_bundle (weight_kg, warehouse_id, status) 
WHERE ABS(weight_kg - 1000.000) > 50.000; -- Flag significant variances (>5%)

-- Lot-based queries for traceability
CREATE INDEX idx_bundle_lot_traceability
ON inventory_bundle (lot_id, status, warehouse_id);

-- =====================================================================================
-- TRANSPORT ORDER INDEXES
-- =====================================================================================

-- Transport order status and carrier queries
CREATE INDEX idx_transport_status_carrier
ON transport_order (status, carrier_id, created_at DESC);

-- Booking reference lookups (already exists unique constraint)
CREATE INDEX IF NOT EXISTS idx_transport_booking_ref
ON transport_order (booking_reference)
WHERE booking_reference IS NOT NULL;

-- Created by and date for audit queries
CREATE INDEX idx_transport_created_audit
ON transport_order (created_by, created_at DESC, status);

-- Mode and equipment type for logistics planning
CREATE INDEX idx_transport_mode_equipment
ON transport_order (mode, equipment_type, status);

-- =====================================================================================
-- BUSINESS UNITS AND USER PROFILES INDEXES
-- =====================================================================================

-- User profile lookups by user_id (critical for RLS)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_lookup
ON user_profiles (user_id, business_unit_id, role);

-- Business unit code lookups
CREATE INDEX IF NOT EXISTS idx_business_units_code
ON business_units (code, region);

-- Warehouse access patterns
CREATE INDEX idx_user_profiles_warehouse_access
ON user_profiles USING GIN (warehouse_ids)
WHERE warehouse_ids IS NOT NULL AND array_length(warehouse_ids, 1) > 0;

-- Role-based queries  
CREATE INDEX idx_user_profiles_role_bu
ON user_profiles (role, business_unit_id);

-- Add comments for index documentation
COMMENT ON INDEX idx_calloff_quota_status IS 'Primary index for call-off listings filtered by quota and status';
COMMENT ON INDEX idx_bundle_atp_comprehensive IS 'Critical index for Available-to-Promise inventory lookups';
COMMENT ON INDEX idx_quota_counterparty_period IS 'Primary index for quota filtering by trading partner and time period';
COMMENT ON INDEX idx_line_transport_order IS 'Index for aggregating shipment lines by transport order';
COMMENT ON INDEX idx_user_profiles_warehouse_access IS 'GIN index for efficient warehouse access checks in RLS policies';