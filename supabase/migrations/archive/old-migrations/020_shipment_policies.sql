-- Row Level Security policies for call_off_shipment_line table
-- Migration: 017_shipment_policies.sql
-- Created: July 12, 2025

-- All authenticated users can read shipment lines for call-offs in their business unit
CREATE POLICY "Users can read shipment lines in their business unit" ON call_off_shipment_line
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM call_off co
      JOIN quota q ON q.quota_id = co.quota_id
      WHERE co.call_off_id = call_off_shipment_line.call_off_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- OPS role can create shipment lines for call-offs in their business unit
CREATE POLICY "OPS can create shipment lines" ON call_off_shipment_line
  FOR INSERT WITH CHECK (
    user_has_ops_role()
    AND EXISTS (
      SELECT 1 FROM call_off co
      JOIN quota q ON q.quota_id = co.quota_id
      WHERE co.call_off_id = call_off_shipment_line.call_off_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- OPS role can update shipment lines (for tracking updates, POD processing)
CREATE POLICY "OPS can update shipment lines" ON call_off_shipment_line
  FOR UPDATE USING (
    user_has_ops_role()
    AND EXISTS (
      SELECT 1 FROM call_off co
      JOIN quota q ON q.quota_id = co.quota_id
      WHERE co.call_off_id = call_off_shipment_line.call_off_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- PLANNER role can also update shipment lines (for planning purposes)
CREATE POLICY "Planner can update shipment lines" ON call_off_shipment_line
  FOR UPDATE USING (
    user_has_planner_role()
    AND EXISTS (
      SELECT 1 FROM call_off co
      JOIN quota q ON q.quota_id = co.quota_id
      WHERE co.call_off_id = call_off_shipment_line.call_off_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- Only service role can delete shipment lines (for data management)
CREATE POLICY "Service role can delete shipment lines" ON call_off_shipment_line
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments explaining shipment line policies
COMMENT ON POLICY "Users can read shipment lines in their business unit" ON call_off_shipment_line IS 'All authenticated users can view shipment lines for call-offs in their business unit';
COMMENT ON POLICY "OPS can create shipment lines" ON call_off_shipment_line IS 'OPS role can create shipment lines for call-offs in their business unit';
COMMENT ON POLICY "OPS can update shipment lines" ON call_off_shipment_line IS 'OPS role can modify shipment lines for tracking updates and POD processing';
COMMENT ON POLICY "Planner can update shipment lines" ON call_off_shipment_line IS 'PLANNER role can modify shipment lines for planning purposes';
COMMENT ON POLICY "Service role can delete shipment lines" ON call_off_shipment_line IS 'Only service role can delete shipment lines for data management purposes';