-- Manual migration to enhance shipment lines
-- Run this in Supabase SQL Editor if migration push fails

-- First check if the columns already exist
DO $$ 
BEGIN
    -- Check and add delivery_location column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_off_shipment_line' 
        AND column_name = 'delivery_location'
    ) THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN delivery_location VARCHAR(100);
        
        COMMENT ON COLUMN call_off_shipment_line.delivery_location IS 'Warehouse or customer delivery location';
    END IF;

    -- Check and add requested_delivery_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_off_shipment_line' 
        AND column_name = 'requested_delivery_date'
    ) THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN requested_delivery_date DATE;
        
        COMMENT ON COLUMN call_off_shipment_line.requested_delivery_date IS 'Customer requested delivery date';
    END IF;

    -- Check and add notes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_off_shipment_line' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN notes TEXT;
        
        COMMENT ON COLUMN call_off_shipment_line.notes IS 'Additional delivery instructions or requirements';
    END IF;
END $$;

-- Create status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM (
            'PLANNED',
            'READY',
            'PICKED',
            'SHIPPED',
            'DELIVERED'
        );
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_off_shipment_line' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN status shipment_line_status DEFAULT 'PLANNED';
        
        COMMENT ON COLUMN call_off_shipment_line.status IS 'Current status of the shipment line';
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_requested_delivery_date_future'
    ) THEN
        ALTER TABLE call_off_shipment_line 
        ADD CONSTRAINT chk_requested_delivery_date_future
        CHECK (requested_delivery_date IS NULL OR requested_delivery_date >= CURRENT_DATE);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_shipment_line_status 
ON call_off_shipment_line(status)
WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_line_delivery_date
ON call_off_shipment_line(requested_delivery_date, status)
WHERE requested_delivery_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_line_call_off_status 
ON call_off_shipment_line(call_off_id, status);

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'call_off_shipment_line'
ORDER BY ordinal_position;