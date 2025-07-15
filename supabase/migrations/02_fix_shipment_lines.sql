-- Fix shipment lines table to include all required columns
-- This migration ensures the call_off_shipment_line table has all fields expected by the frontend
-- Date: 2025-01-15

BEGIN;

-- Create shipment line status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM (
            'PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED'
        );
    END IF;
END $$;

-- Add missing columns to call_off_shipment_line table
DO $$ 
BEGIN
    -- Add delivery_location column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN delivery_location VARCHAR(255);
    END IF;
    
    -- Add requested_delivery_date column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'requested_delivery_date') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN requested_delivery_date DATE;
    END IF;
    
    -- Add notes column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'notes') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN notes TEXT;
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'status') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN status shipment_line_status DEFAULT 'PLANNED';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE call_off_shipment_line 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create/update the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_call_off_shipment_line_updated_at'
    ) THEN
        CREATE TRIGGER update_call_off_shipment_line_updated_at 
        BEFORE UPDATE ON call_off_shipment_line 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipment_line_status 
    ON call_off_shipment_line(status);

CREATE INDEX IF NOT EXISTS idx_shipment_line_delivery_date
    ON call_off_shipment_line(requested_delivery_date, status)
    WHERE requested_delivery_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN call_off_shipment_line.delivery_location IS 'Delivery address or location name';
COMMENT ON COLUMN call_off_shipment_line.requested_delivery_date IS 'Customer requested delivery date';
COMMENT ON COLUMN call_off_shipment_line.notes IS 'Additional delivery instructions or notes';
COMMENT ON COLUMN call_off_shipment_line.status IS 'Current status of the shipment line';

COMMIT;

-- Verify the changes
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_off_shipment_line'
ORDER BY ordinal_position;