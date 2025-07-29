# Railway Deployment Debug Guide

## Current Issue
Railway deployment builds successfully but returns 502 errors at runtime.

## Things to Check in Railway Dashboard

### 1. Environment Variables
Ensure these are set in Railway:
- `DATABASE_URL` - Should be automatically linked to Railway Postgres
- `NODE_ENV=development`
- `PORT` - Railway sets this automatically, don't override
- `FRONTEND_URL=https://supply-chain-app-git-develop-sammackin.vercel.app`

### 2. Build Logs
Check if the build completed successfully:
- TypeScript compilation
- Prisma generation
- All dependencies installed

### 3. Deploy Logs
Look for runtime errors:
- Database connection failures
- Missing environment variables
- Port binding issues

### 4. Database Connection
The backend needs to connect to Railway's Postgres. Check:
- Database is provisioned
- DATABASE_URL is properly set
- Prisma can connect

## Quick Fixes to Try

1. **Remove PORT from environment variables** - Railway sets this automatically
2. **Check DATABASE_URL format** - Should be a full PostgreSQL connection string
3. **Restart the service** - Sometimes helps with connection issues

## Test Commands
Once deployed:
```bash
# Health check
curl https://supply-chain-app-development.up.railway.app/health

# API test
curl https://supply-chain-app-development.up.railway.app/api/quotas
```

## Local Testing
To test the backend locally with Railway's database:
```bash
cd backend
npm install
# Copy DATABASE_URL from Railway
export DATABASE_URL="postgresql://..."
npm run dev
```