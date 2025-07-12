-- Create transport_order table (stub for Drop 1, extended in Drop 2)
-- Migration: 005_create_transport_order_table.sql
-- Created: July 12, 2025

CREATE TABLE transport_order (
  -- Primary key
  transport_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic transport details
  carrier_id UUID,
  booking_reference TEXT UNIQUE,
  mode transport_mode_enum DEFAULT 'ROAD' NOT NULL,
  equipment_type VARCHAR(20),
  gross_weight_t NUMERIC(12,3) CHECK (gross_weight_t > 0),
  
  -- Status and workflow
  status transport_order_status_enum DEFAULT 'NEW' NOT NULL,
  
  -- Audit fields
  created_by UUID NOT NULL, -- References auth.users(id)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE transport_order IS 'Transport orders for shipment execution (Drop 1 stub)';
COMMENT ON COLUMN transport_order.transport_order_id IS 'Unique transport order identifier';
COMMENT ON COLUMN transport_order.carrier_id IS 'Transport service provider';
COMMENT ON COLUMN transport_order.booking_reference IS 'External booking reference (Transporeon, etc.)';
COMMENT ON COLUMN transport_order.mode IS 'Transport mode (ROAD, SEA, RAIL, AIR)';
COMMENT ON COLUMN transport_order.equipment_type IS 'Vehicle/container type description';
COMMENT ON COLUMN transport_order.gross_weight_t IS 'Total weight including packaging';
COMMENT ON COLUMN transport_order.status IS 'Transport order status';
COMMENT ON COLUMN transport_order.created_by IS 'User who created the transport order';
COMMENT ON COLUMN transport_order.created_at IS 'Creation timestamp';
COMMENT ON COLUMN transport_order.updated_at IS 'Last modification timestamp';

-- Create basic indexes
CREATE INDEX idx_transport_order_status ON transport_order (status);
CREATE INDEX idx_transport_order_carrier ON transport_order (carrier_id);
CREATE INDEX idx_transport_order_created_by ON transport_order (created_by, created_at DESC);

-- Add foreign key constraint to shipment lines (now that transport_order exists)
ALTER TABLE call_off_shipment_line 
ADD CONSTRAINT fk_shipment_line_transport_order 
FOREIGN KEY (transport_order_id) REFERENCES transport_order(transport_order_id) ON DELETE SET NULL;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_transport_order_updated_at 
    BEFORE UPDATE ON transport_order 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment about future expansion
COMMENT ON TABLE transport_order IS 
'Transport orders for shipment execution. Drop 1 stub - will be extended in Drop 2 with stops, milestones, and Transporeon integration';