-- Production Database Sync Migration
-- Generated: 2025-01-14
-- Purpose: Sync production database with all development improvements

-- Start transaction
BEGIN;

-- 1. Create ENUMs if they don't exist
DO $$ 
BEGIN
    -- Direction enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'direction_enum') THEN
        CREATE TYPE direction_enum AS ENUM ('BUY', 'SELL');
    END IF;
    
    -- Call off status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_off_status_enum') THEN
        CREATE TYPE call_off_status_enum AS ENUM ('NEW', 'CONFIRMED', 'FULFILLED', 'CANCELLED');
    END IF;
    
    -- Transport order status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_order_status_enum') THEN
        CREATE TYPE transport_order_status_enum AS ENUM ('NEW', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
    END IF;
    
    -- Inventory lot status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_lot_status_enum') THEN
        CREATE TYPE inventory_lot_status_enum AS ENUM ('INBOUND', 'ON_HAND', 'CLOSED');
    END IF;
    
    -- Inventory bundle status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_bundle_status_enum') THEN
        CREATE TYPE inventory_bundle_status_enum AS ENUM ('RECEIPTED', 'ON_HAND', 'RESERVED', 'PICKED', 'SHIPPED', 'DELIVERED');
    END IF;
    
    -- Transport mode enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_mode_enum') THEN
        CREATE TYPE transport_mode_enum AS ENUM ('ROAD', 'SEA', 'RAIL', 'AIR');
    END IF;
    
    -- Milestone event enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_event_enum') THEN
        CREATE TYPE milestone_event_enum AS ENUM ('DEP', 'ARR', 'POD', 'EXC');
    END IF;
    
    -- User role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('OPS', 'TRADE', 'PLANNER', 'ADMIN');
    END IF;
    
    -- Shipment line status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED');
    END IF;
END $$;

-- 2. Create counterparty table (most important addition)
CREATE TABLE IF NOT EXISTS counterparty (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for counterparty
CREATE INDEX IF NOT EXISTS idx_counterparty_company_code ON counterparty(company_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_type ON counterparty(counterparty_type);
CREATE INDEX IF NOT EXISTS idx_counterparty_active ON counterparty(is_active);

-- 3. Create/update quota table
CREATE TABLE IF NOT EXISTS quota (
    quota_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id),
    direction direction_enum NOT NULL,
    period_month DATE NOT NULL,
    qty_t NUMERIC(10,3) NOT NULL,
    tolerance_pct NUMERIC(5,2) DEFAULT 5,
    metal_code VARCHAR(10) NOT NULL,
    business_unit_id VARCHAR(20) NOT NULL,
    incoterm_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for quota
CREATE INDEX IF NOT EXISTS idx_quota_counterparty ON quota(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_quota_period ON quota(period_month);
CREATE INDEX IF NOT EXISTS idx_quota_direction ON quota(direction);

-- 4. Create/update call_off table
CREATE TABLE IF NOT EXISTS call_off (
    call_off_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_off_number VARCHAR(50) UNIQUE NOT NULL,
    quota_id UUID NOT NULL REFERENCES quota(quota_id),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id),
    direction direction_enum NOT NULL,
    status call_off_status_enum NOT NULL DEFAULT 'NEW',
    bundle_qty INTEGER NOT NULL,
    requested_delivery_date DATE,
    incoterm_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    fulfillment_location VARCHAR(255),
    delivery_location VARCHAR(255)
);

-- Add columns if they don't exist
DO $$ 
BEGIN
    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'updated_at') THEN
        ALTER TABLE call_off ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add location columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'fulfillment_location') THEN
        ALTER TABLE call_off ADD COLUMN fulfillment_location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'call_off' AND column_name = 'delivery_location') THEN
        ALTER TABLE call_off ADD COLUMN delivery_location VARCHAR(255);
    END IF;
END $$;

-- Create indexes for call_off
CREATE INDEX IF NOT EXISTS idx_call_off_quota ON call_off(quota_id);
CREATE INDEX IF NOT EXISTS idx_call_off_counterparty ON call_off(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_call_off_status ON call_off(status);
CREATE INDEX IF NOT EXISTS idx_call_off_number ON call_off(call_off_number);

-- 5. Create transport_order table
CREATE TABLE IF NOT EXISTS transport_order (
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

-- Create indexes for transport_order
CREATE INDEX IF NOT EXISTS idx_transport_order_status ON transport_order(status);
CREATE INDEX IF NOT EXISTS idx_transport_order_carrier ON transport_order(carrier_name);

-- 6. Create/update call_off_shipment_line table
CREATE TABLE IF NOT EXISTS call_off_shipment_line (
    shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_off_id UUID NOT NULL REFERENCES call_off(call_off_id),
    transport_order_id UUID REFERENCES transport_order(transport_order_id),
    bundle_qty INTEGER NOT NULL,
    metal_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_location VARCHAR(255),
    requested_delivery_date DATE,
    delivery_notes TEXT,
    status shipment_line_status DEFAULT 'PLANNED'
);

-- Add columns if they don't exist
DO $$ 
BEGIN
    -- Add delivery details columns if missing
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

-- Create indexes for call_off_shipment_line
CREATE INDEX IF NOT EXISTS idx_shipment_line_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX IF NOT EXISTS idx_shipment_line_transport_order ON call_off_shipment_line(transport_order_id);

-- 7. Create inventory tables
CREATE TABLE IF NOT EXISTS inventory_lot (
    lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    metal_code VARCHAR(10) NOT NULL,
    total_weight_kg NUMERIC(10,2) NOT NULL,
    mfg_date DATE,
    certificate_number VARCHAR(100),
    status inventory_lot_status_enum NOT NULL DEFAULT 'INBOUND',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_bundle (
    bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES inventory_lot(lot_id),
    bundle_number VARCHAR(50) UNIQUE NOT NULL,
    weight_kg NUMERIC(10,2) NOT NULL CHECK (weight_kg BETWEEN 950 AND 1050),
    warehouse_location VARCHAR(50),
    status inventory_bundle_status_enum NOT NULL DEFAULT 'RECEIPTED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for inventory
CREATE INDEX IF NOT EXISTS idx_inventory_lot_status ON inventory_lot(status);
CREATE INDEX IF NOT EXISTS idx_inventory_bundle_lot ON inventory_bundle(lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_bundle_status ON inventory_bundle(status);

-- 8. Create user_profiles table for authentication
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    business_unit VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'OPS',
    warehouse_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 9. Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$ 
BEGIN
    -- Apply to call_off
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_call_off_updated_at') THEN
        CREATE TRIGGER update_call_off_updated_at 
        BEFORE UPDATE ON call_off 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Apply to counterparty
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_counterparty_updated_at') THEN
        CREATE TRIGGER update_counterparty_updated_at 
        BEFORE UPDATE ON counterparty 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Apply to inventory_bundle
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_bundle_updated_at') THEN
        CREATE TRIGGER update_inventory_bundle_updated_at 
        BEFORE UPDATE ON inventory_bundle 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Apply to user_profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
        CREATE TRIGGER update_user_profiles_updated_at 
        BEFORE UPDATE ON user_profiles 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 10. Create important views
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

-- Call off summary view
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

-- 11. Insert sample counterparty data if table is empty
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, is_active)
SELECT * FROM (VALUES
    ('Glencore International AG', 'GLEN', 'BOTH', 'CH', true),
    ('Trafigura Group', 'TRAF', 'BOTH', 'SG', true),
    ('Rio Tinto', 'RIO', 'SUPPLIER', 'AU', true),
    ('ArcelorMittal', 'MT', 'CUSTOMER', 'LU', true),
    ('BHP Group', 'BHP', 'SUPPLIER', 'AU', true)
) AS v(company_name, company_code, counterparty_type, country_code, is_active)
WHERE NOT EXISTS (SELECT 1 FROM counterparty LIMIT 1);

-- 12. Enable Row Level Security (RLS) on tables
ALTER TABLE counterparty ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bundle ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies (allow authenticated users to read all data)
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

-- Commit transaction
COMMIT;

-- Display summary
SELECT 'Migration completed successfully!' as message;