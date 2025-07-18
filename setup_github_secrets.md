# Setting Up GitHub Secrets for Automatic Migrations

To enable automatic migration deployment, you need to add direct database URLs to your GitHub secrets.

## Required Secrets

### For Development Environment

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add a new secret named `SUPABASE_DEV_DIRECT_URL`
3. Value format: `postgresql://postgres:[YOUR_PASSWORD]@db.pxwtdaqhwzweedflwora.supabase.co:5432/postgres`

### For Production Environment

1. Add a new secret named `SUPABASE_DIRECT_URL`  
2. Value format: `postgresql://postgres:[YOUR_PASSWORD]@db.brixbdbunhwlhuwunqxw.supabase.co:5432/postgres`

## Getting Your Database Password

1. Go to Supabase Dashboard → Settings → Database
2. Find your database password (you may need to reset it if you don't know it)
3. Use this password in the connection strings above

## Why Direct URLs?

- **Pooler URLs** (containing `.pooler.supabase.com`) don't support prepared statements needed for migrations
- **Direct URLs** (containing `db.`) connect directly to PostgreSQL and support all operations

## Manual Migration Workflow

If you can't add direct URLs, you can now:

1. Go to GitHub Actions
2. Click "Run Database Migrations" workflow
3. Select environment and click "Run workflow"

This will show you exactly which migrations need to be applied and provide clear error messages.