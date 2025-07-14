-- Row Level Security policies for call_off table
-- Migration: 014_call_off_policies.sql
-- Created: July 12, 2025

-- All authenticated users can read call-offs for quotas in their business unit
CREATE POLICY "Users can read call-offs in their business unit" ON call_off
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- TRADE and PLANNER roles can create call-offs for quotas in their business unit
CREATE POLICY "Trade and Planner can create call-offs" ON call_off
  FOR INSERT WITH CHECK (
    (user_has_trade_role() OR user_has_planner_role())
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- TRADE and PLANNER roles can update call-offs for quotas in their business unit
CREATE POLICY "Trade and Planner can update call-offs" ON call_off
  FOR UPDATE USING (
    (user_has_trade_role() OR user_has_planner_role())
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- OPS role can update call-off status (for fulfillment tracking)
CREATE POLICY "OPS can update call-off status" ON call_off
  FOR UPDATE USING (
    user_has_ops_role()
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- Only service role can delete call-offs (for data management)
CREATE POLICY "Service role can delete call-offs" ON call_off
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments explaining call-off policies
COMMENT ON POLICY "Users can read call-offs in their business unit" ON call_off IS 'All authenticated users can view call-offs for quotas in their business unit';
COMMENT ON POLICY "Trade and Planner can create call-offs" ON call_off IS 'TRADE and PLANNER roles can create call-offs for quotas in their business unit';
COMMENT ON POLICY "Trade and Planner can update call-offs" ON call_off IS 'TRADE and PLANNER roles can modify call-offs in their business unit';
COMMENT ON POLICY "OPS can update call-off status" ON call_off IS 'OPS role can update call-off status for fulfillment tracking';
COMMENT ON POLICY "Service role can delete call-offs" ON call_off IS 'Only service role can delete call-offs for data management purposes';