# Quick Start Guide

Get the Supply Chain App running in 5 minutes!

## Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Git

## Setup Steps

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/SAMMACKIN/Supply-Chain-App.git
cd Supply-Chain-App

# Install frontend dependencies
cd frontend
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. **Option A - Automatic** (if using GitHub Actions):
   - Migrations will run automatically when you deploy
   - Skip to step 3
3. **Option B - Manual** (for local testing):
   - Go to SQL Editor in your Supabase dashboard
   - Run these two SQL files in order:
     - `supabase/migrations/00_complete_schema.sql` (creates all tables)
     - `supabase/migrations/01_initial_data.sql` (adds test data)

### 3. Configure Environment

```bash
# In the frontend directory
cp .env.example .env.local
```

Edit `.env.local` with your Supabase details:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEV_MODE=false
```

### 4. Deploy Edge Functions

In Supabase dashboard:
1. Go to Edge Functions
2. Create new function named `calloff-crud`
3. Copy contents of `supabase/functions/calloff-crud/index.ts`
4. Deploy

### 5. Run the App

```bash
npm run dev
```

Visit http://localhost:5173

## Default Login

Create a user in Supabase Auth or use the dev mode:
- Set `VITE_DEV_MODE=true` in `.env.local`
- Any email/password will work

## Features

- **Quotas**: View metal quotas by period
- **Call-offs**: Create orders against quotas  
- **Shipments**: Split call-offs into deliveries
- **Multi-tenant**: Business unit isolation

## Troubleshooting

**Quotas not loading?**
- Check Edge Function logs in Supabase dashboard
- Verify `calloff-crud` function is deployed

**Can't create shipment lines?**
- Run the test script in `test-shipment-fix.sql`
- Ensures all required columns exist

**Login issues?**
- Enable email confirmations in Supabase Auth settings
- Or use dev mode for testing

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md)
- Check [Deployment Guide](./DEPLOYMENT.md) for production setup
- Join discussions in [Issues](https://github.com/SAMMACKIN/Supply-Chain-App/issues)