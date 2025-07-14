-- Create business intelligence views for common queries
-- Migration: 009_create_business_views.sql
-- Created: July 12, 2025

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

-- Add comment explaining the view
COMMENT ON VIEW v_call_off_summary IS 
'Comprehensive call-off view with quota details and shipment line aggregations for UI displays';

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

-- Add comment explaining the view
COMMENT ON VIEW v_quota_balance IS 
'Quota utilization and remaining capacity calculations for call-off validation and reporting';

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

-- Add comment explaining the view
COMMENT ON VIEW v_bundle_availability IS 
'Bundle availability with lot details and calculated fields for inventory management';

-- Create materialized view for heavy reporting queries (optional optimization)
-- Note: Materialized views need manual refresh but provide better performance
CREATE MATERIALIZED VIEW mv_quota_utilization_summary AS
SELECT 
    DATE_TRUNC('month', q.period_month) as period_month,
    q.metal_code,
    q.direction,
    COUNT(*) as quota_count,
    SUM(q.qty_t) as total_quota_qty,
    SUM(qb.consumed_bundles) as total_consumed_bundles,
    SUM(qb.remaining_qty) as total_remaining_qty,
    AVG(qb.utilization_pct) as avg_utilization_pct,
    MAX(qb.utilization_pct) as max_utilization_pct
FROM quota q
JOIN v_quota_balance qb ON q.quota_id = qb.quota_id
GROUP BY DATE_TRUNC('month', q.period_month), q.metal_code, q.direction
ORDER BY period_month DESC, q.metal_code, q.direction;

-- Add comment explaining the materialized view
COMMENT ON MATERIALIZED VIEW mv_quota_utilization_summary IS 
'Aggregated quota utilization by month, metal, and direction for executive reporting';

-- Create index on materialized view for faster queries
CREATE INDEX idx_mv_quota_util_period_metal ON mv_quota_utilization_summary (period_month, metal_code);