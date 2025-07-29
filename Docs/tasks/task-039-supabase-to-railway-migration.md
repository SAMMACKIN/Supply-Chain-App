# Task 039: Migrate from Supabase to Railway

**Status**: In Progress  
**Priority**: High  
**Complexity**: Large  
**Dependencies**: All previous tasks

## Overview
Complete migration from Supabase to Railway/Vercel architecture due to persistent Supabase issues (pooler problems, migration failures, schema sync issues).

## Objectives
- [ ] Set up Railway backend with Express/TypeScript
- [ ] Migrate PostgreSQL database from Supabase to Railway
- [ ] Update frontend to use new API endpoints
- [ ] Remove Supabase dependencies
- [ ] Implement authentication solution

## Current Status
- ✅ Database exported from Supabase (20 quotas, 10 counterparties)
- ✅ Database imported to Railway PostgreSQL
- ✅ Backend API created with Express/Prisma
- ✅ Railway project configured
- ✅ Railway.toml added to specify backend directory
- ✅ GitHub workflow created for automatic deployment
- ✅ Frontend updated to support Railway API (MuiQuotas.tsx)
- ⏳ Railway deployment experiencing 502 errors - debugging needed
- ⏳ Vercel environment variables need to be manually added

## Technical Implementation

### Phase 1: Backend Setup (Current)
- [x] Create Express/TypeScript backend
- [x] Set up Prisma ORM
- [x] Create API routes matching Edge Functions
- [x] Configure Railway deployment
- [x] Add railway.toml for build configuration
- [x] Create GitHub workflow for CI/CD
- [ ] Fix Railway 502 errors
- [ ] Verify API endpoints work

### Phase 2: Frontend Migration
- [ ] Add VITE_API_URL to Vercel (manual action required)
- [x] Update data fetching to use new API (lib/api.ts created)
- [x] Test with quotas page first (MuiQuotas.tsx updated)
- [ ] Migrate remaining components
- [ ] Remove Supabase client

### Phase 3: Authentication
- [ ] Implement Clerk or alternative
- [ ] Update AuthProvider
- [ ] Protect API routes
- [ ] Test auth flow

### Phase 4: Cleanup
- [ ] Remove Supabase dependencies
- [ ] Delete old migration files
- [ ] Update documentation
- [ ] Configure production

## Current Blockers
1. Railway deployment - 502 Bad Gateway errors
   - railway.toml has been added with correct build configuration
   - Deployment is being triggered but app is not responding
   - Need to check Railway dashboard logs for specific errors

## Next Immediate Steps
1. Check Railway dashboard for deployment logs
2. Verify environment variables are set in Railway:
   - DATABASE_URL (should be auto-linked to Postgres)
   - NODE_ENV=development
   - PORT=3001
   - FRONTEND_URL
3. Manually add VITE_API_URL to Vercel Preview environment
4. Once Railway is working, test the full integration flow

## Files Modified
- `/backend/*` - New backend application
- `/frontend/src/lib/api.ts` - API abstraction layer
- `/frontend/src/services/api-client.ts` - New API client
- `/frontend/src/pages/MuiQuotas.tsx` - Updated to use new API
- `/.github/workflows/railway-deploy.yml` - Railway CI/CD
- `/railway.toml` - Railway build configuration
- `/VERCEL_ENV_SETUP.md` - Vercel environment setup guide
- `/CLAUDE.md` - Migration status tracking

## Testing Requirements
- [ ] Backend health check returns 200
- [ ] Quotas API returns data
- [ ] Call-offs can be created
- [ ] Frontend loads without errors
- [ ] No CORS issues

## Success Criteria
- Dev environment fully functional on Railway/Vercel
- All CRUD operations working
- No Supabase dependencies
- Clear migration path for production

## Notes
- Auth temporarily disabled for easier testing
- Using "hybrid mode" during migration (Supabase + Railway)
- Database has been successfully migrated
- Focus on getting basic functionality working first

## References
- Railway Dashboard: Check deployment logs
- Vercel Dashboard: Add environment variables
- Database: `postgresql://postgres:osmmuWpxZTqxWPlTXREBLQarlhinzybq@centerbeam.proxy.rlwy.net:18946/railway`