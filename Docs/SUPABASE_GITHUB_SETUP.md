# Supabase GitHub Integration Setup Guide

This guide will help you set up automatic deployments from GitHub to Supabase, giving you proper version control and CI/CD for your database.

## Benefits of GitHub Integration

1. **Version Control**: All database changes are tracked in Git
2. **Code Review**: Database changes can be reviewed before deployment
3. **Rollback**: Easy to revert problematic migrations
4. **CI/CD**: Automatic deployments on push to main
5. **Environment Management**: Separate dev/staging/prod deployments

## Prerequisites

- Admin access to your Supabase projects
- Admin access to your GitHub repository
- Supabase CLI installed locally (for initial setup)

## Step 1: Get Your Supabase Project References

1. Go to your Supabase dashboard
2. For each project (dev and prod), go to Settings → General
3. Copy the "Reference ID" (it looks like: `pxwtdaqhwzweedflwora` for dev and `brixbdbunhwlhuwunqxw` for prod)

## Step 2: Generate Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name like "GitHub Actions"
4. Copy the token (you won't see it again!)

## Step 3: Get Database Passwords

For each project:
1. Go to Settings → Database
2. Copy the database password

## Step 4: Add GitHub Secrets

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SUPABASE_ACCESS_TOKEN`: Your personal access token from Step 2
   - `SUPABASE_PROJECT_REF`: `brixbdbunhwlhuwunqxw` (production)
   - `SUPABASE_DB_PASSWORD`: Your production database password
   - `SUPABASE_DEV_PROJECT_REF`: `pxwtdaqhwzweedflwora` (development)
   - `SUPABASE_DEV_DB_PASSWORD`: Your development database password

## Step 5: Migration Strategy

### File Structure
```
supabase/
├── config.toml              # Supabase configuration
├── migrations/              # Database migrations (numbered)
│   ├── 20250114000001_initial_schema.sql
│   ├── 20250114000002_add_counterparty.sql
│   └── 20250114000003_update_call_off.sql
├── functions/               # Edge Functions
│   └── calloff-crud/
│       └── index.ts
└── seed.sql                 # Optional seed data
```

### Creating New Migrations

1. **Local Development** (if you have Supabase CLI):
   ```bash
   supabase migration new add_new_feature
   ```

2. **Manual Creation**:
   - Create a new file in `supabase/migrations/`
   - Name it: `YYYYMMDDHHMMSS_description.sql`
   - Example: `20250115120000_add_inventory_tracking.sql`

### Migration Best Practices

1. **Always use IF NOT EXISTS**:
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   ```

2. **Make migrations idempotent**:
   ```sql
   DO $$ 
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'my_table' AND column_name = 'new_column') THEN
           ALTER TABLE my_table ADD COLUMN new_column VARCHAR(255);
       END IF;
   END $$;
   ```

3. **Never modify existing migrations** - always create new ones

4. **Test locally first** if possible

## Step 6: Deployment Workflow

### Automatic Deployments

With the GitHub Action set up:
1. Push changes to `main` → Deploys to production
2. Push changes to `develop` → Deploys to development (if configured)

### Manual Deployment

You can also trigger deployments manually:
1. Go to Actions tab in GitHub
2. Select "Deploy to Supabase"
3. Click "Run workflow"

## Step 7: Initial Setup

Since you already have databases, you need to create initial migration files that match your current schema:

1. **Export current schema** from Supabase:
   - Go to SQL Editor
   - Run: `pg_dump -s` (schema only)
   - Save as `supabase/migrations/20250114000001_initial_schema.sql`

2. **Mark as deployed** locally:
   ```bash
   supabase db remote commit
   ```

## Alternative: Supabase GitHub Integration

Supabase also offers a built-in GitHub integration:

1. In Supabase Dashboard → Settings → Git
2. Click "Connect to GitHub"
3. Select your repository
4. Choose branch for production deployments

This creates a more direct integration but with less control over the deployment process.

## Troubleshooting

### Migration Conflicts
- If migrations fail, check the migration history table
- You may need to manually mark migrations as completed

### Edge Function Deployment Issues
- Check function logs in Supabase dashboard
- Ensure all environment variables are set

### Permission Errors
- Make sure the access token has necessary permissions
- Database password must be correct for migrations

## Next Steps

1. Consolidate all your SQL changes into numbered migration files
2. Test the GitHub Action with a small change
3. Document your team's migration workflow
4. Consider adding staging environment

## Example Migration File

```sql
-- supabase/migrations/20250115000001_add_new_feature.sql
BEGIN;

-- Add new table
CREATE TABLE IF NOT EXISTS new_feature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_new_feature_name ON new_feature(name);

-- Enable RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow authenticated read" ON new_feature
    FOR SELECT TO authenticated USING (true);

COMMIT;
```