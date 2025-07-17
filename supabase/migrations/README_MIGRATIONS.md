# Migration Deployment Guide

## Why Migrations Might Not Run Automatically

1. **Transaction Pooler Issues**: When using transaction pooler, prepared statements can cause issues with `supabase db push`
2. **GitHub Actions Workflow**: The workflow is set to continue even if migrations fail to prevent blocking deployments

## How to Ensure Migrations Run

### Option 1: Direct Database URL (Recommended)
Instead of using the pooler URL, use the direct database URL for migrations:

```bash
# Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
supabase db push --db-url "postgresql://postgres:YOUR_PASSWORD@db.pxwtdaqhwzweedflwora.supabase.co:5432/postgres"
```

### Option 2: Update GitHub Secrets
Update your GitHub secret `SUPABASE_DEV_DB_URL` to use the direct database URL instead of the pooler URL.

### Option 3: Manual Migration
1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   - 030_add_shipment_lines_table.sql
   - 031_fix_call_off_triggers.sql
   - 032_add_counterparty_addresses.sql

## Checking Migration Status

To see which migrations have been applied:

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

## Current Migration Files

- **030_add_shipment_lines_table.sql**: Creates the shipment lines table
- **031_fix_call_off_triggers.sql**: Fixes call_off table triggers
- **032_add_counterparty_addresses.sql**: Adds multiple addresses support

## Troubleshooting

If migrations fail:
1. Check the GitHub Actions logs for specific errors
2. Verify you're using the correct database URL (not pooler)
3. Run migrations manually in SQL Editor
4. Check for conflicting migrations in the archive folder