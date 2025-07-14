-- Test migration to trigger develop branch deployment
-- This tests the GitHub Actions pipeline

BEGIN;

-- Just a comment change to trigger the pipeline
-- The develop branch should auto-deploy to development Supabase
-- This file can be removed after testing

COMMIT;