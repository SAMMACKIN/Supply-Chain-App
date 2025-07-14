-- Test migration for develop deployment
-- This is a simple migration to verify the deployment pipeline works

-- Create a test comment (this doesn't create any objects)
COMMENT ON SCHEMA public IS 'Development deployment test at 2025-01-14 22:20:00';

-- Log that this migration ran
DO $$
BEGIN
  RAISE NOTICE 'Development deployment test migration executed successfully';
END $$;