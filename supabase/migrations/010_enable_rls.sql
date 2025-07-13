-- Enable Row Level Security on all tables
-- Migration: 010_enable_rls.sql
-- Created: July 12, 2025

-- Enable RLS on all business tables
ALTER TABLE quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bundle ENABLE ROW LEVEL SECURITY;

-- Add comments explaining RLS activation
COMMENT ON TABLE quota IS 'Quota table with RLS enabled - read-only for users, write for service role';
COMMENT ON TABLE call_off IS 'Call-off table with RLS enabled - BU-scoped access based on user role';
COMMENT ON TABLE call_off_shipment_line IS 'Shipment lines with RLS enabled - inherits call-off permissions';
COMMENT ON TABLE transport_order IS 'Transport orders with RLS enabled - OPS role with BU scope';
COMMENT ON TABLE inventory_lot IS 'Inventory lots with RLS enabled - supplier and BU scoped';
COMMENT ON TABLE inventory_bundle IS 'Inventory bundles with RLS enabled - warehouse and BU scoped';