-- Step 3: Update call_off_shipment_line table

-- Create shipment line status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED');
    END IF;
END $$;

-- Add delivery details columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN delivery_location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'requested_delivery_date') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN requested_delivery_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'delivery_notes') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN delivery_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off_shipment_line' AND column_name = 'status') THEN
        ALTER TABLE call_off_shipment_line ADD COLUMN status shipment_line_status DEFAULT 'PLANNED';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_off_shipment_line' 
AND column_name IN ('delivery_location', 'requested_delivery_date', 'delivery_notes', 'status');