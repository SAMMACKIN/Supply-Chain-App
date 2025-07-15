-- Create core tables
BEGIN;

-- Counterparty table
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

-- Quota table
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

-- Call off table
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

-- Transport order table
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

-- Call off shipment line table
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

-- User profiles table
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

COMMIT;