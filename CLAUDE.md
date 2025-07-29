# Supply Chain App Migration Status

## Current Situation (July 2025)
Migrating from Supabase to Railway + Vercel due to persistent Supabase issues (pooler problems, migration failures, schema sync issues).

## Architecture
- **Frontend**: React/Vite → Vercel (existing)
- **Backend**: Express/TypeScript → Railway (new)
- **Database**: PostgreSQL → Railway (migrated from Supabase)
- **Auth**: Temporarily disabled (was Supabase → will be Clerk)

## Completed ✅
1. Database exported from Supabase dev (20 quotas, 10 counterparties)
2. Database imported to Railway PostgreSQL
3. Backend API created with Express/Prisma matching all Edge Functions
4. Railway project set up with PostgreSQL
5. Environment files created for easy configuration
6. Auth temporarily disabled for easier testing
7. TypeScript/Prisma moved to dependencies for Railway build

## Current Status 🔄
**Task 039: Supabase to Railway Migration - Backend deployment failing**
- Railway can't find backend directory
- Need to check root directory setting in Railway
- See: `/docs/tasks/task-039-supabase-to-railway-migration.md`

## Next Steps (Priority Order)

### Today - Get Dev Working
1. **Verify Railway Deploy** ⏳
   - Check Railway dashboard for green deployment
   - If failed, check build logs

2. **Test Backend**
   ```bash
   curl https://supply-chain-app-development.up.railway.app/health
   curl https://supply-chain-app-development.up.railway.app/api/quotas
   ```

3. **Configure Vercel**
   - Add: `VITE_API_URL=https://supply-chain-app-development.up.railway.app/api`
   - To Preview environment variables
   - Redeploy

4. **Test One Component**
   - Update `MuiQuotas.tsx` to use `fetchQuotas()` from `lib/api.ts`
   - Verify quotas load from Railway

### Tomorrow - Complete Migration
5. **Migrate Core Components**
   - `CallOffList.tsx` - List call-offs
   - `CreateCallOffForm.tsx` - Create new call-offs
   - `CallOffDetailView.tsx` - View/edit call-offs
   - `ShipmentLineList.tsx` - Manage shipments

6. **Remove Supabase**
   - Uninstall @supabase/supabase-js
   - Delete supabase config files
   - Remove Supabase env vars from Vercel

### Later - Production Ready
7. **Add Authentication**
   - Set up Clerk
   - Update AuthProvider
   - Protect API routes

8. **Clean Up**
   - Delete old migration files
   - Set up Prisma migrations properly
   - Configure production environment

## Quick Commands
```bash
# Test backend health
curl https://supply-chain-app-development.up.railway.app/health

# Push changes
git add -A && git commit -m "message" && git push origin develop

# Database connection
postgresql://postgres:osmmuWpxZTqxWPlTXREBLQarlhinzybq@centerbeam.proxy.rlwy.net:18946/railway
```

## Environment Variables Status
- ✅ Railway: Has DATABASE_URL, NODE_ENV, PORT, FRONTEND_URL
- ⏳ Vercel: Needs VITE_API_URL added

## Files to Update for Migration
1. `frontend/src/pages/MuiQuotas.tsx` - Test with quotas first
2. `frontend/src/pages/MuiCallOffs.tsx` - Call-off list
3. `frontend/src/components/CallOff/CreateCallOffForm.tsx` - Create form
4. `frontend/src/components/CallOff/CallOffDetailView.tsx` - Details view
5. `frontend/src/services/calloff-api.ts` - Main API service

## Success Metrics
- [ ] Backend health check returns ok
- [ ] Quotas load from Railway API
- [ ] Can create new call-offs
- [ ] Can view/edit call-offs
- [ ] All components migrated
- [ ] Supabase removed