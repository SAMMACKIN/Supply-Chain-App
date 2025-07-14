# Production Database Migration Guide

This guide will help you sync your production Supabase database with all the improvements made in development.

## Prerequisites

- Access to your production Supabase project dashboard
- Production Supabase project URL and anon key (which you already have)

## Step 1: Apply Database Migration

1. Go to your production Supabase dashboard: https://supabase.com/dashboard/project/brixbdbunhwlhuwunqxw

2. Navigate to the SQL Editor (in the left sidebar)

3. Open the migration file: `/supabase/migrations/production_sync_20250714.sql`

4. Copy the entire contents of the migration file

5. Paste it into the SQL Editor

6. Click "Run" to execute the migration

The migration script will:
- Create all missing tables (especially `counterparty` table)
- Add missing columns to existing tables
- Create all necessary indexes and constraints
- Set up Row Level Security policies
- Create database views for reporting
- Insert sample counterparty data

## Step 2: Deploy Edge Functions

Since you don't have Supabase CLI installed, you can deploy Edge Functions through the dashboard:

1. In your production Supabase dashboard, go to "Edge Functions" in the left sidebar

2. Click "New Function" and name it `calloff-crud`

3. Copy the contents of `/supabase/functions/calloff-crud/index.ts`

4. Paste it into the function editor

5. Click "Deploy"

## Step 3: Update Environment Variables

The Edge Function needs these environment variables (they should be automatically set by Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Verify the Migration

After running the migration, verify everything worked:

1. In the SQL Editor, run these verification queries:

```sql
-- Check if counterparty table exists and has data
SELECT COUNT(*) FROM counterparty;

-- Check if call_off table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'call_off' 
AND column_name IN ('updated_at', 'fulfillment_location', 'delivery_location');

-- Check if views were created
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_%';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('counterparty', 'quota', 'call_off');
```

## Step 5: Test the Application

1. Visit your production app
2. Try logging in
3. Navigate to Quotas page - it should now load without errors
4. Try creating a call-off - it should work with the counterparty table

## Troubleshooting

### If the migration fails:

1. Check for error messages in the SQL editor
2. The migration is wrapped in a transaction, so it will rollback on error
3. Common issues:
   - Table already exists: The script handles this with `IF NOT EXISTS`
   - Permission errors: Make sure you're using an admin connection

### If Edge Functions don't work:

1. Check the Edge Function logs in the dashboard
2. Verify the function name matches what's in the frontend code
3. Check CORS settings are correct

### If authentication fails:

1. Verify RLS policies were created
2. Check that the `user_profiles` table exists
3. Make sure users have entries in the `user_profiles` table

## Next Steps

After successful migration:
1. Test all features thoroughly
2. Monitor Edge Function logs for any errors
3. Consider setting up database backups
4. Plan for regular maintenance windows

## Important Notes

- The migration script is idempotent (safe to run multiple times)
- It uses transactions, so partial failures won't leave the database in an inconsistent state
- Sample counterparty data is only inserted if the table is empty
- RLS policies are set to allow authenticated users to read data