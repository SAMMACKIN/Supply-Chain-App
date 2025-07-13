-- Create helper functions for Row Level Security
-- Migration: 012_create_rls_functions.sql
-- Created: July 12, 2025

-- Function to get current user's business unit ID
CREATE OR REPLACE FUNCTION get_user_business_unit_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT business_unit_id 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role_enum
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT role 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;

-- Function to get current user's warehouse IDs (for 3PL users)
CREATE OR REPLACE FUNCTION get_user_warehouse_ids()
RETURNS UUID[]
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT warehouse_ids 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;

-- Function to check if user has OPS role
CREATE OR REPLACE FUNCTION user_has_ops_role()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'OPS'
  );
$$;

-- Function to check if user has TRADE role
CREATE OR REPLACE FUNCTION user_has_trade_role()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'TRADE'
  );
$$;

-- Function to check if user has PLANNER role
CREATE OR REPLACE FUNCTION user_has_planner_role()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'PLANNER'
  );
$$;

-- Function to check if user can access warehouse
CREATE OR REPLACE FUNCTION user_can_access_warehouse(warehouse_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN user_has_ops_role() THEN TRUE  -- OPS can access all warehouses
      ELSE warehouse_id = ANY(get_user_warehouse_ids())  -- Others need explicit access
    END;
$$;

-- Add function comments for documentation
COMMENT ON FUNCTION get_user_business_unit_id() IS 'Returns the business unit ID for the current authenticated user';
COMMENT ON FUNCTION get_user_role() IS 'Returns the role (OPS, TRADE, PLANNER) for the current authenticated user';
COMMENT ON FUNCTION get_user_warehouse_ids() IS 'Returns array of warehouse IDs that the current user can access';
COMMENT ON FUNCTION user_has_ops_role() IS 'Returns true if current user has OPS role';
COMMENT ON FUNCTION user_has_trade_role() IS 'Returns true if current user has TRADE role';
COMMENT ON FUNCTION user_has_planner_role() IS 'Returns true if current user has PLANNER role';
COMMENT ON FUNCTION user_can_access_warehouse(UUID) IS 'Returns true if current user can access the specified warehouse';