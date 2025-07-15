-- Fix Production Database Sync
-- This migration ensures all tables exist with proper structure
-- It's idempotent - safe to run multiple times

-- 1. Create user_profiles if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  business_unit_id UUID NOT NULL,
  role user_role_enum NOT NULL,
  warehouse_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Ensure counterparty table exists
CREATE TABLE IF NOT EXISTS counterparty (
  counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Add counterparty_id to quota if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quota' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE quota ADD COLUMN counterparty_id UUID;
  END IF;
END $$;

-- 4. Add counterparty_id to call_off if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_off' AND column_name = 'counterparty_id'
  ) THEN
    ALTER TABLE call_off ADD COLUMN counterparty_id UUID;
  END IF;
END $$;

-- 5. Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quota_counterparty_id_fkey'
  ) THEN
    ALTER TABLE quota 
    ADD CONSTRAINT quota_counterparty_id_fkey 
    FOREIGN KEY (counterparty_id) REFERENCES counterparty(counterparty_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'call_off_counterparty_id_fkey'
  ) THEN
    ALTER TABLE call_off 
    ADD CONSTRAINT call_off_counterparty_id_fkey 
    FOREIGN KEY (counterparty_id) REFERENCES counterparty(counterparty_id);
  END IF;
END $$;

-- 6. Add missing columns to call_off
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_off' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE call_off ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_off' AND column_name = 'fulfillment_location'
  ) THEN
    ALTER TABLE call_off ADD COLUMN fulfillment_location VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_off' AND column_name = 'delivery_location'
  ) THEN
    ALTER TABLE call_off ADD COLUMN delivery_location VARCHAR(255);
  END IF;
END $$;

-- 7. Mark old migrations as already applied to avoid conflicts
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT 
  version,
  name,
  ARRAY['-- Already applied in production']::text[]
FROM (VALUES
  ('011', '011_create_user_profiles'),
  ('029', '029_create_counterparty_table'),
  ('01', '01_create_counterparty'),
  ('02', '02_update_calloff_table'),
  ('03', '03_update_shipment_lines'),
  ('04', '04_create_user_profiles')
) AS t(version, name)
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations 
  WHERE schema_migrations.version = t.version
);

-- 8. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Add updated_at triggers where missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'set_updated_at' AND event_object_table = 'call_off'
  ) THEN
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON call_off
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;