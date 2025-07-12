-- Create ENUM types for the supply chain application
-- Migration: 001_create_enums.sql
-- Created: July 12, 2025

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
  'PLANNER'
);

-- Comment explaining enum usage
COMMENT ON TYPE direction_enum IS 'Trade direction: BUY (inbound) or SELL (outbound)';
COMMENT ON TYPE call_off_status_enum IS 'Call-off workflow states from creation to completion';
COMMENT ON TYPE transport_order_status_enum IS 'Transport order lifecycle states';
COMMENT ON TYPE inventory_lot_status_enum IS 'Lot-level inventory status (25t units)';
COMMENT ON TYPE inventory_bundle_status_enum IS 'Bundle-level inventory status (1t units)';
COMMENT ON TYPE transport_mode_enum IS 'Transportation mode for shipments';
COMMENT ON TYPE milestone_event_enum IS 'Transport milestone event types';
COMMENT ON TYPE user_role_enum IS 'User access roles for business operations';