-- Complete Supply Chain App Database Schema
-- This file represents the full schema as deployed in preview environment
-- Created: 2025-01-15
-- 
-- Run this in a fresh Supabase project to set up the complete database structure
-- For production reset: DROP all existing tables first, then run this

BEGIN;

-- =====================================================
-- 1. ENUM TYPES (Must be created before tables)
-- =====================================================

-- Direction for buy/sell operations
CREATE TYPE direction_enum AS ENUM ('BUY', 'SELL');

-- Call-off workflow statuses
CREATE TYPE call_off_status_enum AS ENUM ('NEW', 'CONFIRMED', 'FULFILLED', 'CANCELLED');

-- Transport order statuses
CREATE TYPE transport_order_status_enum AS ENUM ('NEW', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- Inventory lot statuses
CREATE TYPE inventory_lot_status_enum AS ENUM ('INBOUND', 'ON_HAND', 'CLOSED');

-- Inventory bundle statuses
CREATE TYPE inventory_bundle_status_enum AS ENUM ('RECEIPTED', 'ON_HAND', 'RESERVED', 'PICKED', 'SHIPPED', 'DELIVERED');

-- Transport modes
CREATE TYPE transport_mode_enum AS ENUM ('ROAD', 'SEA', 'RAIL', 'AIR');

-- Milestone events
CREATE TYPE milestone_event_enum AS ENUM ('DEP', 'ARR', 'POD', 'EXC');

-- User roles
CREATE TYPE user_role_enum AS ENUM ('OPS', 'TRADE', 'PLANNER', 'ADMIN');

-- Shipment line status
CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED');

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- Business Units (for multi-tenant support)
CREATE TABLE business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default business units
INSERT INTO business_units (id, name, code) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Europe Operations', 'EU'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Americas Trading', 'US'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Asia Pacific', 'APAC')
ON CONFLICT (id) DO NOTHING;

-- Counterparty (suppliers/customers)
CREATE TABLE counterparty (
    counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
    country_code CHAR(2) NOT NULL,
    tax_id VARCHAR(50),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    payment_terms_days INTEGER DEFAULT 30,
    credit_limit NUMERIC(15,2),
    default_currency CHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quota (metal quotas)
CREATE TABLE quota (
    quota_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id),
    direction direction_enum NOT NULL,
    period_month DATE NOT NULL,
    qty_t NUMERIC(10,3) NOT NULL CHECK (qty_t > 0 AND qty_t <= 100000),
    tolerance_pct NUMERIC(5,2) DEFAULT 5 CHECK (tolerance_pct >= 0 AND tolerance_pct <= 100),
    metal_code VARCHAR(10) NOT NULL,
    business_unit_id VARCHAR(20) NOT NULL DEFAULT 'DEFAULT',
    incoterm_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call-off (orders against quotas)
CREATE TABLE call_off (
    call_off_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_off_number VARCHAR(50) UNIQUE NOT NULL,
    quota_id UUID NOT NULL REFERENCES quota(quota_id),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id),
    direction direction_enum NOT NULL,
    status call_off_status_enum NOT NULL DEFAULT 'NEW',
    bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
    requested_delivery_date DATE,
    incoterm_code VARCHAR(10) NOT NULL,
    fulfillment_location VARCHAR(255),
    delivery_location VARCHAR(255),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Order
CREATE TABLE transport_order (
    transport_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    carrier_ref VARCHAR(100),
    booking_ref VARCHAR(100),
    transport_mode transport_mode_enum NOT NULL,
    equipment_type VARCHAR(50),
    status transport_order_status_enum NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    booked_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Call-off Shipment Line (with all enhancements)
CREATE TABLE call_off_shipment_line (
    shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_off_id UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE,
    transport_order_id UUID REFERENCES transport_order(transport_order_id),
    bundle_qty INTEGER NOT NULL CHECK (bundle_qty > 0 AND bundle_qty <= 10000),
    metal_code VARCHAR(12) NOT NULL,
    destination_party_id UUID,
    expected_ship_date DATE,
    delivery_location VARCHAR(255),
    requested_delivery_date DATE,
    notes TEXT,
    status shipment_line_status DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Lot
CREATE TABLE inventory_lot (
    lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    metal_code VARCHAR(10) NOT NULL,
    total_weight_kg NUMERIC(10,2) NOT NULL CHECK (total_weight_kg > 0),
    mfg_date DATE,
    certificate_number VARCHAR(100),
    status inventory_lot_status_enum NOT NULL DEFAULT 'INBOUND',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Bundle
CREATE TABLE inventory_bundle (
    bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES inventory_lot(lot_id),
    bundle_number VARCHAR(50) UNIQUE NOT NULL,
    weight_kg NUMERIC(10,2) NOT NULL CHECK (weight_kg BETWEEN 950 AND 1050),
    warehouse_location VARCHAR(50),
    status inventory_bundle_status_enum NOT NULL DEFAULT 'RECEIPTED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (extends Supabase auth)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    business_unit VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'OPS',
    warehouse_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Counterparty indexes
CREATE INDEX idx_counterparty_company_code ON counterparty(company_code);
CREATE INDEX idx_counterparty_type ON counterparty(counterparty_type);
CREATE INDEX idx_counterparty_active ON counterparty(is_active);

-- Quota indexes
CREATE INDEX idx_quota_counterparty ON quota(counterparty_id);
CREATE INDEX idx_quota_period ON quota(period_month);
CREATE INDEX idx_quota_direction ON quota(direction);
CREATE INDEX idx_quota_business_unit ON quota(business_unit_id);

-- Call-off indexes
CREATE INDEX idx_call_off_quota ON call_off(quota_id);
CREATE INDEX idx_call_off_counterparty ON call_off(counterparty_id);
CREATE INDEX idx_call_off_status ON call_off(status);
CREATE INDEX idx_call_off_number ON call_off(call_off_number);

-- Shipment line indexes
CREATE INDEX idx_shipment_line_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX idx_shipment_line_transport_order ON call_off_shipment_line(transport_order_id) 
    WHERE transport_order_id IS NOT NULL;
CREATE INDEX idx_shipment_line_status ON call_off_shipment_line(status);
CREATE INDEX idx_shipment_line_delivery_date ON call_off_shipment_line(requested_delivery_date, status)
    WHERE requested_delivery_date IS NOT NULL;

-- Transport order indexes
CREATE INDEX idx_transport_order_status ON transport_order(status);
CREATE INDEX idx_transport_order_carrier ON transport_order(carrier_name);

-- Inventory indexes
CREATE INDEX idx_inventory_lot_status ON inventory_lot(status);
CREATE INDEX idx_inventory_bundle_lot ON inventory_bundle(lot_id);
CREATE INDEX idx_inventory_bundle_status ON inventory_bundle(status);

-- User profile indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_business_units_updated_at BEFORE UPDATE ON business_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counterparty_updated_at BEFORE UPDATE ON counterparty 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_off_updated_at BEFORE UPDATE ON call_off 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_off_shipment_line_updated_at BEFORE UPDATE ON call_off_shipment_line 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_bundle_updated_at BEFORE UPDATE ON inventory_bundle 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

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

-- Basic RLS policies (allow authenticated users to read all data)
CREATE POLICY "Allow authenticated read access" ON counterparty
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON quota
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON call_off
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON call_off_shipment_line
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON transport_order
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON inventory_lot
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON inventory_bundle
    FOR SELECT TO authenticated USING (true);

-- User profiles - users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 6. VIEWS FOR REPORTING
-- =====================================================

-- Quota balance view
CREATE OR REPLACE VIEW v_quota_balance AS
SELECT 
    q.quota_id,
    q.counterparty_id,
    c.company_name,
    q.direction,
    q.period_month,
    q.qty_t as quota_qty_tonnes,
    q.tolerance_pct,
    COALESCE(SUM(co.bundle_qty), 0) as consumed_bundles,
    COALESCE(SUM(CASE WHEN co.status = 'NEW' THEN co.bundle_qty ELSE 0 END), 0) as pending_bundles,
    q.qty_t - COALESCE(SUM(co.bundle_qty), 0) as remaining_qty_tonnes,
    ROUND((COALESCE(SUM(co.bundle_qty), 0)::numeric / q.qty_t) * 100, 2) as utilization_pct,
    CASE 
        WHEN (COALESCE(SUM(co.bundle_qty), 0)::numeric / q.qty_t) * 100 > (100 + q.tolerance_pct) THEN 'OVER_TOLERANCE'
        WHEN (COALESCE(SUM(co.bundle_qty), 0)::numeric / q.qty_t) * 100 > 95 THEN 'NEAR_LIMIT'
        ELSE 'WITHIN_LIMITS'
    END as tolerance_status,
    COUNT(DISTINCT co.call_off_id) as call_off_count
FROM quota q
JOIN counterparty c ON q.counterparty_id = c.counterparty_id
LEFT JOIN call_off co ON q.quota_id = co.quota_id AND co.status != 'CANCELLED'
GROUP BY q.quota_id, q.counterparty_id, c.company_name, q.direction, q.period_month, q.qty_t, q.tolerance_pct;

-- Call-off summary view
CREATE OR REPLACE VIEW v_call_off_summary AS
SELECT 
    co.call_off_id,
    co.call_off_number,
    co.status,
    co.bundle_qty,
    co.requested_delivery_date,
    co.created_at,
    co.updated_at,
    co.fulfillment_location,
    co.delivery_location,
    q.quota_id,
    q.period_month,
    q.qty_t as quota_qty,
    q.metal_code,
    q.direction,
    c.company_name,
    c.company_code,
    c.counterparty_type
FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
JOIN counterparty c ON co.counterparty_id = c.counterparty_id;

COMMIT;

-- =====================================================
-- Post-setup verification
-- =====================================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify all enum types exist
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;