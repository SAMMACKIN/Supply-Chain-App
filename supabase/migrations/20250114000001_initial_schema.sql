-- Initial schema setup
BEGIN;

-- Create ENUMs
CREATE TYPE IF NOT EXISTS direction_enum AS ENUM ('BUY', 'SELL');
CREATE TYPE IF NOT EXISTS call_off_status_enum AS ENUM ('NEW', 'CONFIRMED', 'FULFILLED', 'CANCELLED');
CREATE TYPE IF NOT EXISTS transport_order_status_enum AS ENUM ('NEW', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE IF NOT EXISTS inventory_lot_status_enum AS ENUM ('INBOUND', 'ON_HAND', 'CLOSED');
CREATE TYPE IF NOT EXISTS inventory_bundle_status_enum AS ENUM ('RECEIPTED', 'ON_HAND', 'RESERVED', 'PICKED', 'SHIPPED', 'DELIVERED');
CREATE TYPE IF NOT EXISTS transport_mode_enum AS ENUM ('ROAD', 'SEA', 'RAIL', 'AIR');
CREATE TYPE IF NOT EXISTS milestone_event_enum AS ENUM ('DEP', 'ARR', 'POD', 'EXC');
CREATE TYPE IF NOT EXISTS user_role_enum AS ENUM ('OPS', 'TRADE', 'PLANNER', 'ADMIN');
CREATE TYPE IF NOT EXISTS shipment_line_status AS ENUM ('PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED');

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;