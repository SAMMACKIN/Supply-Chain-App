-- Create triggers for automated business logic
-- Migration: 023_create_triggers.sql
-- Created: July 12, 2025

-- =====================================================================================
-- TIMESTAMP MAINTENANCE TRIGGERS
-- =====================================================================================

-- Ensure the updated_at trigger function exists (may already be created)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that don't already have them
-- (Some may already exist from previous migrations)

-- Call-off updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_off_updated_at') THEN
    CREATE TRIGGER update_call_off_updated_at 
      BEFORE UPDATE ON call_off 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Shipment line updated_at trigger  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_off_shipment_line_updated_at') THEN
    CREATE TRIGGER update_call_off_shipment_line_updated_at 
      BEFORE UPDATE ON call_off_shipment_line 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Transport order updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transport_order_updated_at') THEN
    CREATE TRIGGER update_transport_order_updated_at 
      BEFORE UPDATE ON transport_order 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Inventory lot updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_lot_updated_at') THEN
    CREATE TRIGGER update_inventory_lot_updated_at 
      BEFORE UPDATE ON inventory_lot 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Inventory bundle updated_at trigger  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_bundle_updated_at') THEN
    CREATE TRIGGER update_inventory_bundle_updated_at 
      BEFORE UPDATE ON inventory_bundle 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- User profiles updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
    CREATE TRIGGER update_user_profiles_updated_at 
      BEFORE UPDATE ON user_profiles 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================================================
-- CALL-OFF NUMBER GENERATION TRIGGER
-- =====================================================================================

-- Drop existing trigger and function if they exist to avoid conflicts
DROP TRIGGER IF EXISTS generate_call_off_number_trigger ON call_off;
DROP FUNCTION IF EXISTS generate_call_off_number();

-- Enhanced call-off number generation function
CREATE OR REPLACE FUNCTION generate_call_off_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  formatted_num TEXT;
BEGIN
  -- Extract year from current date
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year with row locking to prevent conflicts
  SELECT COALESCE(MAX(
    CASE 
      WHEN call_off_number ~ ('^CO-' || year_part || '-[0-9]+$')
      THEN CAST(SUBSTRING(call_off_number FROM LENGTH('CO-' || year_part || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM call_off
  FOR UPDATE; -- Lock to prevent concurrent conflicts
  
  -- Format sequence number with leading zeros
  formatted_num := LPAD(sequence_num::TEXT, 4, '0');
  
  -- Return formatted call-off number
  RETURN 'CO-' || year_part || '-' || formatted_num;
END;
$$ LANGUAGE plpgsql;

-- Call-off number generation trigger
CREATE OR REPLACE FUNCTION trigger_generate_call_off_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if call_off_number is NULL or empty
  IF NEW.call_off_number IS NULL OR NEW.call_off_number = '' THEN
    NEW.call_off_number := generate_call_off_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_generate_call_off_number') THEN
    CREATE TRIGGER trg_generate_call_off_number
      BEFORE INSERT ON call_off 
      FOR EACH ROW 
      EXECUTE FUNCTION trigger_generate_call_off_number();
  END IF;
END $$;

-- =====================================================================================
-- BUNDLE QUANTITY VALIDATION TRIGGERS
-- =====================================================================================

-- Function to validate shipment line bundle quantities don't exceed call-off quantity
CREATE OR REPLACE FUNCTION validate_shipment_line_quantities()
RETURNS TRIGGER AS $$
DECLARE
  total_planned INTEGER;
  calloff_total INTEGER;
BEGIN
  -- Get the call-off total bundle quantity
  SELECT bundle_qty INTO calloff_total
  FROM call_off 
  WHERE call_off_id = NEW.call_off_id;
  
  -- Calculate total planned quantities for this call-off (including the current change)
  SELECT COALESCE(SUM(
    CASE 
      WHEN shipment_line_id = NEW.shipment_line_id THEN NEW.bundle_qty
      ELSE bundle_qty
    END
  ), 0)
  INTO total_planned
  FROM call_off_shipment_line 
  WHERE call_off_id = NEW.call_off_id;
  
  -- Check if total planned exceeds call-off quantity
  IF total_planned > calloff_total THEN
    RAISE EXCEPTION 'Total shipment line quantities (%) cannot exceed call-off quantity (%)', 
      total_planned, calloff_total;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shipment line quantity validation
CREATE TRIGGER trg_validate_shipment_line_quantities
  BEFORE INSERT OR UPDATE ON call_off_shipment_line
  FOR EACH ROW 
  EXECUTE FUNCTION validate_shipment_line_quantities();

-- =====================================================================================
-- STATUS TRANSITION VALIDATION TRIGGERS
-- =====================================================================================

-- Function to validate call-off status transitions
CREATE OR REPLACE FUNCTION validate_call_off_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate on updates, not inserts
  IF TG_OP = 'UPDATE' THEN
    -- Validate status transition rules
    CASE OLD.status
      WHEN 'NEW' THEN
        -- NEW can transition to CONFIRMED or CANCELLED
        IF NEW.status NOT IN ('NEW', 'CONFIRMED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid status transition from NEW to %', NEW.status;
        END IF;
        
      WHEN 'CONFIRMED' THEN
        -- CONFIRMED can transition to FULFILLED or CANCELLED
        IF NEW.status NOT IN ('CONFIRMED', 'FULFILLED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid status transition from CONFIRMED to %', NEW.status;
        END IF;
        
      WHEN 'FULFILLED' THEN
        -- FULFILLED is terminal - no transitions allowed
        IF NEW.status != 'FULFILLED' THEN
          RAISE EXCEPTION 'Cannot change status from FULFILLED to %', NEW.status;
        END IF;
        
      WHEN 'CANCELLED' THEN
        -- CANCELLED is terminal - no transitions allowed  
        IF NEW.status != 'CANCELLED' THEN
          RAISE EXCEPTION 'Cannot change status from CANCELLED to %', NEW.status;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for call-off status transition validation
CREATE TRIGGER trg_validate_call_off_status_transition
  BEFORE UPDATE ON call_off
  FOR EACH ROW 
  EXECUTE FUNCTION validate_call_off_status_transition();

-- =====================================================================================
-- INVENTORY STATUS VALIDATION TRIGGERS  
-- =====================================================================================

-- Function to validate inventory bundle status transitions
CREATE OR REPLACE FUNCTION validate_inventory_bundle_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate on updates, not inserts
  IF TG_OP = 'UPDATE' THEN
    -- Validate inventory bundle status transition rules
    CASE OLD.status
      WHEN 'RECEIPTED' THEN
        -- RECEIPTED can transition to ON_HAND
        IF NEW.status NOT IN ('RECEIPTED', 'ON_HAND') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from RECEIPTED to %', NEW.status;
        END IF;
        
      WHEN 'ON_HAND' THEN
        -- ON_HAND can transition to RESERVED or SHIPPED
        IF NEW.status NOT IN ('ON_HAND', 'RESERVED', 'SHIPPED') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from ON_HAND to %', NEW.status;
        END IF;
        
      WHEN 'RESERVED' THEN
        -- RESERVED can transition back to ON_HAND or forward to SHIPPED
        IF NEW.status NOT IN ('RESERVED', 'ON_HAND', 'SHIPPED') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from RESERVED to %', NEW.status;
        END IF;
        
      WHEN 'SHIPPED' THEN
        -- SHIPPED can only transition to DELIVERED
        IF NEW.status NOT IN ('SHIPPED', 'DELIVERED') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from SHIPPED to %', NEW.status;
        END IF;
        
      WHEN 'DELIVERED' THEN
        -- DELIVERED is terminal
        IF NEW.status != 'DELIVERED' THEN
          RAISE EXCEPTION 'Cannot change inventory status from DELIVERED to %', NEW.status;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory bundle status transition validation
CREATE TRIGGER trg_validate_inventory_bundle_status_transition
  BEFORE UPDATE ON inventory_bundle
  FOR EACH ROW 
  EXECUTE FUNCTION validate_inventory_bundle_status_transition();

-- =====================================================================================
-- AUDIT LOG TRIGGERS
-- =====================================================================================

-- Function to log important changes for audit purposes
CREATE OR REPLACE FUNCTION audit_important_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log call-off status changes
  IF TG_TABLE_NAME = 'call_off' AND TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      -- Could insert into an audit log table here
      -- For now, we'll use PostgreSQL's built-in logging
      RAISE NOTICE 'Call-off % status changed from % to % by user %', 
        NEW.call_off_number, OLD.status, NEW.status, NEW.updated_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger for call-off changes
CREATE TRIGGER trg_audit_call_off_changes
  AFTER UPDATE ON call_off
  FOR EACH ROW 
  EXECUTE FUNCTION audit_important_changes();

-- =====================================================================================
-- TRIGGER MONITORING VIEWS
-- =====================================================================================

-- View to monitor trigger execution and performance
CREATE OR REPLACE VIEW v_trigger_monitoring AS
SELECT 
  n.nspname as schemaname,
  c.relname as tablename,
  t.tgname as triggername,
  'TRIGGER' as object_type,
  CASE 
    WHEN t.tgname LIKE '%updated_at%' THEN 'TIMESTAMP_MAINTENANCE'
    WHEN t.tgname LIKE '%generate%' THEN 'AUTO_GENERATION'
    WHEN t.tgname LIKE '%validate%' THEN 'VALIDATION'
    WHEN t.tgname LIKE '%audit%' THEN 'AUDIT_LOGGING'
    ELSE 'OTHER'
  END as trigger_category
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- Add helpful comments
COMMENT ON FUNCTION generate_call_off_number() IS 'Generates sequential call-off numbers in CO-YYYY-NNNN format';
COMMENT ON FUNCTION validate_shipment_line_quantities() IS 'Ensures shipment line quantities do not exceed call-off total';
COMMENT ON FUNCTION validate_call_off_status_transition() IS 'Enforces valid call-off status state machine transitions';
COMMENT ON FUNCTION validate_inventory_bundle_status_transition() IS 'Enforces valid inventory bundle status state machine transitions';
COMMENT ON VIEW v_trigger_monitoring IS 'Monitoring view for all triggers in the public schema';