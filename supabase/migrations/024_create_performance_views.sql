-- Create performance views for optimized data access
-- Migration: 024_create_performance_views.sql
-- Created: July 12, 2025

-- =====================================================================================
-- CALL-OFF DOMAIN VIEWS
-- =====================================================================================

-- Drop existing views and materialized views to avoid column order conflicts
DROP MATERIALIZED VIEW IF EXISTS mv_quota_utilization_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_call_off_performance_summary;
DROP VIEW IF EXISTS v_call_off_summary;
DROP VIEW IF EXISTS v_quota_balance;
DROP VIEW IF EXISTS v_inventory_position;
DROP VIEW IF EXISTS v_atp_inventory;
DROP VIEW IF EXISTS v_call_off_performance;
DROP VIEW IF EXISTS v_transport_utilization;
DROP VIEW IF EXISTS v_executive_dashboard;

-- Comprehensive call-off summary view with quota and shipment details
CREATE OR REPLACE VIEW v_call_off_summary AS
SELECT 
  co.call_off_id,
  co.call_off_number,
  co.status,
  co.bundle_qty,
  co.requested_delivery_date,
  co.counterparty_id,
  co.direction,
  co.incoterm_code,
  co.created_by,
  co.created_at,
  co.confirmed_at,
  co.cancelled_at,
  
  -- Quota details
  q.quota_id,
  q.period_month,
  q.qty_t as quota_qty_tonnes,
  q.tolerance_pct,
  q.metal_code,
  q.business_unit_id,
  
  -- Shipment planning details
  COUNT(csl.shipment_line_id) as shipment_line_count,
  COALESCE(SUM(csl.bundle_qty), 0) as planned_bundle_qty,
  co.bundle_qty - COALESCE(SUM(csl.bundle_qty), 0) as unplanned_bundle_qty,
  
  -- Status indicators
  CASE 
    WHEN co.bundle_qty = COALESCE(SUM(csl.bundle_qty), 0) THEN 'FULLY_PLANNED'
    WHEN COALESCE(SUM(csl.bundle_qty), 0) > 0 THEN 'PARTIALLY_PLANNED'
    ELSE 'NOT_PLANNED'
  END as planning_status,
  
  -- Transport order assignment
  COUNT(DISTINCT csl.transport_order_id) FILTER (WHERE csl.transport_order_id IS NOT NULL) as transport_order_count
  
FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
LEFT JOIN call_off_shipment_line csl ON co.call_off_id = csl.call_off_id
GROUP BY 
  co.call_off_id, co.call_off_number, co.status, co.bundle_qty, 
  co.requested_delivery_date, co.counterparty_id, co.direction, 
  co.incoterm_code, co.created_by, co.created_at, co.confirmed_at, co.cancelled_at,
  q.quota_id, q.period_month, q.qty_t, q.tolerance_pct, q.metal_code, q.business_unit_id;

-- =====================================================================================
-- QUOTA BALANCE AND UTILIZATION VIEWS
-- =====================================================================================

-- Quota balance view with consumption tracking
CREATE OR REPLACE VIEW v_quota_balance AS
SELECT 
  q.quota_id,
  q.counterparty_id,
  q.period_month,
  q.metal_code,
  q.direction,
  q.business_unit_id,
  q.qty_t as quota_qty_tonnes,
  q.tolerance_pct,
  q.incoterm_code,
  q.created_at,
  
  -- Consumption calculations
  COALESCE(SUM(co.bundle_qty) FILTER (WHERE co.status IN ('CONFIRMED', 'FULFILLED')), 0) as consumed_bundles,
  COALESCE(SUM(co.bundle_qty) FILTER (WHERE co.status = 'NEW'), 0) as pending_bundles,
  COALESCE(SUM(co.bundle_qty), 0) as total_committed_bundles,
  
  -- Remaining capacity
  q.qty_t - COALESCE(SUM(co.bundle_qty) FILTER (WHERE co.status IN ('CONFIRMED', 'FULFILLED')), 0) as remaining_qty_tonnes,
  q.qty_t - COALESCE(SUM(co.bundle_qty), 0) as uncommitted_qty_tonnes,
  
  -- Utilization percentages
  ROUND(
    (COALESCE(SUM(co.bundle_qty) FILTER (WHERE co.status IN ('CONFIRMED', 'FULFILLED')), 0) / q.qty_t) * 100, 
    2
  ) as utilization_pct,
  
  ROUND(
    (COALESCE(SUM(co.bundle_qty), 0) / q.qty_t) * 100, 
    2
  ) as commitment_pct,
  
  -- Status indicators
  COUNT(co.call_off_id) as call_off_count,
  COUNT(co.call_off_id) FILTER (WHERE co.status = 'NEW') as new_call_off_count,
  COUNT(co.call_off_id) FILTER (WHERE co.status = 'CONFIRMED') as confirmed_call_off_count,
  COUNT(co.call_off_id) FILTER (WHERE co.status = 'FULFILLED') as fulfilled_call_off_count,
  
  -- Tolerance check
  CASE 
    WHEN q.tolerance_pct IS NOT NULL AND 
         COALESCE(SUM(co.bundle_qty), 0) > (q.qty_t * (1 + q.tolerance_pct / 100))
    THEN 'OVER_TOLERANCE'
    WHEN COALESCE(SUM(co.bundle_qty), 0) > q.qty_t 
    THEN 'OVER_QUOTA'
    ELSE 'WITHIN_LIMITS'
  END as tolerance_status

FROM quota q
LEFT JOIN call_off co ON q.quota_id = co.quota_id
GROUP BY 
  q.quota_id, q.counterparty_id, q.period_month, q.metal_code, 
  q.direction, q.business_unit_id, q.qty_t, q.tolerance_pct, 
  q.incoterm_code, q.created_at;

-- =====================================================================================
-- INVENTORY POSITION VIEWS
-- =====================================================================================

-- Inventory position summary by warehouse and metal
CREATE OR REPLACE VIEW v_inventory_position AS
SELECT
  ib.warehouse_id,
  il.metal_code,
  il.supplier_id,
  ib.status,
  
  -- Lot-level aggregations
  COUNT(DISTINCT il.lot_id) as lot_count,
  MIN(il.manufactured_on) as oldest_manufacture_date,
  MAX(il.manufactured_on) as newest_manufacture_date,
  AVG(il.purity_pct) as avg_purity_pct,
  
  -- Bundle-level aggregations
  COUNT(ib.bundle_id) as bundle_count,
  SUM(ib.weight_kg) as total_weight_kg,
  SUM(ib.weight_kg) / 1000.0 as total_weight_tonnes,
  AVG(ib.weight_kg) as avg_bundle_weight_kg,
  MIN(ib.weight_kg) as min_bundle_weight_kg,
  MAX(ib.weight_kg) as max_bundle_weight_kg,
  
  -- Weight variance analysis
  STDDEV(ib.weight_kg) as weight_stddev,
  COUNT(ib.bundle_id) FILTER (WHERE ABS(ib.weight_kg - 1000.0) > 50.0) as variance_bundle_count,
  
  -- Aging analysis
  COUNT(ib.bundle_id) FILTER (WHERE il.manufactured_on < CURRENT_DATE - INTERVAL '6 months') as aged_bundle_count,
  COUNT(ib.bundle_id) FILTER (WHERE il.manufactured_on < CURRENT_DATE - INTERVAL '1 year') as old_bundle_count,
  
  -- Timestamps
  MIN(ib.created_at) as earliest_receipt,
  MAX(ib.updated_at) as latest_update

FROM inventory_lot il
JOIN inventory_bundle ib ON il.lot_id = ib.lot_id
GROUP BY 
  ib.warehouse_id, il.metal_code, il.supplier_id, ib.status;

-- Available-to-Promise (ATP) view for quick availability checks
CREATE OR REPLACE VIEW v_atp_inventory AS
SELECT
  ib.warehouse_id,
  il.metal_code,
  il.supplier_id,
  
  -- Available quantities
  COUNT(ib.bundle_id) FILTER (WHERE ib.status = 'ON_HAND') as available_bundles,
  SUM(ib.weight_kg) FILTER (WHERE ib.status = 'ON_HAND') / 1000.0 as available_tonnes,
  
  -- Reserved quantities  
  COUNT(ib.bundle_id) FILTER (WHERE ib.status = 'RESERVED') as reserved_bundles,
  SUM(ib.weight_kg) FILTER (WHERE ib.status = 'RESERVED') / 1000.0 as reserved_tonnes,
  
  -- Total on-site
  COUNT(ib.bundle_id) FILTER (WHERE ib.status IN ('ON_HAND', 'RESERVED')) as onsite_bundles,
  SUM(ib.weight_kg) FILTER (WHERE ib.status IN ('ON_HAND', 'RESERVED')) / 1000.0 as onsite_tonnes,
  
  -- Quality metrics
  AVG(il.purity_pct) FILTER (WHERE ib.status = 'ON_HAND') as avg_available_purity,
  MIN(il.manufactured_on) FILTER (WHERE ib.status = 'ON_HAND') as oldest_available_date,
  MAX(il.manufactured_on) FILTER (WHERE ib.status = 'ON_HAND') as newest_available_date

FROM inventory_lot il
JOIN inventory_bundle ib ON il.lot_id = ib.lot_id
WHERE ib.status IN ('ON_HAND', 'RESERVED')
GROUP BY 
  ib.warehouse_id, il.metal_code, il.supplier_id;

-- =====================================================================================
-- OPERATIONAL PERFORMANCE VIEWS
-- =====================================================================================

-- Call-off workflow performance metrics
CREATE OR REPLACE VIEW v_call_off_performance AS
SELECT 
  DATE_TRUNC('month', co.created_at) AS month,
  q.business_unit_id,
  co.direction,
  q.metal_code,
  co.status,
  
  -- Volume metrics
  COUNT(*) AS call_off_count,
  SUM(co.bundle_qty) AS total_bundles,
  SUM(co.bundle_qty) * 1.0 AS total_tonnes,
  AVG(co.bundle_qty) AS avg_bundle_qty_per_calloff,
  
  -- Performance metrics (using confirmed_at or current time for processing days)
  AVG(EXTRACT(days FROM (COALESCE(co.confirmed_at, CURRENT_TIMESTAMP) - co.created_at))) AS avg_processing_days,
  MIN(EXTRACT(days FROM (COALESCE(co.confirmed_at, CURRENT_TIMESTAMP) - co.created_at))) AS min_processing_days,
  MAX(EXTRACT(days FROM (COALESCE(co.confirmed_at, CURRENT_TIMESTAMP) - co.created_at))) AS max_processing_days,
  
  -- Delivery performance
  COUNT(*) FILTER (WHERE co.requested_delivery_date IS NOT NULL) as delivery_scheduled_count,
  COUNT(*) FILTER (WHERE co.requested_delivery_date < CURRENT_DATE AND co.status != 'FULFILLED') as overdue_count,
  
  -- Planning efficiency
  AVG(
    (SELECT COUNT(*) FROM call_off_shipment_line csl WHERE csl.call_off_id = co.call_off_id)
  ) as avg_shipment_lines_per_calloff

FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
GROUP BY 
  DATE_TRUNC('month', co.created_at), q.business_unit_id, 
  co.direction, q.metal_code, co.status;

-- Transport order utilization view
CREATE OR REPLACE VIEW v_transport_utilization AS
SELECT
  to_order.transport_order_id,
  to_order.booking_reference,
  to_order.mode,
  to_order.equipment_type,
  to_order.status,
  to_order.gross_weight_t,
  to_order.created_at,
  
  -- Shipment line details
  COUNT(csl.shipment_line_id) as shipment_line_count,
  SUM(csl.bundle_qty) as total_bundle_qty,
  SUM(csl.bundle_qty) * 1.0 as total_planned_tonnes,
  
  -- Utilization metrics
  CASE 
    WHEN to_order.gross_weight_t IS NOT NULL AND to_order.gross_weight_t > 0
    THEN ROUND((SUM(csl.bundle_qty) * 1.0 / to_order.gross_weight_t) * 100, 2)
    ELSE NULL
  END as weight_utilization_pct,
  
  -- Planning status
  CASE 
    WHEN COUNT(csl.shipment_line_id) = 0 THEN 'EMPTY'
    WHEN to_order.gross_weight_t IS NOT NULL AND SUM(csl.bundle_qty) * 1.0 >= to_order.gross_weight_t * 0.95 THEN 'FULL'
    ELSE 'PARTIAL'
  END as utilization_status,
  
  -- Destination diversity
  COUNT(DISTINCT csl.destination_party_id) as destination_count,
  COUNT(DISTINCT csl.metal_code) as metal_code_count

FROM transport_order to_order
LEFT JOIN call_off_shipment_line csl ON to_order.transport_order_id = csl.transport_order_id
GROUP BY 
  to_order.transport_order_id, to_order.booking_reference, to_order.mode,
  to_order.equipment_type, to_order.status, to_order.gross_weight_t, to_order.created_at;

-- =====================================================================================
-- BUSINESS INTELLIGENCE VIEWS
-- =====================================================================================

-- Executive dashboard view
CREATE OR REPLACE VIEW v_executive_dashboard AS
SELECT
  q.business_unit_id,
  q.period_month,
  
  -- Quota metrics
  COUNT(DISTINCT q.quota_id) as quota_count,
  SUM(q.qty_t) as total_quota_tonnes,
  COUNT(DISTINCT q.counterparty_id) as active_counterparty_count,
  COUNT(DISTINCT q.metal_code) as active_metal_count,
  
  -- Call-off metrics
  COUNT(DISTINCT co.call_off_id) as call_off_count,
  SUM(co.bundle_qty) FILTER (WHERE co.status = 'FULFILLED') as fulfilled_bundles,
  SUM(co.bundle_qty) FILTER (WHERE co.status = 'CONFIRMED') as confirmed_bundles,
  SUM(co.bundle_qty) FILTER (WHERE co.status = 'NEW') as new_bundles,
  
  -- Performance indicators (using confirmed_at for fulfilled call-offs)
  ROUND(
    AVG(EXTRACT(days FROM (co.confirmed_at - co.created_at))) FILTER (WHERE co.status = 'FULFILLED' AND co.confirmed_at IS NOT NULL),
    1
  ) as avg_fulfillment_days,
  
  -- Utilization
  ROUND(
    (SUM(co.bundle_qty) FILTER (WHERE co.status IN ('CONFIRMED', 'FULFILLED')) / SUM(q.qty_t)) * 100,
    2
  ) as quota_utilization_pct

FROM quota q
LEFT JOIN call_off co ON q.quota_id = co.quota_id
GROUP BY q.business_unit_id, q.period_month;

-- Add helpful view comments
COMMENT ON VIEW v_call_off_summary IS 'Comprehensive call-off view with quota details and shipment planning status';
COMMENT ON VIEW v_quota_balance IS 'Quota utilization and remaining capacity tracking';
COMMENT ON VIEW v_inventory_position IS 'Inventory position by warehouse, metal, and status';
COMMENT ON VIEW v_atp_inventory IS 'Available-to-Promise inventory for allocation decisions';
COMMENT ON VIEW v_call_off_performance IS 'Call-off workflow performance metrics by month and business unit';
COMMENT ON VIEW v_transport_utilization IS 'Transport order capacity utilization and planning efficiency';
COMMENT ON VIEW v_executive_dashboard IS 'High-level business metrics for executive reporting';