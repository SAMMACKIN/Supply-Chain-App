-- Fix Quota Access Issues
-- This migration adds a temporary permissive policy to allow quota reads

-- Add a more permissive policy for quotas to allow authenticated read access
CREATE POLICY "Allow authenticated quota reads (temporary)" ON quota
FOR SELECT 
TO authenticated
USING (true);

-- Also allow anonymous reads for development/testing (remove in production)
CREATE POLICY "Allow anon quota reads (dev only)" ON quota
FOR SELECT 
TO anon
USING (true);

-- Add logging to help debug RLS issues
COMMENT ON POLICY "Allow authenticated quota reads (temporary)" ON quota IS 
'Temporary policy to fix quota loading issues. Should be replaced with proper business unit-based access control.';

COMMENT ON POLICY "Allow anon quota reads (dev only)" ON quota IS 
'Development-only policy for anonymous access. Remove in production.';

-- Log this change
DO $$
BEGIN
  RAISE NOTICE 'Added temporary permissive quota policies to fix loading issues';
END $$;