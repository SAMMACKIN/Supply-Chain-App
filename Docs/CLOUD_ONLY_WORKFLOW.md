# Cloud-Only Development Workflow

This workflow uses Supabase cloud environments only - no local setup required!

## Architecture

```
Developer → GitHub → Development Supabase → Production Supabase
                ↓                      ↓                    ↓
            develop branch      (test here)          main branch
```

## Initial Setup (One Time)

### 1. Install Supabase CLI
```bash
brew install supabase/tap/supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Both Projects
```bash
# Link development project
supabase link --project-ref pxwtdaqhwzweedflwora

# Create initial migration from dev
supabase db remote commit
```

### 4. Create develop branch
```bash
git checkout -b develop
git push -u origin develop
```

## Daily Workflow

### Making Database Changes

1. **Create a migration file**:
```bash
supabase migration new add_new_feature
```

2. **Edit the migration**:
```bash
# Opens in your editor
# Write your SQL changes
```

3. **Push to develop branch**:
```bash
git add .
git commit -m "Add new feature"
git push origin develop
```

4. **GitHub Actions automatically deploys to dev Supabase**

5. **Test in development**:
- Frontend (dev): https://supply-chain-app-frontend-git-develop.vercel.app
- Supabase (dev): https://pxwtdaqhwzweedflwora.supabase.co

6. **When ready, deploy to production**:
```bash
git checkout main
git merge develop
git push origin main
```

7. **GitHub Actions automatically deploys to prod Supabase**

## Environment Configuration

### Frontend Environment Variables

**Development (Vercel - Preview/Development)**:
```
VITE_SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co
VITE_SUPABASE_ANON_KEY=[dev anon key]
VITE_DEV_MODE=false
```

**Production (Vercel - Production)**:
```
VITE_SUPABASE_URL=https://brixbdbunhwlhuwunqxw.supabase.co
VITE_SUPABASE_ANON_KEY=[prod anon key]
VITE_DEV_MODE=false
```

## Migration Best Practices

### Always Use Transactions
```sql
BEGIN;

-- Your changes here

COMMIT;
```

### Make Migrations Idempotent
```sql
-- Good: Can run multiple times
CREATE TABLE IF NOT EXISTS my_table (...);

-- Bad: Will fail if table exists
CREATE TABLE my_table (...);
```

### Test in Dev First
Never push directly to main without testing in develop!

## Quick Commands

```bash
# Create new migration
supabase migration new <name>

# See migration history
supabase migration list

# Check dev vs prod differences
supabase db diff --linked

# Emergency: Skip a migration
supabase migration repair <version> --status applied
```

## Troubleshooting

### "Migration already applied"
The migration was already run. Create a new migration for additional changes.

### "Permission denied"
Check your `SUPABASE_ACCESS_TOKEN` in GitHub secrets.

### "Diff shows unexpected changes"
Someone may have made manual changes. Pull the latest schema:
```bash
supabase db remote commit
```

## Example: Adding a New Table

1. Create migration:
```bash
supabase migration new add_vendor_table
```

2. Edit the file:
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS vendor (
    vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE vendor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON vendor
    FOR SELECT TO authenticated USING (true);

COMMIT;
```

3. Deploy to dev:
```bash
git add .
git commit -m "Add vendor table"
git push origin develop
```

4. Test in dev environment

5. Deploy to prod:
```bash
git checkout main
git merge develop
git push origin main
```

## Current State

- ✅ Development Supabase is fully configured
- ⚠️  Production Supabase needs the counterparty table
- ✅ GitHub Actions ready to deploy
- ✅ Both environments have Edge Functions