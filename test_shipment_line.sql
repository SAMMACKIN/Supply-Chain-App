-- Test shipment line creation

-- 1. Check if the call_off exists
SELECT 
    call_off_id,
    call_off_number,
    status,
    bundle_qty
FROM call_off 
WHERE call_off_id = '3a1c4bab-a6b7-4965-9116-f88f1da17079';

-- 2. Check existing shipment lines for this call_off
SELECT * FROM call_off_shipment_line 
WHERE call_off_id = '3a1c4bab-a6b7-4965-9116-f88f1da17079';

-- 3. Test insert (uncomment to test)
/*
INSERT INTO call_off_shipment_line (
    call_off_id,
    bundle_qty,
    metal_code,
    status
) VALUES (
    '3a1c4bab-a6b7-4965-9116-f88f1da17079',
    10,
    'CU',
    'PLANNED'
) RETURNING *;
*/

-- 4. Check if shipment_line_status enum has the right values
SELECT unnest(enum_range(NULL::shipment_line_status)) as status_values;