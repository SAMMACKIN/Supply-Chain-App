-- Row Level Security policies for transport_order table
-- Migration: 015_transport_policies.sql
-- Created: July 12, 2025

-- All authenticated users can read transport orders for call-offs in their business unit
CREATE POLICY "Users can read transport orders in their business unit" ON transport_order
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM call_off_shipment_line csl
      JOIN call_off co ON co.call_off_id = csl.call_off_id
      JOIN quota q ON q.quota_id = co.quota_id
      WHERE csl.transport_order_id = transport_order.transport_order_id 
      AND q.business_unit_id = get_user_business_unit_id()
    )
  );

-- OPS role can create transport orders (no specific restrictions for creation)
CREATE POLICY "OPS can create transport orders" ON transport_order
  FOR INSERT WITH CHECK (
    user_has_ops_role()
  );

-- OPS role can update transport orders in their business unit
CREATE POLICY "OPS can update transport orders" ON transport_order
  FOR UPDATE USING (
    user_has_ops_role()
    AND (
      -- Allow if no shipment lines exist yet (new transport order)
      NOT EXISTS (
        SELECT 1 FROM call_off_shipment_line csl 
        WHERE csl.transport_order_id = transport_order.transport_order_id
      )
      OR
      -- Allow if transport order is linked to call-offs in user's business unit
      EXISTS (
        SELECT 1 FROM call_off_shipment_line csl
        JOIN call_off co ON co.call_off_id = csl.call_off_id
        JOIN quota q ON q.quota_id = co.quota_id
        WHERE csl.transport_order_id = transport_order.transport_order_id 
        AND q.business_unit_id = get_user_business_unit_id()
      )
    )
  );

-- PLANNER role can also update transport orders (for planning purposes)
CREATE POLICY "Planner can update transport orders" ON transport_order
  FOR UPDATE USING (
    user_has_planner_role()
    AND (
      -- Allow if no shipment lines exist yet (new transport order)
      NOT EXISTS (
        SELECT 1 FROM call_off_shipment_line csl 
        WHERE csl.transport_order_id = transport_order.transport_order_id
      )
      OR
      -- Allow if transport order is linked to call-offs in user's business unit
      EXISTS (
        SELECT 1 FROM call_off_shipment_line csl
        JOIN call_off co ON co.call_off_id = csl.call_off_id
        JOIN quota q ON q.quota_id = co.quota_id
        WHERE csl.transport_order_id = transport_order.transport_order_id 
        AND q.business_unit_id = get_user_business_unit_id()
      )
    )
  );

-- Only service role can delete transport orders (for data management)
CREATE POLICY "Service role can delete transport orders" ON transport_order
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments explaining transport order policies
COMMENT ON POLICY "Users can read transport orders in their business unit" ON transport_order IS 'All authenticated users can view transport orders for call-offs in their business unit';
COMMENT ON POLICY "OPS can create transport orders" ON transport_order IS 'OPS role can create transport orders for call-offs in their business unit';
COMMENT ON POLICY "OPS can update transport orders" ON transport_order IS 'OPS role can modify transport orders in their business unit';
COMMENT ON POLICY "Planner can update transport orders" ON transport_order IS 'PLANNER role can modify transport orders for planning purposes';
COMMENT ON POLICY "Service role can delete transport orders" ON transport_order IS 'Only service role can delete transport orders for data management purposes';