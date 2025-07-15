-- Complete Schema for Supply Chain Application
-- Generated from migration files analysis
-- This file represents the complete schema as it should exist in preview/production
-- Including all enhancements and proper dependency order

-- =====================================================================================
-- 1. ENUM TYPES (Must be created first)
-- =====================================================================================

-- Direction enum for trade direction
CREATE TYPE direction_enum AS ENUM ('BUY', 'SELL');

-- Call-off status enum for workflow state machine
CREATE TYPE call_off_status_enum AS ENUM (
  'NEW',
  'CONFIRMED', 
  'FULFILLED',
  'CANCELLED'
);

-- Transport order status enum
CREATE TYPE transport_order_status_enum AS ENUM (
  'NEW',
  'BOOKED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED'
);

-- Inventory lot status enum
CREATE TYPE inventory_lot_status_enum AS ENUM (
  'INBOUND',
  'ON_HAND',
  'CLOSED'
);

-- Inventory bundle status enum
CREATE TYPE inventory_bundle_status_enum AS ENUM (
  'RECEIPTED',
  'ON_HAND',
  'RESERVED',
  'PICKED',
  'SHIPPED',
  'DELIVERED'
);

-- Transport mode enum
CREATE TYPE transport_mode_enum AS ENUM (
  'ROAD',
  'SEA', 
  'RAIL',
  'AIR'
);

-- Milestone event codes enum
CREATE TYPE milestone_event_enum AS ENUM (
  'DEP',  -- Departure
  'ARR',  -- Arrival
  'POD',  -- Proof of Delivery
  'EXC'   -- Exception
);

-- User role enum
CREATE TYPE user_role_enum AS ENUM (
  'OPS',
  'TRADE',
  'PLANNER',
  'ADMIN'
);

-- Shipment line status enum
CREATE TYPE shipment_line_status AS ENUM (
  'PLANNED',
  'READY',
  'PICKED',
  'SHIPPED',
  'DELIVERED'
);

-- Add comments on ENUMs
COMMENT ON TYPE direction_enum IS 'Trade direction: BUY (inbound) or SELL (outbound)';
COMMENT ON TYPE call_off_status_enum IS 'Call-off workflow states from creation to completion';
COMMENT ON TYPE transport_order_status_enum IS 'Transport order lifecycle states';
COMMENT ON TYPE inventory_lot_status_enum IS 'Lot-level inventory status (25t units)';
COMMENT ON TYPE inventory_bundle_status_enum IS 'Bundle-level inventory status (1t units)';
COMMENT ON TYPE transport_mode_enum IS 'Transportation mode for shipments';
COMMENT ON TYPE milestone_event_enum IS 'Transport milestone event types';
COMMENT ON TYPE user_role_enum IS 'User access roles for business operations';

-- =====================================================================================
-- 2. UTILITY FUNCTIONS
-- =====================================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 3. CORE TABLES
-- =====================================================================================

-- Business units table (referenced by quota)
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  region VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add business unit constraints
ALTER TABLE business_units ADD CONSTRAINT chk_business_unit_code_format
CHECK (code ~ '^[A-Z0-9]{2,10}$');

ALTER TABLE business_units ADD CONSTRAINT chk_business_unit_name_length
CHECK (length(name) BETWEEN 3 AND 100);

ALTER TABLE business_units ADD CONSTRAINT chk_business_unit_region_format
CHECK (region IS NULL OR (length(region) BETWEEN 2 AND 20 AND region ~ '^[A-Z][A-Za-z\s-]+$'));

-- Counterparty table
CREATE TABLE counterparty (
    counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
    country_code CHAR(2) NOT NULL,
    tax_id VARCHAR(50),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    payment_terms_days INTEGER,
    credit_limit NUMERIC(15,2),
    preferred_currency CHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Quota table with business_unit_id
CREATE TABLE quota (
  -- Primary key - matches Titan quota ID
  quota_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Trading partner identification
  counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id) ON DELETE RESTRICT,
  
  -- Trade characteristics
  direction direction_enum NOT NULL,
  period_month DATE NOT NULL CHECK (EXTRACT(day FROM period_month) = 1), -- Force YYYY-MM-01 format
  qty_t NUMERIC(12,3) NOT NULL CHECK (qty_t > 0),
  tolerance_pct NUMERIC(4,2) DEFAULT 5.00 CHECK (tolerance_pct >= 0 AND tolerance_pct <= 100),
  
  -- Commercial terms
  incoterm_code CHAR(3) NOT NULL, -- FOB, CIF, EXW, etc.
  metal_code VARCHAR(12) NOT NULL,
  
  -- Business unit for multi-tenant isolation
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments for quota
COMMENT ON TABLE quota IS 'Quota definitions imported from Titan via CDC';
COMMENT ON COLUMN quota.quota_id IS 'Primary key matching Titan quota identifier';
COMMENT ON COLUMN quota.counterparty_id IS 'Trading partner/customer UUID';
COMMENT ON COLUMN quota.direction IS 'BUY (purchase) or SELL (sales) quota';
COMMENT ON COLUMN quota.period_month IS 'Monthly bucket (first day of month)';
COMMENT ON COLUMN quota.qty_t IS 'Contract quantity in metric tonnes';
COMMENT ON COLUMN quota.tolerance_pct IS 'Allowed over/under percentage (0-100)';
COMMENT ON COLUMN quota.incoterm_code IS 'International commercial terms (FOB, CIF, etc.)';
COMMENT ON COLUMN quota.metal_code IS 'Metal type code (CU, AL, NI, ZN, etc.)';
COMMENT ON COLUMN quota.business_unit_id IS 'Business unit for multi-tenant isolation';
COMMENT ON COLUMN quota.created_at IS 'Record creation timestamp';

-- Call-off table with updated_at field
CREATE TABLE call_off (
  -- Primary key
  call_off_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  quota_id UUID NOT NULL REFERENCES quota(quota_id) ON DELETE RESTRICT,
  
  -- Business identifiers
  call_off_number TEXT UNIQUE NOT NULL,
  
  -- Workflow and business data
  status call_off_status_enum DEFAULT 'NEW' NOT NULL,
  bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
  requested_delivery_date DATE CHECK (requested_delivery_date >= CURRENT_DATE),
  
  -- Derived fields from quota (for performance)
  counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id),
  direction direction_enum NOT NULL,
  incoterm_code CHAR(3),
  
  -- Location fields
  fulfillment_location VARCHAR(255),
  delivery_location VARCHAR(255),
  
  -- Audit and workflow timestamps
  created_by UUID NOT NULL, -- References auth.users(id)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);

-- Add table and column comments for call_off
COMMENT ON TABLE call_off IS 'Call-off orders against quotas with workflow state management';
COMMENT ON COLUMN call_off.call_off_id IS 'Unique call-off identifier';
COMMENT ON COLUMN call_off.quota_id IS 'Parent quota reference';
COMMENT ON COLUMN call_off.call_off_number IS 'Human-readable identifier (CO-YYYY-NNNN)';
COMMENT ON COLUMN call_off.status IS 'Workflow state (NEW → CONFIRMED → FULFILLED/CANCELLED)';
COMMENT ON COLUMN call_off.bundle_qty IS 'Quantity in 1-tonne bundles';
COMMENT ON COLUMN call_off.requested_delivery_date IS 'Customer requested delivery date';
COMMENT ON COLUMN call_off.counterparty_id IS 'Cached from quota for performance';
COMMENT ON COLUMN call_off.direction IS 'Cached from quota for performance';
COMMENT ON COLUMN call_off.incoterm_code IS 'Cached from quota for performance';
COMMENT ON COLUMN call_off.fulfillment_location IS 'Source location for fulfillment';
COMMENT ON COLUMN call_off.delivery_location IS 'Destination delivery location';
COMMENT ON COLUMN call_off.created_by IS 'User who created the call-off';
COMMENT ON COLUMN call_off.created_at IS 'Call-off creation timestamp';
COMMENT ON COLUMN call_off.updated_at IS 'Last modification timestamp, automatically updated by trigger';
COMMENT ON COLUMN call_off.confirmed_at IS 'When call-off was confirmed';
COMMENT ON COLUMN call_off.cancelled_at IS 'When call-off was cancelled';
COMMENT ON COLUMN call_off.fulfilled_at IS 'When call-off was fulfilled';

-- Add constraints for call-off
ALTER TABLE call_off ADD CONSTRAINT chk_call_off_number_pattern
CHECK (call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$');

ALTER TABLE call_off ADD CONSTRAINT chk_confirmed_after_created
CHECK (confirmed_at IS NULL OR confirmed_at >= created_at);

ALTER TABLE call_off ADD CONSTRAINT chk_cancelled_after_created
CHECK (cancelled_at IS NULL OR cancelled_at >= created_at);

ALTER TABLE call_off ADD CONSTRAINT chk_fulfilled_after_confirmed
CHECK (fulfilled_at IS NULL OR (confirmed_at IS NOT NULL AND fulfilled_at >= confirmed_at));

ALTER TABLE call_off ADD CONSTRAINT chk_single_completion
CHECK (
  (cancelled_at IS NULL AND fulfilled_at IS NULL) OR
  (cancelled_at IS NOT NULL AND fulfilled_at IS NULL) OR
  (cancelled_at IS NULL AND fulfilled_at IS NOT NULL)
);

-- Transport order table
CREATE TABLE transport_order (
  -- Primary key
  transport_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business identifiers
  order_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Basic transport details
  carrier_id UUID,
  carrier_name VARCHAR(255) NOT NULL,
  carrier_ref VARCHAR(100),
  booking_reference TEXT UNIQUE,
  booking_ref VARCHAR(100),
  mode transport_mode_enum DEFAULT 'ROAD' NOT NULL,
  transport_mode transport_mode_enum NOT NULL,
  equipment_type VARCHAR(20),
  gross_weight_t NUMERIC(12,3) CHECK (gross_weight_t > 0),
  
  -- Status and workflow
  status transport_order_status_enum DEFAULT 'NEW' NOT NULL,
  
  -- Audit fields
  created_by UUID NOT NULL, -- References auth.users(id)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  booked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Add table and column comments for transport_order
COMMENT ON TABLE transport_order IS 'Transport orders for shipment execution (Drop 1 stub - will be extended in Drop 2 with stops, milestones, and Transporeon integration)';
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

-- Call-off shipment line table (enhanced version with delivery fields)
CREATE TABLE call_off_shipment_line (
  -- Primary key
  shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  call_off_id UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE,
  transport_order_id UUID REFERENCES transport_order(transport_order_id) ON DELETE SET NULL,
  
  -- Shipment details
  bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
  metal_code VARCHAR(12) NOT NULL,
  destination_party_id UUID,
  expected_ship_date DATE,
  
  -- Enhanced delivery details
  delivery_location VARCHAR(100),
  requested_delivery_date DATE,
  notes TEXT,
  delivery_notes TEXT,
  status shipment_line_status DEFAULT 'PLANNED',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments for shipment line
COMMENT ON TABLE call_off_shipment_line IS 'Shipment lines for call-offs, enabling split deliveries';
COMMENT ON COLUMN call_off_shipment_line.shipment_line_id IS 'Unique shipment line identifier';
COMMENT ON COLUMN call_off_shipment_line.call_off_id IS 'Parent call-off reference';
COMMENT ON COLUMN call_off_shipment_line.transport_order_id IS 'Assigned transport order (NULL until planned)';
COMMENT ON COLUMN call_off_shipment_line.bundle_qty IS 'Quantity to ship in 1-tonne bundles';
COMMENT ON COLUMN call_off_shipment_line.metal_code IS 'Metal type (defaults from quota)';
COMMENT ON COLUMN call_off_shipment_line.destination_party_id IS 'Customer or distribution center';
COMMENT ON COLUMN call_off_shipment_line.expected_ship_date IS 'Planned shipment date';
COMMENT ON COLUMN call_off_shipment_line.delivery_location IS 'Warehouse or customer delivery location';
COMMENT ON COLUMN call_off_shipment_line.requested_delivery_date IS 'Customer requested delivery date';
COMMENT ON COLUMN call_off_shipment_line.notes IS 'Additional delivery instructions or requirements';
COMMENT ON COLUMN call_off_shipment_line.status IS 'Current status of the shipment line';
COMMENT ON COLUMN call_off_shipment_line.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN call_off_shipment_line.updated_at IS 'Last modification timestamp';

-- Add constraints for shipment line
ALTER TABLE call_off_shipment_line ADD CONSTRAINT chk_ship_date_future
CHECK (expected_ship_date IS NULL OR expected_ship_date >= CURRENT_DATE);

ALTER TABLE call_off_shipment_line ADD CONSTRAINT chk_requested_delivery_date_future
CHECK (requested_delivery_date IS NULL OR requested_delivery_date >= CURRENT_DATE);

-- Inventory lot table
CREATE TABLE inventory_lot (
  -- Primary key
  lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supplier and product details
  supplier_id UUID NOT NULL,
  metal_code VARCHAR(12) NOT NULL,
  purity_pct NUMERIC(5,2) NOT NULL CHECK (purity_pct BETWEEN 80.00 AND 99.99),
  manufactured_on DATE NOT NULL,
  
  -- Certificate and documentation
  certificate_url TEXT,
  
  -- Status tracking
  status inventory_lot_status_enum DEFAULT 'INBOUND' NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments for inventory lot
COMMENT ON TABLE inventory_lot IS '25-tonne manufacturer lots with full traceability';
COMMENT ON COLUMN inventory_lot.lot_id IS 'Unique lot identifier (25t unit)';
COMMENT ON COLUMN inventory_lot.supplier_id IS 'Manufacturing supplier reference';
COMMENT ON COLUMN inventory_lot.metal_code IS 'Metal type code (CU, AL, NI, etc.)';
COMMENT ON COLUMN inventory_lot.purity_pct IS 'Metal purity percentage (80.00-99.99)';
COMMENT ON COLUMN inventory_lot.manufactured_on IS 'Manufacturing/production date';
COMMENT ON COLUMN inventory_lot.certificate_url IS 'Quality certificate storage path';
COMMENT ON COLUMN inventory_lot.status IS 'Lot-level status (INBOUND → ON_HAND → CLOSED)';
COMMENT ON COLUMN inventory_lot.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN inventory_lot.updated_at IS 'Last modification timestamp';

-- Add constraint for inventory lot
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_manufactured_date
CHECK (manufactured_on BETWEEN '2020-01-01' AND CURRENT_DATE + INTERVAL '30 days');

-- Inventory bundle table
CREATE TABLE inventory_bundle (
  -- Primary key
  bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  lot_id UUID NOT NULL REFERENCES inventory_lot(lot_id) ON DELETE RESTRICT,
  
  -- Physical characteristics
  weight_kg NUMERIC(9,3) DEFAULT 1000.000 NOT NULL 
    CHECK (weight_kg BETWEEN 950.000 AND 1050.000), -- ±5% tolerance
  
  -- Location tracking
  warehouse_id UUID NOT NULL,
  bin_location TEXT,
  
  -- Status tracking
  status inventory_bundle_status_enum DEFAULT 'RECEIPTED' NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments for inventory bundle
COMMENT ON TABLE inventory_bundle IS '1-tonne bundle units (25 per lot) with location tracking';
COMMENT ON COLUMN inventory_bundle.bundle_id IS 'Unique bundle identifier (1t unit)';
COMMENT ON COLUMN inventory_bundle.lot_id IS 'Parent lot reference (25t)';
COMMENT ON COLUMN inventory_bundle.weight_kg IS 'Actual weight with ±5% tolerance of 1000kg';
COMMENT ON COLUMN inventory_bundle.warehouse_id IS '3PL distribution center reference';
COMMENT ON COLUMN inventory_bundle.bin_location IS 'Zone/bin location within warehouse';
COMMENT ON COLUMN inventory_bundle.status IS 'Bundle lifecycle status';
COMMENT ON COLUMN inventory_bundle.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN inventory_bundle.updated_at IS 'Last modification timestamp';

-- Add constraint for inventory bundle
ALTER TABLE inventory_bundle ADD CONSTRAINT chk_bin_location_format
CHECK (bin_location IS NULL OR length(bin_location) BETWEEN 1 AND 50);

-- User profiles table
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    business_unit VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'OPS',
    warehouse_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================================================
-- 4. INDEXES
-- =====================================================================================

-- Quota indexes
CREATE INDEX idx_quota_counterparty ON quota (counterparty_id);
CREATE INDEX idx_quota_period_metal ON quota (period_month, metal_code);
CREATE INDEX idx_quota_direction ON quota (direction);
CREATE INDEX idx_quota_business_unit ON quota (business_unit_id);

-- Call-off indexes
CREATE INDEX idx_call_off_quota_status ON call_off (quota_id, status);
CREATE INDEX idx_call_off_number ON call_off (call_off_number);
CREATE INDEX idx_call_off_created_by ON call_off (created_by, created_at DESC);
CREATE INDEX idx_call_off_delivery_date ON call_off (requested_delivery_date) 
WHERE requested_delivery_date IS NOT NULL;
CREATE INDEX idx_call_off_status ON call_off (status);
CREATE INDEX idx_call_off_updated_at ON call_off (updated_at DESC);

-- Transport order indexes
CREATE INDEX idx_transport_order_status ON transport_order (status);
CREATE INDEX idx_transport_order_carrier ON transport_order (carrier_id);
CREATE INDEX idx_transport_order_created_by ON transport_order (created_by, created_at DESC);

-- Shipment line indexes
CREATE INDEX idx_shipment_line_call_off ON call_off_shipment_line (call_off_id);
CREATE INDEX idx_shipment_line_transport_order ON call_off_shipment_line (transport_order_id) 
WHERE transport_order_id IS NOT NULL;
CREATE INDEX idx_shipment_line_ship_date ON call_off_shipment_line (expected_ship_date, metal_code)
WHERE expected_ship_date IS NOT NULL;
CREATE INDEX idx_shipment_line_status ON call_off_shipment_line(status)
WHERE status IS NOT NULL;
CREATE INDEX idx_shipment_line_delivery_date ON call_off_shipment_line(requested_delivery_date, status)
WHERE requested_delivery_date IS NOT NULL;
CREATE INDEX idx_shipment_line_call_off_status ON call_off_shipment_line(call_off_id, status);

-- Inventory lot indexes
CREATE INDEX idx_inventory_lot_supplier_metal ON inventory_lot (supplier_id, metal_code, status);
CREATE INDEX idx_inventory_lot_manufactured ON inventory_lot (manufactured_on, metal_code);
CREATE INDEX idx_inventory_lot_certificate ON inventory_lot (certificate_url) 
WHERE certificate_url IS NOT NULL;
CREATE INDEX idx_inventory_lot_status ON inventory_lot (status);

-- Inventory bundle indexes
CREATE INDEX idx_inventory_bundle_wh_status ON inventory_bundle (warehouse_id, status, lot_id);
CREATE INDEX idx_inventory_bundle_lot ON inventory_bundle (lot_id);
CREATE INDEX idx_inventory_bundle_location ON inventory_bundle (warehouse_id, bin_location, status) 
WHERE status IN ('ON_HAND', 'RESERVED');
CREATE INDEX idx_inventory_bundle_weight_variance ON inventory_bundle (weight_kg) 
WHERE ABS(weight_kg - 1000) > 5; -- Flag significant weight variances

-- Counterparty indexes
CREATE INDEX idx_counterparty_company_code ON counterparty(company_code);
CREATE INDEX idx_counterparty_type ON counterparty(counterparty_type);
CREATE INDEX idx_counterparty_active ON counterparty(is_active);

-- Business units indexes
CREATE INDEX idx_business_units_code ON business_units (code, region);

-- =====================================================================================
-- 5. TRIGGERS
-- =====================================================================================

-- Create triggers for automatic updated_at
CREATE TRIGGER update_call_off_updated_at 
    BEFORE UPDATE ON call_off 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_off_shipment_line_updated_at 
    BEFORE UPDATE ON call_off_shipment_line 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_order_updated_at 
    BEFORE UPDATE ON transport_order 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_lot_updated_at 
    BEFORE UPDATE ON inventory_lot 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_bundle_updated_at 
    BEFORE UPDATE ON inventory_bundle 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counterparty_updated_at 
    BEFORE UPDATE ON counterparty 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 6. CALL-OFF NUMBER GENERATOR FUNCTION
-- =====================================================================================

CREATE OR REPLACE FUNCTION generate_call_off_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_sequence INTEGER;
    v_number TEXT;
BEGIN
    -- Get current year
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Lock the table to prevent concurrent generation issues
    LOCK TABLE call_off IN SHARE UPDATE EXCLUSIVE MODE;
    
    -- Get the maximum sequence number for the current year
    SELECT COALESCE(MAX(CAST(SUBSTRING(call_off_number FROM 9 FOR 4) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM call_off
    WHERE call_off_number LIKE 'CO-' || v_year || '-%';
    
    -- Format the number: CO-YYYY-NNNN
    v_number := 'CO-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_call_off_number() IS 'Generates sequential call-off numbers in format CO-YYYY-NNNN';

-- =====================================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparty ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bundle ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Business units policies
CREATE POLICY "Authenticated users can read business units" ON business_units
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage business units" ON business_units
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Counterparty policies
CREATE POLICY "Authenticated users can read counterparties" ON counterparty
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage counterparties" ON counterparty
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Quota policies
CREATE POLICY "Authenticated users can read quotas" ON quota
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage quotas" ON quota
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Call-off policies
CREATE POLICY "Authenticated users can read call-offs" ON call_off
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create call-offs" ON call_off
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own call-offs" ON call_off
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Service role can manage all call-offs" ON call_off
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Shipment line policies
CREATE POLICY "Authenticated users can read shipment lines" ON call_off_shipment_line
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create shipment lines" ON call_off_shipment_line
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shipment lines" ON call_off_shipment_line
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage all shipment lines" ON call_off_shipment_line
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Transport order policies
CREATE POLICY "Authenticated users can read transport orders" ON transport_order
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage transport orders" ON transport_order
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Inventory lot policies
CREATE POLICY "Authenticated users can read inventory lots" ON inventory_lot
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage inventory lots" ON inventory_lot
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Inventory bundle policies
CREATE POLICY "Authenticated users can read inventory bundles" ON inventory_bundle
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage inventory bundles" ON inventory_bundle
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User profiles policies
CREATE POLICY "Users can read their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================================================
-- 8. VIEWS (Business Views)
-- =====================================================================================

-- Create view for call-off summary with quota details
CREATE OR REPLACE VIEW v_call_off_summary AS
SELECT 
    co.call_off_id,
    co.call_off_number,
    co.status,
    co.bundle_qty,
    co.requested_delivery_date,
    co.created_at,
    co.updated_at,
    q.quota_id,
    q.period_month,
    q.qty_t as quota_qty_t,
    q.tolerance_pct,
    q.metal_code,
    q.incoterm_code,
    q.direction,
    c.company_name as counterparty_name,
    c.company_code as counterparty_code,
    c.country_code as counterparty_country,
    bu.name as business_unit_name,
    bu.code as business_unit_code
FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
JOIN counterparty c ON q.counterparty_id = c.counterparty_id
JOIN business_units bu ON q.business_unit_id = bu.id;

-- Create view for shipment line details with call-off information
CREATE OR REPLACE VIEW v_shipment_line_details AS
SELECT 
    sl.shipment_line_id,
    sl.bundle_qty,
    sl.metal_code,
    sl.expected_ship_date,
    sl.delivery_location,
    sl.requested_delivery_date,
    sl.status as shipment_status,
    sl.notes,
    co.call_off_id,
    co.call_off_number,
    co.status as call_off_status,
    co.direction,
    to.transport_order_id,
    to.order_number as transport_order_number,
    to.carrier_name,
    to.status as transport_status
FROM call_off_shipment_line sl
JOIN call_off co ON sl.call_off_id = co.call_off_id
LEFT JOIN transport_order to ON sl.transport_order_id = to.transport_order_id;

-- Create view for quota utilization
CREATE OR REPLACE VIEW v_quota_utilization AS
WITH call_off_totals AS (
    SELECT 
        q.quota_id,
        COALESCE(SUM(co.bundle_qty), 0) as total_called_off,
        COUNT(co.call_off_id) as call_off_count,
        COALESCE(SUM(CASE WHEN co.status = 'CONFIRMED' THEN co.bundle_qty ELSE 0 END), 0) as confirmed_qty,
        COALESCE(SUM(CASE WHEN co.status = 'FULFILLED' THEN co.bundle_qty ELSE 0 END), 0) as fulfilled_qty
    FROM quota q
    LEFT JOIN call_off co ON q.quota_id = co.quota_id AND co.status != 'CANCELLED'
    GROUP BY q.quota_id
)
SELECT 
    q.quota_id,
    q.period_month,
    q.metal_code,
    q.direction,
    q.qty_t as quota_qty_t,
    q.tolerance_pct,
    ct.total_called_off,
    ct.call_off_count,
    ct.confirmed_qty,
    ct.fulfilled_qty,
    q.qty_t - ct.total_called_off as remaining_qty,
    ROUND((ct.total_called_off / q.qty_t) * 100, 2) as utilization_pct,
    c.company_name as counterparty_name,
    bu.name as business_unit_name
FROM quota q
JOIN call_off_totals ct ON q.quota_id = ct.quota_id
JOIN counterparty c ON q.counterparty_id = c.counterparty_id
JOIN business_units bu ON q.business_unit_id = bu.id;

-- =====================================================================================
-- 9. SEED DATA FOR BUSINESS UNITS
-- =====================================================================================

-- Insert default business units
INSERT INTO business_units (id, name, code, region) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'European Operations', 'EU', 'Europe'),
('550e8400-e29b-41d4-a716-446655440002', 'Americas Trading', 'US', 'Americas'),
('550e8400-e29b-41d4-a716-446655440003', 'Asia Pacific', 'APAC', 'Asia')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- NOTES ON MIGRATION FILES
-- =====================================================================================

-- Test Data Files (contain seed data for development/testing):
-- - 025_seed_quota_data.sql: Contains 20 quota records for testing
-- - 20250115000000_load_production_seed_data.sql: Contains counterparty and quota seed data
-- - 20250115_import_production_quotas.sql: Production quota import

-- Schema Files (define structure):
-- - 001_create_enums.sql through 024_create_performance_views.sql: Core schema
-- - 030_enhance_shipment_lines.sql: Enhanced shipment line fields
-- - 20250114000001_initial_schema.sql through 20250114000004_create_views.sql: Consolidated schema

-- Fix/Update Files:
-- - Various fix files for RLS policies, business unit columns, etc.

-- Skipped Files (in archive/skip folder):
-- - These contain alternative implementations or deprecated structures