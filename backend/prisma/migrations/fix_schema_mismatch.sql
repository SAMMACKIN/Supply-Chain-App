-- Fix schema mismatches after Supabase migration

-- 1. Fix quota table - rename period_month to month if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quota' AND column_name = 'period_month'
    ) THEN
        ALTER TABLE quota RENAME COLUMN period_month TO month;
    END IF;
END $$;

-- 2. Add missing delivery_address_id to call_off if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_off' AND column_name = 'delivery_address_id'
    ) THEN
        ALTER TABLE call_off ADD COLUMN delivery_address_id UUID;
    END IF;
END $$;

-- 3. Ensure all required columns exist in quota table
DO $$
BEGIN
    -- Add month column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quota' AND column_name = 'month'
    ) THEN
        ALTER TABLE quota ADD COLUMN month DATE;
        -- If we have period_month data, copy it
        UPDATE quota SET month = period_month::DATE WHERE period_month IS NOT NULL;
    END IF;
    
    -- Add other potentially missing columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quota' AND column_name = 'business_unit'
    ) THEN
        ALTER TABLE quota ADD COLUMN business_unit VARCHAR(255) DEFAULT 'DEFAULT';
    END IF;
END $$;

-- 4. Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_quota_month ON quota(month);
CREATE INDEX IF NOT EXISTS idx_quota_direction_month ON quota(direction, month);

-- 5. Show current schema for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('quota', 'call_off', 'counterparty')
ORDER BY table_name, ordinal_position;