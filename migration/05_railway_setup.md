# Railway Setup Guide

## 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended)
3. Verify your email

## 2. Create New Project
1. Click "New Project"
2. Select "Deploy PostgreSQL"
3. Wait for provisioning

## 3. Get Database Credentials
1. Click on the PostgreSQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL`

Example format:
```
postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

## 4. Set Up Backend Service
1. In the same project, click "New"
2. Select "GitHub Repo" 
3. Choose your Supply Chain repo
4. Configure:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`

## 5. Environment Variables
Add these to your Railway backend service:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=<your-railway-postgres-url>
FRONTEND_URL=https://your-app.vercel.app
CLERK_SECRET_KEY=<from-clerk-dashboard>
CLERK_PUBLISHABLE_KEY=<from-clerk-dashboard>
```

## 6. Import Database

### Option A: Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Import database
railway run psql $DATABASE_URL < migration/exports/supabase_full_export.sql
```

### Option B: Using psql directly
```bash
# First, clean the export
psql <railway-database-url> < migration/clean_export.sql

# Then import your data
psql <railway-database-url> < migration/exports/supabase_full_export.sql
```

## 7. Run Prisma Migrations
```bash
# From backend directory
cd backend

# Generate Prisma client
npm run db:generate

# Push schema (for initial setup)
npm run db:push

# Or create migration
npm run db:migrate
```

## 8. Deploy Backend
Railway will automatically deploy when you push to GitHub.

Manual deploy:
```bash
railway up
```

## 9. Update Frontend
Update your frontend `.env`:
```
VITE_API_URL=https://your-backend.up.railway.app/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## 10. Test Endpoints
```bash
# Health check
curl https://your-backend.up.railway.app/health

# Get quotas (need auth token)
curl https://your-backend.up.railway.app/api/quotas \
  -H "Authorization: Bearer <clerk-token>"
```

## Alternative: Render.com

If you prefer Render:

1. **Create PostgreSQL**
   - New > PostgreSQL
   - Choose region
   - Copy connection string

2. **Create Web Service**
   - New > Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm start`

3. **Environment Variables**
   Same as Railway, but use Render's dashboard

4. **Database Import**
   Use the External Connection String from Render

## Troubleshooting

### Database connection issues
- Ensure SSL is enabled: add `?sslmode=require` to connection string
- Check firewall rules if using external tools

### Build failures
- Ensure all dependencies are in `package.json` (not devDependencies)
- Check Node.js version compatibility

### Migration issues
- Run `npm run db:push` first to sync schema
- Then run proper migrations

## Next Steps
1. ✅ Database imported and verified
2. ✅ Backend deployed and running
3. 🔄 Set up Clerk authentication
4. 🔄 Update frontend to use new API
5. 🔄 Test all functionality