# Fix Production Right Now (5 minutes)

## The Problem
Your production Supabase is missing the `counterparty` table and relationships that exist in development.

## The Solution

### Step 1: Open Production SQL Editor
Go to: https://supabase.com/dashboard/project/brixbdbunhwlhuwunqxw/sql

### Step 2: Run This Migration
Copy and paste the contents of:
```
supabase/migrations/20250114120000_sync_production_schema.sql
```

Or use this simplified version:

```sql
BEGIN;

-- Create counterparty table
CREATE TABLE IF NOT EXISTS counterparty (
    counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
    country_code CHAR(2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add sample data
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code)
VALUES 
    ('Glencore International AG', 'GLEN', 'BOTH', 'CH'),
    ('Trafigura Group', 'TRAF', 'BOTH', 'SG'),
    ('Rio Tinto', 'RIO', 'SUPPLIER', 'AU')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE counterparty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON counterparty
    FOR SELECT TO authenticated USING (true);

-- Add foreign keys to existing tables
ALTER TABLE quota ADD COLUMN IF NOT EXISTS counterparty_id UUID REFERENCES counterparty(counterparty_id);
ALTER TABLE call_off ADD COLUMN IF NOT EXISTS counterparty_id UUID REFERENCES counterparty(counterparty_id);

-- Add missing columns to call_off
ALTER TABLE call_off ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE call_off ADD COLUMN IF NOT EXISTS fulfillment_location VARCHAR(255);
ALTER TABLE call_off ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(255);

COMMIT;
```

### Step 3: Click Run

### Step 4: Test
1. Go to: https://supply-chain-app-frontend.vercel.app/
2. Login
3. Click Quotas - should work now!

## Going Forward

Your new workflow will be:
```
develop branch → Dev Supabase → main branch → Prod Supabase
```

No local setup needed - everything happens in the cloud!