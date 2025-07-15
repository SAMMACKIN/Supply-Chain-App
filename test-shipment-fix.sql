-- Test script to check and fix shipment line table structure
-- Run this in your development Supabase SQL editor

-- 1. Check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'call_off_shipment_line'
) as table_exists;

-- 2. Check what columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_off_shipment_line'
ORDER BY ordinal_position;

-- 3. Check if shipment_line_status type exists
SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status'
) as status_enum_exists;

-- 4. Quick fix - add missing columns if needed
DO $$ 
BEGIN
    -- Create status enum if missing
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM (
            'PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED'
        );
    END IF;
    
    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN delivery_location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'requested_delivery_date') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN requested_delivery_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'notes') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'status') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN status shipment_line_status DEFAULT 'PLANNED';
    END IF;
END $$;

-- 5. Verify the fix
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'call_off_shipment_line'
ORDER BY ordinal_position;