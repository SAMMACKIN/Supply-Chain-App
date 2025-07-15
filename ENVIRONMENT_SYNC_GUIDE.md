# Environment Sync Guide

## Overview
This guide explains how to keep your Supabase environments (preview/development and production) in sync.

## Current Setup

### Environments
1. **Production** (main branch) - `brixbdbunhwlhuwunqxw.supabase.co`
2. **Preview/Development** (develop branch) - `pxwtdaqhwzweedflwora.supabase.co`

### Deployment Flow
- Push to `develop` → Deploys to Preview
- Push to `main` → Deploys to Production

## Common Sync Issues & Solutions

### 1. Missing Database Columns (like business_unit_id)
**Problem**: Production missing columns that exist in preview
**Solution**: 
```sql
-- Run the migration script in production SQL editor
-- Example: supabase/migrations/20250115_fix_quota_business_unit.sql
```

### 2. Missing Data (like quotas)
**Problem**: No quotas in production
**Solution**:
```sql
-- Run the import script in production SQL editor
-- Example: supabase/migrations/20250115_import_production_quotas.sql
```

### 3. Edge Function Out of Sync
**Problem**: Edge Function expects columns that don't exist
**Solution**: Push to main branch to deploy latest Edge Function

## Best Practices

### 1. Migration Strategy
- Always create migrations with IF NOT EXISTS checks
- Test migrations in preview first
- Keep migrations small and focused
- Name migrations with timestamps: `YYYYMMDD_description.sql`

### 2. Data Sync
- Use counterparty relationships (don't use random UUIDs)
- Create realistic test data
- Always include rollback scripts

### 3. Deployment Process
```bash
# 1. Test in preview
git checkout develop
# make changes
git push origin develop
# verify in preview environment

# 2. Deploy to production
git checkout main
git merge develop
git push origin main
# verify in production
```

### 4. Emergency Fixes
If production breaks:
1. Create a hotfix migration
2. Run directly in production SQL editor
3. Update Edge Functions to handle missing columns gracefully
4. Backport fixes to develop branch

## Environment Sync Checklist

Before deploying to production:
- [ ] All migrations tested in preview
- [ ] Edge Functions handle missing columns gracefully
- [ ] Test data is appropriate for production
- [ ] No hardcoded environment-specific values
- [ ] CI/CD pipeline shows green

## Monitoring

Check deployment status:
- GitHub Actions: https://github.com/SAMMACKIN/Supply-Chain-App/actions
- Supabase Dashboard: Check Edge Functions logs
- Frontend: Verify data loads correctly

## Common SQL Commands

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quota' 
AND column_name = 'business_unit_id';

-- List all quotas
SELECT * FROM quota ORDER BY created_at DESC;

-- Check counterparties
SELECT * FROM counterparty WHERE is_active = true;

-- Verify relationships
SELECT 
    q.quota_id,
    q.metal_code,
    q.qty_t,
    c.company_name
FROM quota q
JOIN counterparty c ON q.counterparty_id = c.counterparty_id;
```