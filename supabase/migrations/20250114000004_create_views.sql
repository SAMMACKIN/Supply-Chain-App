-- Create database views
BEGIN;

-- Quota balance view
CREATE OR REPLACE VIEW v_quota_balance AS
SELECT 
    q.quota_id,
    q.counterparty_id,
    c.company_name,
    q.direction,
    q.period_month,
    q.qty_t as quota_qty_tonnes,
    q.tolerance_pct,
    COALESCE(SUM(co.bundle_qty), 0) as consumed_bundles,
    COALESCE(SUM(CASE WHEN co.status = 'NEW' THEN co.bundle_qty ELSE 0 END), 0) as pending_bundles,
    q.qty_t - COALESCE(SUM(co.bundle_qty), 0) as remaining_qty_tonnes,
    ROUND((COALESCE(SUM(co.bundle_qty), 0)::numeric / q.qty_t) * 100, 2) as utilization_pct,
    CASE 
        WHEN (COALESCE(SUM(co.bundle_qty), 0)::numeric / q.qty_t) * 100 > (100 + q.tolerance_pct) THEN 'OVER_TOLERANCE'
        WHEN (COALESCE(SUM(co.bundle_qty), 0)::numeric / q.qty_t) * 100 > 95 THEN 'NEAR_LIMIT'
        ELSE 'WITHIN_LIMITS'
    END as tolerance_status,
    COUNT(DISTINCT co.call_off_id) as call_off_count
FROM quota q
JOIN counterparty c ON q.counterparty_id = c.counterparty_id
LEFT JOIN call_off co ON q.quota_id = co.quota_id AND co.status != 'CANCELLED'
GROUP BY q.quota_id, q.counterparty_id, c.company_name, q.direction, q.period_month, q.qty_t, q.tolerance_pct;

-- Call off summary view
CREATE OR REPLACE VIEW v_call_off_summary AS
SELECT 
    co.call_off_id,
    co.call_off_number,
    co.status,
    co.bundle_qty,
    co.requested_delivery_date,
    co.created_at,
    co.updated_at,
    co.fulfillment_location,
    co.delivery_location,
    q.quota_id,
    q.period_month,
    q.qty_t as quota_qty,
    q.metal_code,
    q.direction,
    c.company_name,
    c.company_code,
    c.counterparty_type
FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
JOIN counterparty c ON co.counterparty_id = c.counterparty_id;

COMMIT;