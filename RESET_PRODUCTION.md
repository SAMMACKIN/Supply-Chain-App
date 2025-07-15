# Reset Production to Match Preview

## ⚠️ WARNING
This will completely reset your production database. All data will be lost!

## Steps to Reset Production

### 1. Backup Current Data (Optional)
If you want to save any data:
```sql
-- In production SQL editor, export specific data
SELECT * FROM call_off WHERE status = 'CONFIRMED';
```

### 2. Drop Everything in Production
Run this in your **PRODUCTION** Supabase SQL Editor:

```sql
-- Drop all views first
DROP VIEW IF EXISTS v_call_off_summary CASCADE;
DROP VIEW IF EXISTS v_quota_balance CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS inventory_bundle CASCADE;
DROP TABLE IF EXISTS inventory_lot CASCADE;
DROP TABLE IF EXISTS call_off_shipment_line CASCADE;
DROP TABLE IF EXISTS transport_order CASCADE;
DROP TABLE IF EXISTS call_off CASCADE;
DROP TABLE IF EXISTS quota CASCADE;
DROP TABLE IF EXISTS counterparty CASCADE;
DROP TABLE IF EXISTS business_units CASCADE;

-- Drop all types
DROP TYPE IF EXISTS shipment_line_status CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS milestone_event_enum CASCADE;
DROP TYPE IF EXISTS transport_mode_enum CASCADE;
DROP TYPE IF EXISTS inventory_bundle_status_enum CASCADE;
DROP TYPE IF EXISTS inventory_lot_status_enum CASCADE;
DROP TYPE IF EXISTS transport_order_status_enum CASCADE;
DROP TYPE IF EXISTS call_off_status_enum CASCADE;
DROP TYPE IF EXISTS direction_enum CASCADE;

-- Verify everything is gone
SELECT COUNT(*) as remaining_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

### 3. Create Fresh Schema
Run these files in order in your **PRODUCTION** SQL Editor:

1. First, run `supabase/migrations/00_complete_schema.sql`
2. Then, run `supabase/migrations/01_initial_data.sql`

### 4. Deploy Latest Edge Functions
Push to main branch to deploy the Edge Functions:
```bash
git add .
git commit -m "Reset production database to match preview"
git push origin main
```

### 5. Verify Everything Works
1. Check that quotas load in production
2. Test creating a call-off
3. Test adding shipment lines

## What This Gives You

- **Clean schema** matching preview exactly
- **Test data** (10 counterparties, 15 quotas)
- **All features** including enhanced shipment lines
- **No migration history issues**

## Going Forward

From now on:
1. Always test in preview first
2. Only create NEW migration files (never modify existing ones)
3. Number them sequentially: `02_feature.sql`, `03_fix.sql`, etc.
4. Deploy: preview (develop branch) → production (main branch)