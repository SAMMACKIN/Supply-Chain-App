-- Row Level Security policies for inventory tables
-- Migration: 016_inventory_policies.sql
-- Created: July 12, 2025

-- Inventory Lot Policies
-- All authenticated users can read inventory lots (simplified - no direct business unit on lots)
CREATE POLICY "Users can read inventory lots" ON inventory_lot
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- OPS role can create inventory lots (via ASN processing)
CREATE POLICY "OPS can create inventory lots" ON inventory_lot
  FOR INSERT WITH CHECK (
    user_has_ops_role()
  );

-- OPS role can update inventory lots (for status changes, GRN processing)
CREATE POLICY "OPS can update inventory lots" ON inventory_lot
  FOR UPDATE USING (
    user_has_ops_role()
  );

-- Only service role can delete inventory lots (for data management)
CREATE POLICY "Service role can delete inventory lots" ON inventory_lot
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- Inventory Bundle Policies
-- All authenticated users can read inventory bundles in their warehouse access scope
CREATE POLICY "Users can read inventory bundles in accessible warehouses" ON inventory_bundle
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      -- OPS role can see all warehouses
      user_has_ops_role()
      OR 
      -- Other roles can only see warehouses they have access to
      warehouse_id = ANY(get_user_warehouse_ids())
    )
  );

-- OPS role can create inventory bundles (via ASN processing)
CREATE POLICY "OPS can create inventory bundles" ON inventory_bundle
  FOR INSERT WITH CHECK (
    user_has_ops_role()
    AND user_can_access_warehouse(warehouse_id)
  );

-- OPS role can update inventory bundles (for status changes, location moves)
CREATE POLICY "OPS can update inventory bundles" ON inventory_bundle
  FOR UPDATE USING (
    user_has_ops_role()
    AND user_can_access_warehouse(warehouse_id)
  );

-- PLANNER role can also update bundles (for allocation purposes)
CREATE POLICY "Planner can update inventory bundles" ON inventory_bundle
  FOR UPDATE USING (
    user_has_planner_role()
    AND warehouse_id = ANY(get_user_warehouse_ids())
  );

-- Only service role can delete inventory bundles (for data management)
CREATE POLICY "Service role can delete inventory bundles" ON inventory_bundle
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments explaining inventory policies
COMMENT ON POLICY "Users can read inventory lots" ON inventory_lot IS 'All authenticated users can view inventory lots';
COMMENT ON POLICY "OPS can create inventory lots" ON inventory_lot IS 'OPS role can create inventory lots via ASN processing';
COMMENT ON POLICY "OPS can update inventory lots" ON inventory_lot IS 'OPS role can modify inventory lots for status changes and GRN processing';
COMMENT ON POLICY "Service role can delete inventory lots" ON inventory_lot IS 'Only service role can delete inventory lots for data management purposes';

COMMENT ON POLICY "Users can read inventory bundles in accessible warehouses" ON inventory_bundle IS 'All authenticated users can view inventory bundles in warehouses they have access to';
COMMENT ON POLICY "OPS can create inventory bundles" ON inventory_bundle IS 'OPS role can create inventory bundles via ASN processing in accessible warehouses';
COMMENT ON POLICY "OPS can update inventory bundles" ON inventory_bundle IS 'OPS role can modify inventory bundles for status changes and location moves';
COMMENT ON POLICY "Planner can update inventory bundles" ON inventory_bundle IS 'PLANNER role can modify inventory bundles for allocation purposes';
COMMENT ON POLICY "Service role can delete inventory bundles" ON inventory_bundle IS 'Only service role can delete inventory bundles for data management purposes';