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
- ⏳ Backend deployment failing - needs root directory fix
- ⏳ Frontend still using Supabase

## Technical Implementation

### Phase 1: Backend Setup (Current)
- [x] Create Express/TypeScript backend
- [x] Set up Prisma ORM
- [x] Create API routes matching Edge Functions
- [x] Configure Railway deployment
- [ ] Fix Railway build issues
- [ ] Verify API endpoints work

### Phase 2: Frontend Migration
- [ ] Add VITE_API_URL to Vercel
- [ ] Update data fetching to use new API
- [ ] Test with quotas page first
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
1. Railway deployment - "can't find backend" error
   - Need to ensure root directory is set to `backend`
   - May need to check Railway.toml configuration

## Next Immediate Steps
1. Fix Railway root directory setting
2. Push change to trigger new deployment
3. Test health endpoint
4. Add VITE_API_URL to Vercel
5. Update one component as proof of concept

## Files Modified
- `/backend/*` - New backend application
- `/frontend/src/lib/api.ts` - API abstraction layer
- `/frontend/src/services/api-client.ts` - New API client
- `/.github/workflows/railway-deploy.yml` - Railway CI/CD
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