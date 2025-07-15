-- Fix Call-off Access Issues
-- This migration adds a temporary permissive policy to allow call-off reads

-- Add a more permissive policy for call-offs to allow authenticated read access
CREATE POLICY "Allow authenticated call_off reads (temporary)" ON call_off
FOR SELECT 
TO authenticated
USING (true);

-- Also allow anonymous reads for development/testing (remove in production)
CREATE POLICY "Allow anon call_off reads (dev only)" ON call_off
FOR SELECT 
TO anon
USING (true);

-- Add logging to help debug RLS issues
COMMENT ON POLICY "Allow authenticated call_off reads (temporary)" ON call_off IS 
'Temporary policy to fix call-off loading issues. Should be replaced with proper business unit-based access control.';

COMMENT ON POLICY "Allow anon call_off reads (dev only)" ON call_off IS 
'Development-only policy for anonymous access. Remove in production.';

-- Log this change
DO $$
BEGIN
  RAISE NOTICE 'Added temporary permissive call_off policies to fix loading issues';
END $$;