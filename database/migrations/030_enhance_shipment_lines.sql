-- Enhance shipment lines with delivery details and status tracking
-- Migration: 005_enhance_shipment_lines.sql
-- Created: July 13, 2025

-- Create status enum for shipment line status tracking
CREATE TYPE shipment_line_status AS ENUM (
  'PLANNED',
  'READY',
  'PICKED',
  'SHIPPED',
  'DELIVERED'
);

-- Add new columns to existing shipment line table
ALTER TABLE call_off_shipment_line 
ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS status shipment_line_status DEFAULT 'PLANNED';

-- Add comments for new columns
COMMENT ON COLUMN call_off_shipment_line.delivery_location IS 'Warehouse or customer delivery location';
COMMENT ON COLUMN call_off_shipment_line.requested_delivery_date IS 'Customer requested delivery date';
COMMENT ON COLUMN call_off_shipment_line.notes IS 'Additional delivery instructions or requirements';
COMMENT ON COLUMN call_off_shipment_line.status IS 'Current status of the shipment line';

-- Add constraint to ensure requested delivery date is not in the past
ALTER TABLE call_off_shipment_line 
ADD CONSTRAINT chk_requested_delivery_date_future
CHECK (requested_delivery_date IS NULL OR requested_delivery_date >= CURRENT_DATE);

-- Create index for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_shipment_line_status 
ON call_off_shipment_line(status)
WHERE status IS NOT NULL;

-- Create index for delivery date queries
CREATE INDEX IF NOT EXISTS idx_shipment_line_delivery_date
ON call_off_shipment_line(requested_delivery_date, status)
WHERE requested_delivery_date IS NOT NULL;

-- Create compound index for call-off and status queries
CREATE INDEX IF NOT EXISTS idx_shipment_line_call_off_status 
ON call_off_shipment_line(call_off_id, status);