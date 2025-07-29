# Migration Next Steps

## Current Status
✅ Backend structure created
✅ Prisma schema defined
✅ Express API routes implemented
✅ Middleware configured

## Immediate Next Steps

### 1. Export Supabase Database
```bash
# Run from migration directory
pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --password \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file=supabase_export.sql
```

### 2. Set Up Railway/Render
1. Create account at railway.app or render.com
2. Create new PostgreSQL database
3. Note the connection string

### 3. Initialize Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL
```

### 4. Set Up Clerk Authentication
1. Go to clerk.com and create account
2. Create new application
3. Get your API keys
4. Add to .env file

### 5. Import Database
```bash
# Import to new database
psql YOUR_DATABASE_URL < supabase_export.sql

# Generate Prisma client
npm run db:generate

# Push schema to ensure sync
npm run db:push
```

### 6. Test Backend
```bash
# Start development server
npm run dev

# Test endpoints
curl http://localhost:3001/health
```

## Frontend Migration Steps

### 1. Create API Client Service
Replace Supabase client with fetch-based API client

### 2. Update Authentication
Replace Supabase Auth with Clerk components

### 3. Update Data Fetching
Replace all supabase.from() calls with API calls

### 4. Update Environment Variables
Point frontend to new backend URL

## Deployment Steps

### Railway Deployment
1. Connect GitHub repo
2. Add backend service
3. Set environment variables
4. Deploy

### Frontend Deployment
1. Update Vercel environment variables
2. Point to new backend URL
3. Deploy

## Data Migration Checklist
- [ ] Export all tables
- [ ] Export all data
- [ ] Verify row counts
- [ ] Test data integrity
- [ ] Set up backups

## Testing Checklist
- [ ] Authentication flow
- [ ] List quotas
- [ ] Create call-off
- [ ] Update call-off
- [ ] Add shipment lines
- [ ] Workflow actions (confirm/cancel)

## Rollback Plan
- Keep Supabase instance running
- Maintain data sync during testing
- Can switch back via environment variables