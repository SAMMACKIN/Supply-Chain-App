# Deployment Guide

## Quick Start

### Development Workflow
1. Work on `develop` branch
2. Push changes → Auto-deploys to development Supabase
3. Test at: https://pxwtdaqhwzweedflwora.supabase.co

### Production Deployment
1. Merge `develop` → `main`
2. Push to main → Auto-deploys to production Supabase
3. Live at: https://brixbdbunhwlhuwunqxw.supabase.co

## Environment Setup

### Vercel Environment Variables

**Production**:
```
VITE_SUPABASE_URL=https://brixbdbunhwlhuwunqxw.supabase.co
VITE_SUPABASE_ANON_KEY=[your-prod-anon-key]
VITE_DEV_MODE=false
```

**Preview/Development**:
```
VITE_SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co
VITE_SUPABASE_ANON_KEY=[your-dev-anon-key]
VITE_DEV_MODE=false
```

### GitHub Secrets (Already Configured)
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` (production)
- `SUPABASE_DB_PASSWORD` (production)
- `SUPABASE_DEV_PROJECT_REF` (development)
- `SUPABASE_DEV_DB_PASSWORD` (development)

## Database Migrations

### Creating New Migrations
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Create migration
supabase migration new your_migration_name

# Edit the file in supabase/migrations/
```

### Migration Guidelines
- Always use transactions (`BEGIN`/`COMMIT`)
- Make migrations idempotent (`IF NOT EXISTS`)
- Never modify existing migrations
- Test in development first

## Manual Deployment

If needed, you can trigger deployment manually:
1. Go to GitHub Actions
2. Select "Deploy Supabase Changes"
3. Click "Run workflow"
4. Choose environment

## Troubleshooting

### Edge Function Errors
Check logs in Supabase Dashboard → Edge Functions → Logs

### Database Issues
Run verification queries in SQL Editor:
```sql
-- Check foreign keys
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';

-- Check table columns
SELECT * FROM information_schema.columns 
WHERE table_name = 'your_table';
```

### Authentication Issues
Ensure environment variables are set correctly in Vercel dashboard.

## Current Architecture

```
Frontend (Vercel) → Edge Functions → Supabase Database
    ↓                    ↓                ↓
React + Vite      Deno TypeScript    PostgreSQL
```

- **Development**: develop branch → dev Supabase
- **Production**: main branch → prod Supabase
- **Edge Functions**: `calloff-crud` handles all API operations