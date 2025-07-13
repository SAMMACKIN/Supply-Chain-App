-- Create a function to safely update call-offs without trigger issues
CREATE OR REPLACE FUNCTION update_call_off_safe(
  p_call_off_id UUID,
  p_bundle_qty INTEGER DEFAULT NULL,
  p_requested_delivery_date DATE DEFAULT NULL
)
RETURNS TABLE (
  call_off_id UUID,
  quota_id UUID,
  call_off_number TEXT,
  status TEXT,
  bundle_qty INTEGER,
  requested_delivery_date DATE,
  counterparty_id UUID,
  direction TEXT,
  incoterm_code TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  cancellation_reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable the trigger
  EXECUTE 'ALTER TABLE call_off DISABLE TRIGGER update_call_off_updated_at';
  
  -- Perform the update
  RETURN QUERY
  UPDATE call_off 
  SET 
    bundle_qty = COALESCE(p_bundle_qty, call_off.bundle_qty),
    requested_delivery_date = COALESCE(p_requested_delivery_date, call_off.requested_delivery_date)
  WHERE call_off.call_off_id = p_call_off_id 
    AND call_off.status = 'NEW'
  RETURNING 
    call_off.call_off_id,
    call_off.quota_id,
    call_off.call_off_number,
    call_off.status::TEXT,
    call_off.bundle_qty,
    call_off.requested_delivery_date,
    call_off.counterparty_id,
    call_off.direction::TEXT,
    call_off.incoterm_code,
    call_off.created_by,
    call_off.created_at,
    call_off.confirmed_at,
    call_off.cancelled_at,
    call_off.fulfilled_at,
    call_off.cancellation_reason;
  
  -- Re-enable the trigger
  EXECUTE 'ALTER TABLE call_off ENABLE TRIGGER update_call_off_updated_at';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Always re-enable trigger even if update fails
    BEGIN
      EXECUTE 'ALTER TABLE call_off ENABLE TRIGGER update_call_off_updated_at';
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    RAISE;
END;
$$;