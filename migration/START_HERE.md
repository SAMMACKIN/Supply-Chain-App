# 🚀 Migration Start Guide

Follow these steps in order to migrate from Supabase to Railway/Render.

## Step 1: Export Supabase Database

### Option A: Use the Export Script (Recommended)
```bash
cd migration
chmod +x export_supabase_db.sh
./export_supabase_db.sh
```
- Choose option 1 (Full export)
- Enter your password: `tfy3MrsCfcWsP4pP`
- Files will be created in `migration/exports/`

### Option B: Manual Export
```bash
# Create exports directory
mkdir -p migration/exports

# Export full database
PGPASSWORD=tfy3MrsCfcWsP4pP pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file=migration/exports/supabase_full_export.sql
```

## Step 2: Set Up Railway

1. **Create Account**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy PostgreSQL"
   - Copy the `DATABASE_URL` from Variables tab

3. **Create Backend Service**
   - In same project, click "New" → "GitHub Repo"
   - Select your repo
   - Set root directory to `backend`

## Step 3: Prepare Backend

```bash
# Install dependencies
cd backend
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=<your-railway-postgres-url>
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
```

## Step 4: Import Database

```bash
# Clean and import database
psql <railway-database-url> < ../migration/clean_export.sql
psql <railway-database-url> < ../migration/exports/supabase_full_export.sql

# Generate Prisma client
npm run db:generate

# Sync schema
npm run db:push
```

## Step 5: Deploy Backend

Railway will auto-deploy when you push to GitHub, or:
```bash
railway link
railway up
```

## Step 6: Set Up Clerk Auth

1. Go to [clerk.com](https://clerk.com)
2. Create new application
3. Get your keys
4. Add to Railway environment variables:
   - `CLERK_SECRET_KEY`
   - `CLERK_PUBLISHABLE_KEY`

## Step 7: Update Frontend

1. Install Clerk:
```bash
cd frontend
npm install @clerk/clerk-react
```

2. Update `.env`:
```
VITE_API_URL=https://your-backend.railway.app/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

3. Start migrating components using the examples in `migration/04_frontend_migration_example.md`

## Quick Test

Test your backend is working:
```bash
# Health check
curl https://your-backend.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","environment":"production"}
```

## Need Help?

- Railway deployment issues: Check `migration/05_railway_setup.md`
- Frontend migration: See `migration/04_frontend_migration_example.md`
- Database issues: Review `migration/clean_export.sql`

## Current Status Checklist

- [ ] Database exported from Supabase
- [ ] Railway account created
- [ ] PostgreSQL database provisioned
- [ ] Database imported to Railway
- [ ] Backend deployed to Railway
- [ ] Clerk account created
- [ ] Frontend environment updated
- [ ] First component migrated
- [ ] All components migrated
- [ ] Testing complete
- [ ] DNS updated (if custom domain)