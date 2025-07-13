-- Row Level Security policies for quota table
-- Migration: 015_quota_policies.sql
-- Created: July 12, 2025

-- All authenticated users can read quotas within their business unit
CREATE POLICY "Users can read quotas in their business unit" ON quota
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND business_unit_id = get_user_business_unit_id()
  );

-- TRADE and PLANNER roles can create quotas within their business unit
CREATE POLICY "Trade and Planner can create quotas" ON quota
  FOR INSERT WITH CHECK (
    (user_has_trade_role() OR user_has_planner_role())
    AND business_unit_id = get_user_business_unit_id()
  );

-- TRADE and PLANNER roles can update quotas within their business unit
CREATE POLICY "Trade and Planner can update quotas" ON quota
  FOR UPDATE USING (
    (user_has_trade_role() OR user_has_planner_role())
    AND business_unit_id = get_user_business_unit_id()
  );

-- Only service role can delete quotas (for data management)
CREATE POLICY "Service role can delete quotas" ON quota
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments explaining quota policies
COMMENT ON POLICY "Users can read quotas in their business unit" ON quota IS 'All authenticated users can view quotas within their business unit';
COMMENT ON POLICY "Trade and Planner can create quotas" ON quota IS 'TRADE and PLANNER roles can create new quotas in their business unit';
COMMENT ON POLICY "Trade and Planner can update quotas" ON quota IS 'TRADE and PLANNER roles can modify quotas in their business unit';
COMMENT ON POLICY "Service role can delete quotas" ON quota IS 'Only service role can delete quotas for data management purposes';