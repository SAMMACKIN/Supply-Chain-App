-- Create user profiles table for role and business unit management
-- Migration: 011_create_user_profiles.sql
-- Created: July 12, 2025

-- User profiles table for storing BU and role information
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  business_unit_id UUID NOT NULL,
  role user_role_enum NOT NULL,
  warehouse_ids UUID[] DEFAULT '{}', -- For 3PL users with warehouse access
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE user_profiles IS 'User profiles with business unit and role assignments for RLS';
COMMENT ON COLUMN user_profiles.user_id IS 'References auth.users(id) - one profile per user';
COMMENT ON COLUMN user_profiles.business_unit_id IS 'Business unit for multi-tenant isolation';
COMMENT ON COLUMN user_profiles.role IS 'User role: OPS, TRADE, or PLANNER';
COMMENT ON COLUMN user_profiles.warehouse_ids IS 'Array of warehouse UUIDs for 3PL users';

-- Create indexes for RLS performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX idx_user_profiles_business_unit ON user_profiles (business_unit_id);
CREATE INDEX idx_user_profiles_role ON user_profiles (role);

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can manage user profiles
CREATE POLICY "Service role can manage profiles" ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger for automatic updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create business units table for reference
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  region VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add sample business units
INSERT INTO business_units (id, name, code, region) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'European Operations', 'EU', 'Europe'),
('550e8400-e29b-41d4-a716-446655440002', 'Americas Trading', 'US', 'Americas'),
('550e8400-e29b-41d4-a716-446655440003', 'Asia Pacific', 'APAC', 'Asia Pacific');

-- Enable RLS on business units
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read business units
CREATE POLICY "Authenticated users can read business units" ON business_units
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can manage business units
CREATE POLICY "Service role can manage business units" ON business_units
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');