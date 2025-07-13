-- Add additional timestamp fields to call_off table for state machine tracking
-- Migration: 026_add_calloff_timestamps.sql
-- Created: July 12, 2025

-- Add fields that may be missing from the call_off table for proper state tracking
ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add helpful comments
COMMENT ON COLUMN call_off.fulfilled_at IS 'Timestamp when call-off was fulfilled (final delivery completed)';
COMMENT ON COLUMN call_off.cancellation_reason IS 'Optional reason provided when call-off was cancelled';

-- Update existing triggers to handle the new fulfilled_at timestamp
-- The fulfilled_at will be set by the Edge Function, not by trigger

-- Add constraint to ensure cancellation_reason is only set when status is CANCELLED
ALTER TABLE call_off 
ADD CONSTRAINT chk_cancellation_reason_with_status
CHECK (
  (status = 'CANCELLED' AND cancellation_reason IS NOT NULL) OR
  (status != 'CANCELLED' AND cancellation_reason IS NULL) OR
  (status = 'CANCELLED' AND cancellation_reason IS NULL)
);

-- Add constraint to ensure fulfilled_at is only set when status is FULFILLED
ALTER TABLE call_off 
ADD CONSTRAINT chk_fulfilled_at_with_status
CHECK (
  (status = 'FULFILLED' AND fulfilled_at IS NOT NULL) OR
  (status != 'FULFILLED' AND fulfilled_at IS NULL)
);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Call-off timestamp fields migration completed successfully';
  RAISE NOTICE 'Added fulfilled_at and cancellation_reason columns';
  RAISE NOTICE 'Added constraints for state consistency';
END $$;