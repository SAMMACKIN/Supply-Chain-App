-- Apply ALL pending migrations (029-033)
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- Migration 029: Fix shipment lines (if needed)
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Checking shipment lines setup...';
END$$;

-- ============================================
-- Migration 030: Add shipment lines table (if not exists)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipment_line_status') THEN
        CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
        RAISE NOTICE '✓ Created shipment_line_status enum';
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS call_off_shipment_line (
    shipment_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_off_id UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE,
    transport_order_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_shipment_lines_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_status ON call_off_shipment_line(status);

ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_off_shipment_line' AND policyname = 'shipment_line_select_policy') THEN
        CREATE POLICY shipment_line_select_policy ON call_off_shipment_line FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_off_shipment_line' AND policyname = 'shipment_line_insert_policy') THEN
        CREATE POLICY shipment_line_insert_policy ON call_off_shipment_line FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_off_shipment_line' AND policyname = 'shipment_line_update_policy') THEN
        CREATE POLICY shipment_line_update_policy ON call_off_shipment_line FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_off_shipment_line' AND policyname = 'shipment_line_delete_policy') THEN
        CREATE POLICY shipment_line_delete_policy ON call_off_shipment_line FOR DELETE USING (true);
    END IF;
END$$;

-- ============================================
-- Migration 031: Fix call_off triggers
-- ============================================
ALTER TABLE call_off ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off CASCADE;
CREATE OR REPLACE FUNCTION update_call_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_off_updated_at
    BEFORE UPDATE ON call_off
    FOR EACH ROW
    EXECUTE FUNCTION update_call_off_updated_at();

-- ============================================
-- Migration 032: Add counterparty addresses
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'address_type') THEN
        CREATE TYPE address_type AS ENUM ('BILLING', 'DELIVERY', 'BOTH');
        RAISE NOTICE '✓ Created address_type enum';
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS counterparty_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counterparty_id UUID NOT NULL REFERENCES counterparty(counterparty_id) ON DELETE CASCADE,
    address_type address_type NOT NULL DEFAULT 'DELIVERY',
    address_name VARCHAR(255) NOT NULL,
    street_address VARCHAR(500) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state_province VARCHAR(255),
    postal_code VARCHAR(50),
    country_code VARCHAR(2) NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE counterparty_addresses ENABLE ROW LEVEL SECURITY;

-- Policies for counterparty_addresses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'counterparty_addresses' AND policyname = 'counterparty_addresses_select_policy') THEN
        CREATE POLICY counterparty_addresses_select_policy ON counterparty_addresses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'counterparty_addresses' AND policyname = 'counterparty_addresses_insert_policy') THEN
        CREATE POLICY counterparty_addresses_insert_policy ON counterparty_addresses FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'counterparty_addresses' AND policyname = 'counterparty_addresses_update_policy') THEN
        CREATE POLICY counterparty_addresses_update_policy ON counterparty_addresses FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'counterparty_addresses' AND policyname = 'counterparty_addresses_delete_policy') THEN
        CREATE POLICY counterparty_addresses_delete_policy ON counterparty_addresses FOR DELETE USING (true);
    END IF;
END$$;

ALTER TABLE call_off ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES counterparty_addresses(address_id);

-- ============================================
-- Migration 033: Ensure user profiles exist
-- ============================================
INSERT INTO user_profiles (
    user_id,
    email,
    display_name,
    role,
    business_unit,
    warehouse_ids,
    created_at,
    updated_at
)
SELECT 
    au.id as user_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
    COALESCE(au.raw_user_meta_data->>'role', 'OPS') as role,
    COALESCE(au.raw_user_meta_data->>'business_unit', 'BU001') as business_unit,
    COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(au.raw_user_meta_data->'warehouse_ids')), 
        ARRAY[]::text[]
    ) as warehouse_ids,
    au.created_at,
    au.created_at as updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- Create trigger for future signups
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        email,
        display_name,
        role,
        business_unit,
        warehouse_ids,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'OPS'),
        COALESCE(NEW.raw_user_meta_data->>'business_unit', 'BU001'),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'warehouse_ids')), 
            ARRAY[]::text[]
        ),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_user_profile_on_signup_trigger ON auth.users;
CREATE TRIGGER create_user_profile_on_signup_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_on_signup();

-- ============================================
-- Verify everything
-- ============================================
DO $$ 
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION RESULTS ===';
    
    -- Check tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_off_shipment_line') THEN
        SELECT COUNT(*) INTO v_count FROM call_off_shipment_line;
        RAISE NOTICE '✓ call_off_shipment_line table exists (% rows)', v_count;
    ELSE
        RAISE NOTICE '✗ call_off_shipment_line table MISSING!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'counterparty_addresses') THEN
        SELECT COUNT(*) INTO v_count FROM counterparty_addresses;
        RAISE NOTICE '✓ counterparty_addresses table exists (% rows)', v_count;
    ELSE
        RAISE NOTICE '✗ counterparty_addresses table MISSING!';
    END IF;
    
    -- Check user profiles
    SELECT COUNT(*) INTO v_count FROM auth.users au LEFT JOIN user_profiles up ON au.id = up.user_id WHERE up.user_id IS NULL;
    IF v_count = 0 THEN
        RAISE NOTICE '✓ All users have profiles';
    ELSE
        RAISE NOTICE '✗ % users missing profiles!', v_count;
    END IF;
    
    -- Check your specific user
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = '33335e78-ff0b-4826-9b9b-3a35894bd655') THEN
        RAISE NOTICE '✓ Your user profile exists';
    ELSE
        RAISE NOTICE '✗ Your user profile is MISSING!';
    END IF;
    
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
END$$;