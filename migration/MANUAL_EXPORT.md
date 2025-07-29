# Manual Database Export Guide

If the automated script doesn't work, follow these steps:

## Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/pxwtdaqhwzweedflwora
2. Navigate to **Settings** → **Database**
3. Click **Backups** tab
4. Click **Download backup** (if available)

## Option 2: Using TablePlus or pgAdmin

1. **Download TablePlus** (free): https://tableplus.com/
2. **Create new connection**:
   - Host: `db.pxwtdaqhwzweedflwora.supabase.co`
   - Port: `5432`
   - User: `postgres`
   - Password: `tfy3MrsCfcWsP4pP`
   - Database: `postgres`
   - SSL: Required

3. **Export data**:
   - Right-click on `postgres` database
   - Select "Export" → "To SQL Dump"
   - Choose "Structure and Data"
   - Save as `supabase_export.sql`

## Option 3: Using psql Command

First, install PostgreSQL tools:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

Then run:
```bash
# Set password as environment variable
export PGPASSWORD=tfy3MrsCfcWsP4pP

# Export database
pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file=supabase_export.sql
```

## Option 4: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref pxwtdaqhwzweedflwora

# Create backup
supabase db dump -f supabase_export.sql
```

## What to Export

Make sure your export includes these tables:
- `user_profiles`
- `counterparty`
- `counterparty_addresses`
- `quota`
- `call_off`
- `call_off_shipment_line`

And these enums:
- `UserRole`
- `Direction`
- `CallOffStatus`
- `ShipmentLineStatus`
- `AddressType`

## Verify Export

Check that your export file contains:
1. CREATE TYPE statements for enums
2. CREATE TABLE statements
3. INSERT statements with your data
4. File size should be at least a few MB

## Next Steps

Once you have `supabase_export.sql`:
1. Create Railway account
2. Set up PostgreSQL
3. Import using: `psql YOUR_RAILWAY_URL < supabase_export.sql`
4. Continue with backend deployment