-- Create business rule constraints for data integrity
-- Migration: 022_create_business_constraints.sql
-- Created: July 12, 2025

-- =====================================================================================
-- CALL-OFF BUSINESS RULE CONSTRAINTS
-- =====================================================================================

-- Call-off number pattern validation (CO-YYYY-NNNN)
ALTER TABLE call_off ADD CONSTRAINT chk_calloff_number_pattern
CHECK (call_off_number IS NULL OR call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$');

-- Bundle quantity must be positive and reasonable
ALTER TABLE call_off ADD CONSTRAINT chk_calloff_bundle_qty_range
CHECK (bundle_qty > 0 AND bundle_qty <= 10000);

-- Delivery date should be reasonable (not too far in past, allow some flexibility)
ALTER TABLE call_off ADD CONSTRAINT chk_calloff_delivery_reasonable
CHECK (requested_delivery_date IS NULL OR requested_delivery_date >= '2020-01-01');

-- Direction must match parent quota direction (will be validated via trigger)
-- Creating a function to validate direction consistency
CREATE OR REPLACE FUNCTION validate_calloff_direction()
RETURNS TRIGGER AS $$
BEGIN
  -- Check that call-off direction matches quota direction
  IF EXISTS (
    SELECT 1 FROM quota q 
    WHERE q.quota_id = NEW.quota_id 
    AND q.direction != NEW.direction
  ) THEN
    RAISE EXCEPTION 'Call-off direction (%) must match quota direction', NEW.direction;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate direction consistency
CREATE TRIGGER trg_validate_calloff_direction
  BEFORE INSERT OR UPDATE ON call_off
  FOR EACH ROW EXECUTE FUNCTION validate_calloff_direction();

-- =====================================================================================
-- SHIPMENT LINE BUSINESS RULE CONSTRAINTS
-- =====================================================================================

-- Bundle quantity must be positive and reasonable
ALTER TABLE call_off_shipment_line ADD CONSTRAINT chk_shipment_line_bundle_qty_range
CHECK (bundle_qty > 0 AND bundle_qty <= 10000);

-- Expected ship date should be reasonable (not too far in past)
ALTER TABLE call_off_shipment_line ADD CONSTRAINT chk_shipment_line_ship_date_reasonable
CHECK (expected_ship_date IS NULL OR expected_ship_date >= '2020-01-01');

-- Metal code must match parent call-off (via quota)
CREATE OR REPLACE FUNCTION validate_shipment_line_metal()
RETURNS TRIGGER AS $$
BEGIN
  -- Check that shipment line metal code matches call-off quota metal code
  IF EXISTS (
    SELECT 1 FROM call_off co
    JOIN quota q ON co.quota_id = q.quota_id
    WHERE co.call_off_id = NEW.call_off_id 
    AND q.metal_code != NEW.metal_code
  ) THEN
    RAISE EXCEPTION 'Shipment line metal code (%) must match quota metal code', NEW.metal_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate metal code consistency
CREATE TRIGGER trg_validate_shipment_line_metal
  BEFORE INSERT OR UPDATE ON call_off_shipment_line
  FOR EACH ROW EXECUTE FUNCTION validate_shipment_line_metal();

-- =====================================================================================
-- QUOTA BUSINESS RULE CONSTRAINTS  
-- =====================================================================================

-- Period month must be first day of month
ALTER TABLE quota ADD CONSTRAINT chk_quota_period_first_day
CHECK (EXTRACT(day FROM period_month) = 1);

-- Quantity must be positive
ALTER TABLE quota ADD CONSTRAINT chk_quota_qty_positive
CHECK (qty_t > 0);

-- Tolerance percentage must be reasonable (0-50%)
ALTER TABLE quota ADD CONSTRAINT chk_quota_tolerance_range
CHECK (tolerance_pct IS NULL OR (tolerance_pct >= 0 AND tolerance_pct <= 50.0));

-- Metal code format validation (2-12 characters, uppercase)
ALTER TABLE quota ADD CONSTRAINT chk_quota_metal_code_format
CHECK (metal_code ~ '^[A-Z0-9]{2,12}$');

-- Incoterm code format validation if provided (3 characters, uppercase)
ALTER TABLE quota ADD CONSTRAINT chk_quota_incoterm_format
CHECK (incoterm_code IS NULL OR incoterm_code ~ '^[A-Z]{3}$');

-- Period month should be within reasonable range (2020-2030) - using different name to avoid conflicts
ALTER TABLE quota ADD CONSTRAINT chk_quota_period_range_business
CHECK (period_month >= '2020-01-01' AND period_month <= '2030-12-01');

-- =====================================================================================
-- INVENTORY LOT BUSINESS RULE CONSTRAINTS
-- =====================================================================================

-- Purity percentage must be within realistic range (80-99.99%)
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_purity_realistic_range
CHECK (purity_pct BETWEEN 80.00 AND 99.99);

-- Manufacturing date reasonable range (not too old, not too far future) - using different name
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_manufactured_date_range_business
CHECK (manufactured_on BETWEEN '2020-01-01' AND '2030-12-31');

-- Metal code format validation (consistent with quota table)
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_metal_code_format
CHECK (metal_code ~ '^[A-Z0-9]{2,12}$');

-- Certificate URL format validation if provided
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_certificate_url_format
CHECK (certificate_url IS NULL OR certificate_url ~ '^https?://');

-- =====================================================================================
-- INVENTORY BUNDLE BUSINESS RULE CONSTRAINTS
-- =====================================================================================

-- Weight must be within tolerance (±5% of 1000kg = 950-1050kg)
ALTER TABLE inventory_bundle ADD CONSTRAINT chk_bundle_weight_tolerance_strict
CHECK (weight_kg BETWEEN 950.000 AND 1050.000);

-- Bin location format validation if provided (alphanumeric + hyphens, max 50 chars)
ALTER TABLE inventory_bundle ADD CONSTRAINT chk_bundle_bin_location_format
CHECK (bin_location IS NULL OR (
  length(bin_location) BETWEEN 1 AND 50 
  AND bin_location ~ '^[A-Z0-9\-]+$'
));

-- =====================================================================================
-- TRANSPORT ORDER BUSINESS RULE CONSTRAINTS
-- =====================================================================================

-- Gross weight must be positive if specified
ALTER TABLE transport_order ADD CONSTRAINT chk_transport_gross_weight_positive
CHECK (gross_weight_t IS NULL OR gross_weight_t > 0);

-- Equipment type format validation if provided
ALTER TABLE transport_order ADD CONSTRAINT chk_transport_equipment_format
CHECK (equipment_type IS NULL OR (
  length(equipment_type) BETWEEN 3 AND 20
  AND equipment_type ~ '^[A-Z0-9\-\s]+$'
));

-- Booking reference format validation if provided
ALTER TABLE transport_order ADD CONSTRAINT chk_transport_booking_format
CHECK (booking_reference IS NULL OR (
  length(booking_reference) BETWEEN 3 AND 50
  AND booking_reference ~ '^[A-Z0-9\-]+$'
));

-- =====================================================================================
-- USER PROFILES BUSINESS RULE CONSTRAINTS
-- =====================================================================================

-- Warehouse IDs array should not be empty if provided
ALTER TABLE user_profiles ADD CONSTRAINT chk_user_profiles_warehouse_ids_not_empty
CHECK (warehouse_ids IS NULL OR array_length(warehouse_ids, 1) > 0);

-- =====================================================================================
-- BUSINESS UNITS CONSTRAINTS
-- =====================================================================================

-- Business unit code format (2-10 characters, uppercase)
ALTER TABLE business_units ADD CONSTRAINT chk_business_unit_code_format
CHECK (code ~ '^[A-Z0-9]{2,10}$');

-- Business unit name should be meaningful length
ALTER TABLE business_units ADD CONSTRAINT chk_business_unit_name_length
CHECK (length(name) BETWEEN 3 AND 100);

-- Region format if provided
ALTER TABLE business_units ADD CONSTRAINT chk_business_unit_region_format
CHECK (region IS NULL OR (
  length(region) BETWEEN 2 AND 20
  AND region ~ '^[A-Za-z\s]+$'
));

-- =====================================================================================
-- CONSTRAINT VALIDATION FUNCTION
-- =====================================================================================

-- Function to validate business rule consistency across tables
CREATE OR REPLACE FUNCTION validate_business_rules()
RETURNS TABLE(
  table_name TEXT,
  constraint_name TEXT,
  validation_status TEXT,
  error_count INTEGER
) AS $$
BEGIN
  -- This function can be used to validate all business rule constraints
  -- Return validation status for monitoring
  
  RETURN QUERY
  SELECT 
    'call_off'::TEXT as table_name,
    'bundle_qty_sum_validation'::TEXT as constraint_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM call_off co
        LEFT JOIN call_off_shipment_line csl ON co.call_off_id = csl.call_off_id
        GROUP BY co.call_off_id, co.bundle_qty
        HAVING co.bundle_qty < COALESCE(SUM(csl.bundle_qty), 0)
      ) 
      THEN 'VIOLATION'::TEXT 
      ELSE 'VALID'::TEXT 
    END as validation_status,
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM call_off co
      LEFT JOIN call_off_shipment_line csl ON co.call_off_id = csl.call_off_id
      GROUP BY co.call_off_id, co.bundle_qty
      HAVING co.bundle_qty < COALESCE(SUM(csl.bundle_qty), 0)
    ), 0) as error_count;
END;
$$ LANGUAGE plpgsql;

-- Add helpful constraint comments
COMMENT ON CONSTRAINT chk_calloff_number_pattern ON call_off IS 'Ensures call-off numbers follow CO-YYYY-NNNN pattern';
COMMENT ON CONSTRAINT chk_bundle_weight_tolerance_strict ON inventory_bundle IS 'Enforces ±5% weight tolerance around 1000kg standard';
COMMENT ON CONSTRAINT chk_quota_period_first_day ON quota IS 'Ensures period_month is always first day of month for consistency';
COMMENT ON FUNCTION validate_business_rules() IS 'Validates complex business rules across multiple tables';