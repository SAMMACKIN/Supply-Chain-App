--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: call_off_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_off_status_enum AS ENUM (
    'NEW',
    'CONFIRMED',
    'FULFILLED',
    'CANCELLED'
);


--
-- Name: TYPE call_off_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.call_off_status_enum IS 'Call-off workflow states from creation to completion';


--
-- Name: direction_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.direction_enum AS ENUM (
    'BUY',
    'SELL'
);


--
-- Name: TYPE direction_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.direction_enum IS 'Trade direction: BUY (inbound) or SELL (outbound)';


--
-- Name: inventory_bundle_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_bundle_status_enum AS ENUM (
    'RECEIPTED',
    'ON_HAND',
    'RESERVED',
    'PICKED',
    'SHIPPED',
    'DELIVERED'
);


--
-- Name: TYPE inventory_bundle_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.inventory_bundle_status_enum IS 'Bundle-level inventory status (1t units)';


--
-- Name: inventory_lot_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_lot_status_enum AS ENUM (
    'INBOUND',
    'ON_HAND',
    'CLOSED'
);


--
-- Name: TYPE inventory_lot_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.inventory_lot_status_enum IS 'Lot-level inventory status (25t units)';


--
-- Name: milestone_event_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_event_enum AS ENUM (
    'DEP',
    'ARR',
    'POD',
    'EXC'
);


--
-- Name: TYPE milestone_event_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.milestone_event_enum IS 'Transport milestone event types';


--
-- Name: shipment_line_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shipment_line_status AS ENUM (
    'PLANNED',
    'READY',
    'PICKED',
    'SHIPPED',
    'DELIVERED'
);


--
-- Name: transport_mode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transport_mode_enum AS ENUM (
    'ROAD',
    'SEA',
    'RAIL',
    'AIR'
);


--
-- Name: TYPE transport_mode_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.transport_mode_enum IS 'Transportation mode for shipments';


--
-- Name: transport_order_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transport_order_status_enum AS ENUM (
    'NEW',
    'BOOKED',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED'
);


--
-- Name: TYPE transport_order_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.transport_order_status_enum IS 'Transport order lifecycle states';


--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_enum AS ENUM (
    'OPS',
    'TRADE',
    'PLANNER'
);


--
-- Name: TYPE user_role_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.user_role_enum IS 'User access roles for business operations';


--
-- Name: audit_important_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_important_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Log call-off status changes
  IF TG_TABLE_NAME = 'call_off' AND TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      -- Could insert into an audit log table here
      -- For now, we'll use PostgreSQL's built-in logging
      RAISE NOTICE 'Call-off % status changed from % to % by user %', 
        NEW.call_off_number, OLD.status, NEW.status, NEW.updated_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_call_off_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_call_off_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  formatted_num TEXT;
BEGIN
  -- Extract year from current date
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year with row locking to prevent conflicts
  SELECT COALESCE(MAX(
    CASE 
      WHEN call_off_number ~ ('^CO-' || year_part || '-[0-9]+$')
      THEN CAST(SUBSTRING(call_off_number FROM LENGTH('CO-' || year_part || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM call_off
  FOR UPDATE; -- Lock to prevent concurrent conflicts
  
  -- Format sequence number with leading zeros
  formatted_num := LPAD(sequence_num::TEXT, 4, '0');
  
  -- Return formatted call-off number
  RETURN 'CO-' || year_part || '-' || formatted_num;
END;
$_$;


--
-- Name: FUNCTION generate_call_off_number(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_call_off_number() IS 'Generates sequential call-off numbers in CO-YYYY-NNNN format';


--
-- Name: get_user_business_unit_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_business_unit_id() RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT business_unit_id 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;


--
-- Name: FUNCTION get_user_business_unit_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_business_unit_id() IS 'Returns the business unit ID for the current authenticated user';


--
-- Name: get_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role() RETURNS public.user_role_enum
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT role 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;


--
-- Name: FUNCTION get_user_role(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_role() IS 'Returns the role (OPS, TRADE, PLANNER) for the current authenticated user';


--
-- Name: get_user_warehouse_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_warehouse_ids() RETURNS uuid[]
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT warehouse_ids 
  FROM user_profiles 
  WHERE user_id = auth.uid();
$$;


--
-- Name: FUNCTION get_user_warehouse_ids(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_warehouse_ids() IS 'Returns array of warehouse IDs that the current user can access';


--
-- Name: trigger_generate_call_off_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_generate_call_off_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only generate if call_off_number is NULL or empty
  IF NEW.call_off_number IS NULL OR NEW.call_off_number = '' THEN
    NEW.call_off_number := generate_call_off_number();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: user_can_access_warehouse(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_can_access_warehouse(warehouse_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT 
    CASE 
      WHEN user_has_ops_role() THEN TRUE  -- OPS can access all warehouses
      ELSE warehouse_id = ANY(get_user_warehouse_ids())  -- Others need explicit access
    END;
$$;


--
-- Name: FUNCTION user_can_access_warehouse(warehouse_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.user_can_access_warehouse(warehouse_id uuid) IS 'Returns true if current user can access the specified warehouse';


--
-- Name: user_has_ops_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_ops_role() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'OPS'
  );
$$;


--
-- Name: FUNCTION user_has_ops_role(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.user_has_ops_role() IS 'Returns true if current user has OPS role';


--
-- Name: user_has_planner_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_planner_role() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'PLANNER'
  );
$$;


--
-- Name: FUNCTION user_has_planner_role(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.user_has_planner_role() IS 'Returns true if current user has PLANNER role';


--
-- Name: user_has_trade_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_trade_role() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'TRADE'
  );
$$;


--
-- Name: FUNCTION user_has_trade_role(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.user_has_trade_role() IS 'Returns true if current user has TRADE role';


--
-- Name: validate_business_rules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_business_rules() RETURNS TABLE(table_name text, constraint_name text, validation_status text, error_count integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: FUNCTION validate_business_rules(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_business_rules() IS 'Validates complex business rules across multiple tables';


--
-- Name: validate_call_off_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_call_off_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only validate on updates, not inserts
  IF TG_OP = 'UPDATE' THEN
    -- Validate status transition rules
    CASE OLD.status
      WHEN 'NEW' THEN
        -- NEW can transition to CONFIRMED or CANCELLED
        IF NEW.status NOT IN ('NEW', 'CONFIRMED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid status transition from NEW to %', NEW.status;
        END IF;
        
      WHEN 'CONFIRMED' THEN
        -- CONFIRMED can transition to FULFILLED or CANCELLED
        IF NEW.status NOT IN ('CONFIRMED', 'FULFILLED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid status transition from CONFIRMED to %', NEW.status;
        END IF;
        
      WHEN 'FULFILLED' THEN
        -- FULFILLED is terminal - no transitions allowed
        IF NEW.status != 'FULFILLED' THEN
          RAISE EXCEPTION 'Cannot change status from FULFILLED to %', NEW.status;
        END IF;
        
      WHEN 'CANCELLED' THEN
        -- CANCELLED is terminal - no transitions allowed  
        IF NEW.status != 'CANCELLED' THEN
          RAISE EXCEPTION 'Cannot change status from CANCELLED to %', NEW.status;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_call_off_status_transition(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_call_off_status_transition() IS 'Enforces valid call-off status state machine transitions';


--
-- Name: validate_calloff_direction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_calloff_direction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: validate_inventory_bundle_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_inventory_bundle_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only validate on updates, not inserts
  IF TG_OP = 'UPDATE' THEN
    -- Validate inventory bundle status transition rules
    CASE OLD.status
      WHEN 'RECEIPTED' THEN
        -- RECEIPTED can transition to ON_HAND
        IF NEW.status NOT IN ('RECEIPTED', 'ON_HAND') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from RECEIPTED to %', NEW.status;
        END IF;
        
      WHEN 'ON_HAND' THEN
        -- ON_HAND can transition to RESERVED or SHIPPED
        IF NEW.status NOT IN ('ON_HAND', 'RESERVED', 'SHIPPED') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from ON_HAND to %', NEW.status;
        END IF;
        
      WHEN 'RESERVED' THEN
        -- RESERVED can transition back to ON_HAND or forward to SHIPPED
        IF NEW.status NOT IN ('RESERVED', 'ON_HAND', 'SHIPPED') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from RESERVED to %', NEW.status;
        END IF;
        
      WHEN 'SHIPPED' THEN
        -- SHIPPED can only transition to DELIVERED
        IF NEW.status NOT IN ('SHIPPED', 'DELIVERED') THEN
          RAISE EXCEPTION 'Invalid inventory status transition from SHIPPED to %', NEW.status;
        END IF;
        
      WHEN 'DELIVERED' THEN
        -- DELIVERED is terminal
        IF NEW.status != 'DELIVERED' THEN
          RAISE EXCEPTION 'Cannot change inventory status from DELIVERED to %', NEW.status;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_inventory_bundle_status_transition(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_inventory_bundle_status_transition() IS 'Enforces valid inventory bundle status state machine transitions';


--
-- Name: validate_shipment_line_metal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_shipment_line_metal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: validate_shipment_line_quantities(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_shipment_line_quantities() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  total_planned INTEGER;
  calloff_total INTEGER;
BEGIN
  -- Get the call-off total bundle quantity
  SELECT bundle_qty INTO calloff_total
  FROM call_off 
  WHERE call_off_id = NEW.call_off_id;
  
  -- Calculate total planned quantities for this call-off (including the current change)
  SELECT COALESCE(SUM(
    CASE 
      WHEN shipment_line_id = NEW.shipment_line_id THEN NEW.bundle_qty
      ELSE bundle_qty
    END
  ), 0)
  INTO total_planned
  FROM call_off_shipment_line 
  WHERE call_off_id = NEW.call_off_id;
  
  -- Check if total planned exceeds call-off quantity
  IF total_planned > calloff_total THEN
    RAISE EXCEPTION 'Total shipment line quantities (%) cannot exceed call-off quantity (%)', 
      total_planned, calloff_total;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_shipment_line_quantities(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_shipment_line_quantities() IS 'Ensures shipment line quantities do not exceed call-off total';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: business_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code character varying(10) NOT NULL,
    region character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_business_unit_code_format CHECK (((code)::text ~ '^[A-Z0-9]{2,10}$'::text)),
    CONSTRAINT chk_business_unit_name_length CHECK (((length(name) >= 3) AND (length(name) <= 100))),
    CONSTRAINT chk_business_unit_region_format CHECK (((region IS NULL) OR (((length((region)::text) >= 2) AND (length((region)::text) <= 20)) AND ((region)::text ~ '^[A-Za-z\s]+$'::text))))
);


--
-- Name: call_off; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_off (
    call_off_id uuid DEFAULT gen_random_uuid() NOT NULL,
    quota_id uuid NOT NULL,
    call_off_number text NOT NULL,
    status public.call_off_status_enum DEFAULT 'NEW'::public.call_off_status_enum NOT NULL,
    bundle_qty integer NOT NULL,
    requested_delivery_date date,
    counterparty_id uuid NOT NULL,
    direction public.direction_enum NOT NULL,
    incoterm_code character(3),
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    fulfilled_at timestamp with time zone,
    cancellation_reason text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT call_off_bundle_qty_check CHECK (((bundle_qty > 0) AND (bundle_qty <= 10000))),
    CONSTRAINT call_off_requested_delivery_date_check CHECK ((requested_delivery_date >= CURRENT_DATE)),
    CONSTRAINT chk_call_off_number_pattern CHECK ((call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$'::text)),
    CONSTRAINT chk_calloff_bundle_qty_range CHECK (((bundle_qty > 0) AND (bundle_qty <= 10000))),
    CONSTRAINT chk_calloff_delivery_reasonable CHECK (((requested_delivery_date IS NULL) OR (requested_delivery_date >= '2020-01-01'::date))),
    CONSTRAINT chk_calloff_number_pattern CHECK (((call_off_number IS NULL) OR (call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$'::text))),
    CONSTRAINT chk_cancellation_reason_with_status CHECK ((((status = 'CANCELLED'::public.call_off_status_enum) AND (cancellation_reason IS NOT NULL)) OR ((status <> 'CANCELLED'::public.call_off_status_enum) AND (cancellation_reason IS NULL)) OR ((status = 'CANCELLED'::public.call_off_status_enum) AND (cancellation_reason IS NULL)))),
    CONSTRAINT chk_cancelled_after_created CHECK (((cancelled_at IS NULL) OR (cancelled_at >= created_at))),
    CONSTRAINT chk_confirmed_after_created CHECK (((confirmed_at IS NULL) OR (confirmed_at >= created_at))),
    CONSTRAINT chk_fulfilled_after_confirmed CHECK (((fulfilled_at IS NULL) OR ((confirmed_at IS NOT NULL) AND (fulfilled_at >= confirmed_at)))),
    CONSTRAINT chk_fulfilled_at_with_status CHECK ((((status = 'FULFILLED'::public.call_off_status_enum) AND (fulfilled_at IS NOT NULL)) OR ((status <> 'FULFILLED'::public.call_off_status_enum) AND (fulfilled_at IS NULL)))),
    CONSTRAINT chk_single_completion CHECK ((((cancelled_at IS NULL) AND (fulfilled_at IS NULL)) OR ((cancelled_at IS NOT NULL) AND (fulfilled_at IS NULL)) OR ((cancelled_at IS NULL) AND (fulfilled_at IS NOT NULL))))
);


--
-- Name: TABLE call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.call_off IS 'Call-off table with RLS enabled - BU-scoped access based on user role';


--
-- Name: COLUMN call_off.call_off_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.call_off_id IS 'Unique call-off identifier';


--
-- Name: COLUMN call_off.quota_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.quota_id IS 'Parent quota reference';


--
-- Name: COLUMN call_off.call_off_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.call_off_number IS 'Human-readable identifier (CO-YYYY-NNNN)';


--
-- Name: COLUMN call_off.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.status IS 'Workflow state (NEW → CONFIRMED → FULFILLED/CANCELLED)';


--
-- Name: COLUMN call_off.bundle_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.bundle_qty IS 'Quantity in 1-tonne bundles';


--
-- Name: COLUMN call_off.requested_delivery_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.requested_delivery_date IS 'Customer requested delivery date';


--
-- Name: COLUMN call_off.counterparty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.counterparty_id IS 'Cached from quota for performance';


--
-- Name: COLUMN call_off.direction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.direction IS 'Cached from quota for performance';


--
-- Name: COLUMN call_off.incoterm_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.incoterm_code IS 'Cached from quota for performance';


--
-- Name: COLUMN call_off.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.created_by IS 'User who created the call-off';


--
-- Name: COLUMN call_off.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.created_at IS 'Call-off creation timestamp';


--
-- Name: COLUMN call_off.confirmed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.confirmed_at IS 'When call-off was confirmed';


--
-- Name: COLUMN call_off.cancelled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.cancelled_at IS 'When call-off was cancelled';


--
-- Name: COLUMN call_off.fulfilled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.fulfilled_at IS 'Timestamp when call-off was fulfilled (final delivery completed)';


--
-- Name: COLUMN call_off.cancellation_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off.cancellation_reason IS 'Optional reason provided when call-off was cancelled';


--
-- Name: CONSTRAINT chk_calloff_number_pattern ON call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_calloff_number_pattern ON public.call_off IS 'Ensures call-off numbers follow CO-YYYY-NNNN pattern';


--
-- Name: call_off_shipment_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_off_shipment_line (
    shipment_line_id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_off_id uuid NOT NULL,
    transport_order_id uuid,
    bundle_qty integer NOT NULL,
    metal_code character varying(12) NOT NULL,
    destination_party_id uuid,
    expected_ship_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivery_location character varying(255),
    requested_delivery_date date,
    notes text,
    status public.shipment_line_status DEFAULT 'PLANNED'::public.shipment_line_status,
    CONSTRAINT call_off_shipment_line_bundle_qty_check CHECK (((bundle_qty > 0) AND (bundle_qty <= 10000))),
    CONSTRAINT chk_ship_date_future CHECK (((expected_ship_date IS NULL) OR (expected_ship_date >= CURRENT_DATE))),
    CONSTRAINT chk_shipment_line_bundle_qty_range CHECK (((bundle_qty > 0) AND (bundle_qty <= 10000))),
    CONSTRAINT chk_shipment_line_ship_date_reasonable CHECK (((expected_ship_date IS NULL) OR (expected_ship_date >= '2020-01-01'::date)))
);


--
-- Name: TABLE call_off_shipment_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.call_off_shipment_line IS 'Shipment lines with RLS enabled - inherits call-off permissions';


--
-- Name: COLUMN call_off_shipment_line.shipment_line_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.shipment_line_id IS 'Unique shipment line identifier';


--
-- Name: COLUMN call_off_shipment_line.call_off_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.call_off_id IS 'Parent call-off reference';


--
-- Name: COLUMN call_off_shipment_line.transport_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.transport_order_id IS 'Assigned transport order (NULL until planned)';


--
-- Name: COLUMN call_off_shipment_line.bundle_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.bundle_qty IS 'Quantity to ship in 1-tonne bundles';


--
-- Name: COLUMN call_off_shipment_line.metal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.metal_code IS 'Metal type (defaults from quota)';


--
-- Name: COLUMN call_off_shipment_line.destination_party_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.destination_party_id IS 'Customer or distribution center';


--
-- Name: COLUMN call_off_shipment_line.expected_ship_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.expected_ship_date IS 'Planned shipment date';


--
-- Name: COLUMN call_off_shipment_line.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.created_at IS 'Record creation timestamp';


--
-- Name: COLUMN call_off_shipment_line.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_off_shipment_line.updated_at IS 'Last modification timestamp';


--
-- Name: counterparty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.counterparty (
    counterparty_id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name character varying(200) NOT NULL,
    company_code character varying(20) NOT NULL,
    primary_contact_name character varying(100),
    primary_contact_email character varying(100),
    primary_contact_phone character varying(30),
    address_line_1 character varying(200),
    address_line_2 character varying(200),
    city character varying(100),
    state_province character varying(100),
    postal_code character varying(20),
    country_code character(2) NOT NULL,
    counterparty_type character varying(20) NOT NULL,
    tax_id character varying(50),
    credit_rating character varying(10),
    default_currency character(3) DEFAULT 'USD'::bpchar,
    payment_terms_days integer DEFAULT 30,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT counterparty_counterparty_type_check CHECK (((counterparty_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'BOTH'::character varying])::text[])))
);


--
-- Name: inventory_bundle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_bundle (
    bundle_id uuid DEFAULT gen_random_uuid() NOT NULL,
    lot_id uuid NOT NULL,
    weight_kg numeric(9,3) DEFAULT 1000.000 NOT NULL,
    warehouse_id uuid NOT NULL,
    bin_location text,
    status public.inventory_bundle_status_enum DEFAULT 'RECEIPTED'::public.inventory_bundle_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_bin_location_format CHECK (((bin_location IS NULL) OR ((length(bin_location) >= 1) AND (length(bin_location) <= 50)))),
    CONSTRAINT chk_bundle_bin_location_format CHECK (((bin_location IS NULL) OR (((length(bin_location) >= 1) AND (length(bin_location) <= 50)) AND (bin_location ~ '^[A-Z0-9\-]+$'::text)))),
    CONSTRAINT chk_bundle_weight_tolerance_strict CHECK (((weight_kg >= 950.000) AND (weight_kg <= 1050.000))),
    CONSTRAINT inventory_bundle_weight_kg_check CHECK (((weight_kg >= 950.000) AND (weight_kg <= 1050.000)))
);


--
-- Name: TABLE inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventory_bundle IS 'Inventory bundles with RLS enabled - warehouse and BU scoped';


--
-- Name: COLUMN inventory_bundle.bundle_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.bundle_id IS 'Unique bundle identifier (1t unit)';


--
-- Name: COLUMN inventory_bundle.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.lot_id IS 'Parent lot reference (25t)';


--
-- Name: COLUMN inventory_bundle.weight_kg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.weight_kg IS 'Actual weight with ±5% tolerance of 1000kg';


--
-- Name: COLUMN inventory_bundle.warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.warehouse_id IS '3PL distribution center reference';


--
-- Name: COLUMN inventory_bundle.bin_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.bin_location IS 'Zone/bin location within warehouse';


--
-- Name: COLUMN inventory_bundle.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.status IS 'Bundle lifecycle status';


--
-- Name: COLUMN inventory_bundle.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.created_at IS 'Record creation timestamp';


--
-- Name: COLUMN inventory_bundle.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_bundle.updated_at IS 'Last modification timestamp';


--
-- Name: CONSTRAINT chk_bundle_weight_tolerance_strict ON inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_bundle_weight_tolerance_strict ON public.inventory_bundle IS 'Enforces ±5% weight tolerance around 1000kg standard';


--
-- Name: inventory_lot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_lot (
    lot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    metal_code character varying(12) NOT NULL,
    purity_pct numeric(5,2) NOT NULL,
    manufactured_on date NOT NULL,
    certificate_url text,
    status public.inventory_lot_status_enum DEFAULT 'INBOUND'::public.inventory_lot_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_lot_certificate_url_format CHECK (((certificate_url IS NULL) OR (certificate_url ~ '^https?://'::text))),
    CONSTRAINT chk_lot_manufactured_date CHECK (((manufactured_on >= '2020-01-01'::date) AND (manufactured_on <= (CURRENT_DATE + '30 days'::interval)))),
    CONSTRAINT chk_lot_manufactured_date_range_business CHECK (((manufactured_on >= '2020-01-01'::date) AND (manufactured_on <= '2030-12-31'::date))),
    CONSTRAINT chk_lot_metal_code_format CHECK (((metal_code)::text ~ '^[A-Z0-9]{2,12}$'::text)),
    CONSTRAINT chk_lot_purity_realistic_range CHECK (((purity_pct >= 80.00) AND (purity_pct <= 99.99))),
    CONSTRAINT inventory_lot_purity_pct_check CHECK (((purity_pct >= 80.00) AND (purity_pct <= 99.99)))
);


--
-- Name: TABLE inventory_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventory_lot IS 'Inventory lots with RLS enabled - supplier and BU scoped';


--
-- Name: COLUMN inventory_lot.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.lot_id IS 'Unique lot identifier (25t unit)';


--
-- Name: COLUMN inventory_lot.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.supplier_id IS 'Manufacturing supplier reference';


--
-- Name: COLUMN inventory_lot.metal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.metal_code IS 'Metal type code (CU, AL, NI, etc.)';


--
-- Name: COLUMN inventory_lot.purity_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.purity_pct IS 'Metal purity percentage (80.00-99.99)';


--
-- Name: COLUMN inventory_lot.manufactured_on; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.manufactured_on IS 'Manufacturing/production date';


--
-- Name: COLUMN inventory_lot.certificate_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.certificate_url IS 'Quality certificate storage path';


--
-- Name: COLUMN inventory_lot.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.status IS 'Lot-level status (INBOUND → ON_HAND → CLOSED)';


--
-- Name: COLUMN inventory_lot.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.created_at IS 'Record creation timestamp';


--
-- Name: COLUMN inventory_lot.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_lot.updated_at IS 'Last modification timestamp';


--
-- Name: quota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quota (
    quota_id uuid NOT NULL,
    counterparty_id uuid NOT NULL,
    direction public.direction_enum NOT NULL,
    period_month date NOT NULL,
    qty_t numeric(12,3) NOT NULL,
    tolerance_pct numeric(4,2),
    incoterm_code character(3),
    metal_code character varying(12) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    business_unit_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440001'::uuid NOT NULL,
    CONSTRAINT chk_quota_incoterm_format CHECK (((incoterm_code IS NULL) OR (incoterm_code ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT chk_quota_metal_code_format CHECK (((metal_code)::text ~ '^[A-Z0-9]{2,12}$'::text)),
    CONSTRAINT chk_quota_period_first_day CHECK ((EXTRACT(day FROM period_month) = (1)::numeric)),
    CONSTRAINT chk_quota_period_range CHECK (((period_month >= '2020-01-01'::date) AND (period_month <= '2030-12-01'::date))),
    CONSTRAINT chk_quota_period_range_business CHECK (((period_month >= '2020-01-01'::date) AND (period_month <= '2030-12-01'::date))),
    CONSTRAINT chk_quota_qty_positive CHECK ((qty_t > (0)::numeric)),
    CONSTRAINT chk_quota_tolerance_range CHECK (((tolerance_pct IS NULL) OR ((tolerance_pct >= (0)::numeric) AND (tolerance_pct <= 50.0)))),
    CONSTRAINT quota_period_month_check CHECK ((EXTRACT(day FROM period_month) = (1)::numeric)),
    CONSTRAINT quota_qty_t_check CHECK ((qty_t > (0)::numeric)),
    CONSTRAINT quota_tolerance_pct_check CHECK (((tolerance_pct >= (0)::numeric) AND (tolerance_pct <= (100)::numeric)))
);


--
-- Name: TABLE quota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quota IS 'Quota table with seed data for development testing - covers multiple metals, business units, periods, and tolerance scenarios';


--
-- Name: COLUMN quota.quota_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.quota_id IS 'Primary key matching Titan quota identifier';


--
-- Name: COLUMN quota.counterparty_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.counterparty_id IS 'Trading partner/customer UUID';


--
-- Name: COLUMN quota.direction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.direction IS 'BUY (purchase) or SELL (sales) quota';


--
-- Name: COLUMN quota.period_month; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.period_month IS 'Monthly bucket (first day of month)';


--
-- Name: COLUMN quota.qty_t; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.qty_t IS 'Contract quantity in metric tonnes';


--
-- Name: COLUMN quota.tolerance_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.tolerance_pct IS 'Allowed over/under percentage (0-100)';


--
-- Name: COLUMN quota.incoterm_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.incoterm_code IS 'International commercial terms (FOB, CIF, etc.)';


--
-- Name: COLUMN quota.metal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.metal_code IS 'Metal type code (CU, AL, NI, ZN, etc.)';


--
-- Name: COLUMN quota.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quota.created_at IS 'Record creation timestamp';


--
-- Name: CONSTRAINT chk_quota_period_first_day ON quota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_quota_period_first_day ON public.quota IS 'Ensures period_month is always first day of month for consistency';


--
-- Name: transport_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_order (
    transport_order_id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrier_id uuid,
    booking_reference text,
    mode public.transport_mode_enum DEFAULT 'ROAD'::public.transport_mode_enum NOT NULL,
    equipment_type character varying(20),
    gross_weight_t numeric(12,3),
    status public.transport_order_status_enum DEFAULT 'NEW'::public.transport_order_status_enum NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_transport_booking_format CHECK (((booking_reference IS NULL) OR (((length(booking_reference) >= 3) AND (length(booking_reference) <= 50)) AND (booking_reference ~ '^[A-Z0-9\-]+$'::text)))),
    CONSTRAINT chk_transport_equipment_format CHECK (((equipment_type IS NULL) OR (((length((equipment_type)::text) >= 3) AND (length((equipment_type)::text) <= 20)) AND ((equipment_type)::text ~ '^[A-Z0-9\-\s]+$'::text)))),
    CONSTRAINT chk_transport_gross_weight_positive CHECK (((gross_weight_t IS NULL) OR (gross_weight_t > (0)::numeric))),
    CONSTRAINT transport_order_gross_weight_t_check CHECK ((gross_weight_t > (0)::numeric))
);


--
-- Name: TABLE transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transport_order IS 'Transport orders with RLS enabled - OPS role with BU scope';


--
-- Name: COLUMN transport_order.transport_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.transport_order_id IS 'Unique transport order identifier';


--
-- Name: COLUMN transport_order.carrier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.carrier_id IS 'Transport service provider';


--
-- Name: COLUMN transport_order.booking_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.booking_reference IS 'External booking reference (Transporeon, etc.)';


--
-- Name: COLUMN transport_order.mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.mode IS 'Transport mode (ROAD, SEA, RAIL, AIR)';


--
-- Name: COLUMN transport_order.equipment_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.equipment_type IS 'Vehicle/container type description';


--
-- Name: COLUMN transport_order.gross_weight_t; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.gross_weight_t IS 'Total weight including packaging';


--
-- Name: COLUMN transport_order.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.status IS 'Transport order status';


--
-- Name: COLUMN transport_order.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.created_by IS 'User who created the transport order';


--
-- Name: COLUMN transport_order.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.created_at IS 'Creation timestamp';


--
-- Name: COLUMN transport_order.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transport_order.updated_at IS 'Last modification timestamp';


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_unit_id uuid NOT NULL,
    role public.user_role_enum NOT NULL,
    warehouse_ids uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_user_profiles_warehouse_ids_not_empty CHECK (((warehouse_ids IS NULL) OR (array_length(warehouse_ids, 1) > 0)))
);


--
-- Name: TABLE user_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_profiles IS 'User profiles with business unit and role assignments for RLS';


--
-- Name: COLUMN user_profiles.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.user_id IS 'References auth.users(id) - one profile per user';


--
-- Name: COLUMN user_profiles.business_unit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.business_unit_id IS 'Business unit for multi-tenant isolation';


--
-- Name: COLUMN user_profiles.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.role IS 'User role: OPS, TRADE, or PLANNER';


--
-- Name: COLUMN user_profiles.warehouse_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.warehouse_ids IS 'Array of warehouse UUIDs for 3PL users';


--
-- Name: v_atp_inventory; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_atp_inventory AS
 SELECT ib.warehouse_id,
    il.metal_code,
    il.supplier_id,
    count(ib.bundle_id) FILTER (WHERE (ib.status = 'ON_HAND'::public.inventory_bundle_status_enum)) AS available_bundles,
    (sum(ib.weight_kg) FILTER (WHERE (ib.status = 'ON_HAND'::public.inventory_bundle_status_enum)) / 1000.0) AS available_tonnes,
    count(ib.bundle_id) FILTER (WHERE (ib.status = 'RESERVED'::public.inventory_bundle_status_enum)) AS reserved_bundles,
    (sum(ib.weight_kg) FILTER (WHERE (ib.status = 'RESERVED'::public.inventory_bundle_status_enum)) / 1000.0) AS reserved_tonnes,
    count(ib.bundle_id) FILTER (WHERE (ib.status = ANY (ARRAY['ON_HAND'::public.inventory_bundle_status_enum, 'RESERVED'::public.inventory_bundle_status_enum]))) AS onsite_bundles,
    (sum(ib.weight_kg) FILTER (WHERE (ib.status = ANY (ARRAY['ON_HAND'::public.inventory_bundle_status_enum, 'RESERVED'::public.inventory_bundle_status_enum]))) / 1000.0) AS onsite_tonnes,
    avg(il.purity_pct) FILTER (WHERE (ib.status = 'ON_HAND'::public.inventory_bundle_status_enum)) AS avg_available_purity,
    min(il.manufactured_on) FILTER (WHERE (ib.status = 'ON_HAND'::public.inventory_bundle_status_enum)) AS oldest_available_date,
    max(il.manufactured_on) FILTER (WHERE (ib.status = 'ON_HAND'::public.inventory_bundle_status_enum)) AS newest_available_date
   FROM (public.inventory_lot il
     JOIN public.inventory_bundle ib ON ((il.lot_id = ib.lot_id)))
  WHERE (ib.status = ANY (ARRAY['ON_HAND'::public.inventory_bundle_status_enum, 'RESERVED'::public.inventory_bundle_status_enum]))
  GROUP BY ib.warehouse_id, il.metal_code, il.supplier_id;


--
-- Name: VIEW v_atp_inventory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_atp_inventory IS 'Available-to-Promise inventory for allocation decisions';


--
-- Name: v_bundle_availability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_bundle_availability AS
 SELECT ib.bundle_id,
    ib.lot_id,
    ib.weight_kg,
    ib.warehouse_id,
    ib.bin_location,
    ib.status,
    ib.created_at,
    ib.updated_at,
    il.supplier_id,
    il.metal_code,
    il.purity_pct,
    il.manufactured_on,
    il.certificate_url,
    il.status AS lot_status,
        CASE
            WHEN (ib.status = 'ON_HAND'::public.inventory_bundle_status_enum) THEN true
            ELSE false
        END AS is_available,
    (CURRENT_DATE - il.manufactured_on) AS age_days,
    (ib.weight_kg - 1000.000) AS weight_variance_kg,
    (((ib.weight_kg - 1000.000) / 1000.000) * (100)::numeric) AS weight_variance_pct
   FROM (public.inventory_bundle ib
     JOIN public.inventory_lot il ON ((ib.lot_id = il.lot_id)));


--
-- Name: VIEW v_bundle_availability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_bundle_availability IS 'Bundle availability with lot details and calculated fields for inventory management';


--
-- Name: v_call_off_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_call_off_performance AS
 SELECT date_trunc('month'::text, co.created_at) AS month,
    q.business_unit_id,
    co.direction,
    q.metal_code,
    co.status,
    count(*) AS call_off_count,
    sum(co.bundle_qty) AS total_bundles,
    ((sum(co.bundle_qty))::numeric * 1.0) AS total_tonnes,
    avg(co.bundle_qty) AS avg_bundle_qty_per_calloff,
    avg(EXTRACT(days FROM (COALESCE(co.confirmed_at, CURRENT_TIMESTAMP) - co.created_at))) AS avg_processing_days,
    min(EXTRACT(days FROM (COALESCE(co.confirmed_at, CURRENT_TIMESTAMP) - co.created_at))) AS min_processing_days,
    max(EXTRACT(days FROM (COALESCE(co.confirmed_at, CURRENT_TIMESTAMP) - co.created_at))) AS max_processing_days,
    count(*) FILTER (WHERE (co.requested_delivery_date IS NOT NULL)) AS delivery_scheduled_count,
    count(*) FILTER (WHERE ((co.requested_delivery_date < CURRENT_DATE) AND (co.status <> 'FULFILLED'::public.call_off_status_enum))) AS overdue_count,
    avg(( SELECT count(*) AS count
           FROM public.call_off_shipment_line csl
          WHERE (csl.call_off_id = co.call_off_id))) AS avg_shipment_lines_per_calloff
   FROM (public.call_off co
     JOIN public.quota q ON ((co.quota_id = q.quota_id)))
  GROUP BY (date_trunc('month'::text, co.created_at)), q.business_unit_id, co.direction, q.metal_code, co.status;


--
-- Name: VIEW v_call_off_performance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_call_off_performance IS 'Call-off workflow performance metrics by month and business unit';


--
-- Name: v_call_off_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_call_off_summary AS
 SELECT co.call_off_id,
    co.call_off_number,
    co.status,
    co.bundle_qty,
    co.requested_delivery_date,
    co.counterparty_id,
    co.direction,
    co.incoterm_code,
    co.created_by,
    co.created_at,
    co.confirmed_at,
    co.cancelled_at,
    q.quota_id,
    q.period_month,
    q.qty_t AS quota_qty_tonnes,
    q.tolerance_pct,
    q.metal_code,
    q.business_unit_id,
    count(csl.shipment_line_id) AS shipment_line_count,
    COALESCE(sum(csl.bundle_qty), (0)::bigint) AS planned_bundle_qty,
    (co.bundle_qty - COALESCE(sum(csl.bundle_qty), (0)::bigint)) AS unplanned_bundle_qty,
        CASE
            WHEN (co.bundle_qty = COALESCE(sum(csl.bundle_qty), (0)::bigint)) THEN 'FULLY_PLANNED'::text
            WHEN (COALESCE(sum(csl.bundle_qty), (0)::bigint) > 0) THEN 'PARTIALLY_PLANNED'::text
            ELSE 'NOT_PLANNED'::text
        END AS planning_status,
    count(DISTINCT csl.transport_order_id) FILTER (WHERE (csl.transport_order_id IS NOT NULL)) AS transport_order_count
   FROM ((public.call_off co
     JOIN public.quota q ON ((co.quota_id = q.quota_id)))
     LEFT JOIN public.call_off_shipment_line csl ON ((co.call_off_id = csl.call_off_id)))
  GROUP BY co.call_off_id, co.call_off_number, co.status, co.bundle_qty, co.requested_delivery_date, co.counterparty_id, co.direction, co.incoterm_code, co.created_by, co.created_at, co.confirmed_at, co.cancelled_at, q.quota_id, q.period_month, q.qty_t, q.tolerance_pct, q.metal_code, q.business_unit_id;


--
-- Name: VIEW v_call_off_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_call_off_summary IS 'Comprehensive call-off view with quota details and shipment planning status';


--
-- Name: v_executive_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_executive_dashboard AS
 SELECT q.business_unit_id,
    q.period_month,
    count(DISTINCT q.quota_id) AS quota_count,
    sum(q.qty_t) AS total_quota_tonnes,
    count(DISTINCT q.counterparty_id) AS active_counterparty_count,
    count(DISTINCT q.metal_code) AS active_metal_count,
    count(DISTINCT co.call_off_id) AS call_off_count,
    sum(co.bundle_qty) FILTER (WHERE (co.status = 'FULFILLED'::public.call_off_status_enum)) AS fulfilled_bundles,
    sum(co.bundle_qty) FILTER (WHERE (co.status = 'CONFIRMED'::public.call_off_status_enum)) AS confirmed_bundles,
    sum(co.bundle_qty) FILTER (WHERE (co.status = 'NEW'::public.call_off_status_enum)) AS new_bundles,
    round(avg(EXTRACT(days FROM (co.confirmed_at - co.created_at))) FILTER (WHERE ((co.status = 'FULFILLED'::public.call_off_status_enum) AND (co.confirmed_at IS NOT NULL))), 1) AS avg_fulfillment_days,
    round((((sum(co.bundle_qty) FILTER (WHERE (co.status = ANY (ARRAY['CONFIRMED'::public.call_off_status_enum, 'FULFILLED'::public.call_off_status_enum]))))::numeric / sum(q.qty_t)) * (100)::numeric), 2) AS quota_utilization_pct
   FROM (public.quota q
     LEFT JOIN public.call_off co ON ((q.quota_id = co.quota_id)))
  GROUP BY q.business_unit_id, q.period_month;


--
-- Name: VIEW v_executive_dashboard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_executive_dashboard IS 'High-level business metrics for executive reporting';


--
-- Name: v_inventory_position; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_inventory_position AS
 SELECT ib.warehouse_id,
    il.metal_code,
    il.supplier_id,
    ib.status,
    count(DISTINCT il.lot_id) AS lot_count,
    min(il.manufactured_on) AS oldest_manufacture_date,
    max(il.manufactured_on) AS newest_manufacture_date,
    avg(il.purity_pct) AS avg_purity_pct,
    count(ib.bundle_id) AS bundle_count,
    sum(ib.weight_kg) AS total_weight_kg,
    (sum(ib.weight_kg) / 1000.0) AS total_weight_tonnes,
    avg(ib.weight_kg) AS avg_bundle_weight_kg,
    min(ib.weight_kg) AS min_bundle_weight_kg,
    max(ib.weight_kg) AS max_bundle_weight_kg,
    stddev(ib.weight_kg) AS weight_stddev,
    count(ib.bundle_id) FILTER (WHERE (abs((ib.weight_kg - 1000.0)) > 50.0)) AS variance_bundle_count,
    count(ib.bundle_id) FILTER (WHERE (il.manufactured_on < (CURRENT_DATE - '6 mons'::interval))) AS aged_bundle_count,
    count(ib.bundle_id) FILTER (WHERE (il.manufactured_on < (CURRENT_DATE - '1 year'::interval))) AS old_bundle_count,
    min(ib.created_at) AS earliest_receipt,
    max(ib.updated_at) AS latest_update
   FROM (public.inventory_lot il
     JOIN public.inventory_bundle ib ON ((il.lot_id = ib.lot_id)))
  GROUP BY ib.warehouse_id, il.metal_code, il.supplier_id, ib.status;


--
-- Name: VIEW v_inventory_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_inventory_position IS 'Inventory position by warehouse, metal, and status';


--
-- Name: v_quota_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_quota_balance AS
 SELECT q.quota_id,
    q.counterparty_id,
    q.period_month,
    q.metal_code,
    q.direction,
    q.business_unit_id,
    q.qty_t AS quota_qty_tonnes,
    q.tolerance_pct,
    q.incoterm_code,
    q.created_at,
    COALESCE(sum(co.bundle_qty) FILTER (WHERE (co.status = ANY (ARRAY['CONFIRMED'::public.call_off_status_enum, 'FULFILLED'::public.call_off_status_enum]))), (0)::bigint) AS consumed_bundles,
    COALESCE(sum(co.bundle_qty) FILTER (WHERE (co.status = 'NEW'::public.call_off_status_enum)), (0)::bigint) AS pending_bundles,
    COALESCE(sum(co.bundle_qty), (0)::bigint) AS total_committed_bundles,
    (q.qty_t - (COALESCE(sum(co.bundle_qty) FILTER (WHERE (co.status = ANY (ARRAY['CONFIRMED'::public.call_off_status_enum, 'FULFILLED'::public.call_off_status_enum]))), (0)::bigint))::numeric) AS remaining_qty_tonnes,
    (q.qty_t - (COALESCE(sum(co.bundle_qty), (0)::bigint))::numeric) AS uncommitted_qty_tonnes,
    round((((COALESCE(sum(co.bundle_qty) FILTER (WHERE (co.status = ANY (ARRAY['CONFIRMED'::public.call_off_status_enum, 'FULFILLED'::public.call_off_status_enum]))), (0)::bigint))::numeric / q.qty_t) * (100)::numeric), 2) AS utilization_pct,
    round((((COALESCE(sum(co.bundle_qty), (0)::bigint))::numeric / q.qty_t) * (100)::numeric), 2) AS commitment_pct,
    count(co.call_off_id) AS call_off_count,
    count(co.call_off_id) FILTER (WHERE (co.status = 'NEW'::public.call_off_status_enum)) AS new_call_off_count,
    count(co.call_off_id) FILTER (WHERE (co.status = 'CONFIRMED'::public.call_off_status_enum)) AS confirmed_call_off_count,
    count(co.call_off_id) FILTER (WHERE (co.status = 'FULFILLED'::public.call_off_status_enum)) AS fulfilled_call_off_count,
        CASE
            WHEN ((q.tolerance_pct IS NOT NULL) AND ((COALESCE(sum(co.bundle_qty), (0)::bigint))::numeric > (q.qty_t * ((1)::numeric + (q.tolerance_pct / (100)::numeric))))) THEN 'OVER_TOLERANCE'::text
            WHEN ((COALESCE(sum(co.bundle_qty), (0)::bigint))::numeric > q.qty_t) THEN 'OVER_QUOTA'::text
            ELSE 'WITHIN_LIMITS'::text
        END AS tolerance_status
   FROM (public.quota q
     LEFT JOIN public.call_off co ON ((q.quota_id = co.quota_id)))
  GROUP BY q.quota_id, q.counterparty_id, q.period_month, q.metal_code, q.direction, q.business_unit_id, q.qty_t, q.tolerance_pct, q.incoterm_code, q.created_at;


--
-- Name: VIEW v_quota_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_quota_balance IS 'Quota utilization and remaining capacity tracking';


--
-- Name: v_transport_utilization; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transport_utilization AS
 SELECT to_order.transport_order_id,
    to_order.booking_reference,
    to_order.mode,
    to_order.equipment_type,
    to_order.status,
    to_order.gross_weight_t,
    to_order.created_at,
    count(csl.shipment_line_id) AS shipment_line_count,
    sum(csl.bundle_qty) AS total_bundle_qty,
    ((sum(csl.bundle_qty))::numeric * 1.0) AS total_planned_tonnes,
        CASE
            WHEN ((to_order.gross_weight_t IS NOT NULL) AND (to_order.gross_weight_t > (0)::numeric)) THEN round(((((sum(csl.bundle_qty))::numeric * 1.0) / to_order.gross_weight_t) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS weight_utilization_pct,
        CASE
            WHEN (count(csl.shipment_line_id) = 0) THEN 'EMPTY'::text
            WHEN ((to_order.gross_weight_t IS NOT NULL) AND (((sum(csl.bundle_qty))::numeric * 1.0) >= (to_order.gross_weight_t * 0.95))) THEN 'FULL'::text
            ELSE 'PARTIAL'::text
        END AS utilization_status,
    count(DISTINCT csl.destination_party_id) AS destination_count,
    count(DISTINCT csl.metal_code) AS metal_code_count
   FROM (public.transport_order to_order
     LEFT JOIN public.call_off_shipment_line csl ON ((to_order.transport_order_id = csl.transport_order_id)))
  GROUP BY to_order.transport_order_id, to_order.booking_reference, to_order.mode, to_order.equipment_type, to_order.status, to_order.gross_weight_t, to_order.created_at;


--
-- Name: VIEW v_transport_utilization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_transport_utilization IS 'Transport order capacity utilization and planning efficiency';


--
-- Name: v_trigger_monitoring; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_trigger_monitoring AS
 SELECT n.nspname AS schemaname,
    c.relname AS tablename,
    t.tgname AS triggername,
    'TRIGGER'::text AS object_type,
        CASE
            WHEN (t.tgname ~~ '%updated_at%'::text) THEN 'TIMESTAMP_MAINTENANCE'::text
            WHEN (t.tgname ~~ '%generate%'::text) THEN 'AUTO_GENERATION'::text
            WHEN (t.tgname ~~ '%validate%'::text) THEN 'VALIDATION'::text
            WHEN (t.tgname ~~ '%audit%'::text) THEN 'AUDIT_LOGGING'::text
            ELSE 'OTHER'::text
        END AS trigger_category
   FROM ((pg_trigger t
     JOIN pg_class c ON ((t.tgrelid = c.oid)))
     JOIN pg_namespace n ON ((c.relnamespace = n.oid)))
  WHERE (n.nspname = 'public'::name)
  ORDER BY c.relname, t.tgname;


--
-- Name: VIEW v_trigger_monitoring; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_trigger_monitoring IS 'Monitoring view for all triggers in the public schema';


--
-- Data for Name: business_units; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_units (id, name, code, region, created_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440001	European Operations	EU	Europe	2025-07-12 12:52:33.994937+00
550e8400-e29b-41d4-a716-446655440002	Americas Trading	US	Americas	2025-07-12 12:52:33.994937+00
550e8400-e29b-41d4-a716-446655440003	Asia Pacific	APAC	Asia Pacific	2025-07-12 12:52:33.994937+00
\.


--
-- Data for Name: call_off; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.call_off (call_off_id, quota_id, call_off_number, status, bundle_qty, requested_delivery_date, counterparty_id, direction, incoterm_code, created_by, created_at, confirmed_at, cancelled_at, fulfilled_at, cancellation_reason, updated_at) FROM stdin;
a509ea6c-20d8-47e1-bb98-d5a39708e6ed	650e8400-e29b-41d4-a716-446655440019	CO-2025-5946	CANCELLED	254	2025-08-15	8914d95f-ca40-4458-844e-5e5b65953b36	SELL	FOB	00000000-0000-0000-0000-000000000000	2025-07-12 20:12:15.989934+00	\N	2025-07-12 20:45:41.772+00	\N	\N	2025-07-13 07:13:45.839922+00
969f71d1-f442-4769-8b01-1fece1bf3e2a	650e8400-e29b-41d4-a716-446655440011	CO-2025-1156	FULFILLED	100	\N	8914d95f-ca40-4458-844e-5e5b65953b36	BUY	CIF	00000000-0000-0000-0000-000000000000	2025-07-12 19:52:11.209419+00	2025-07-12 20:45:45.403+00	\N	2025-07-12 20:45:48.047+00	\N	2025-07-13 07:13:45.839922+00
aec23c3f-ca1a-4a6b-9e73-0544307b6859	650e8400-e29b-41d4-a716-446655440016	CO-2025-5305	NEW	100	2025-07-18	7cfe6c87-3d62-417b-9819-b85f1612aa12	SELL	FOB	00000000-0000-0000-0000-000000000000	2025-07-13 07:32:25.351836+00	\N	\N	\N	\N	2025-07-13 07:32:25.351836+00
5b28f267-4fbc-4c0c-b631-49854aeb8c5a	650e8400-e29b-41d4-a716-446655440012	CO-2025-5737	CONFIRMED	10	2025-07-25	7cfe6c87-3d62-417b-9819-b85f1612aa12	BUY	CIF	00000000-0000-0000-0000-000000000000	2025-07-13 07:26:35.783474+00	2025-07-13 13:42:00.233+00	\N	\N	\N	2025-07-13 13:42:00.32172+00
69ef7184-d942-48a6-b24e-38ba68973e26	650e8400-e29b-41d4-a716-446655440019	CO-2025-6956	NEW	123	2025-07-25	64e97ff3-0248-480d-a51c-aeaf354afe3c	SELL	FOB	00000000-0000-0000-0000-000000000000	2025-07-15 06:17:07.003081+00	\N	\N	\N	\N	2025-07-15 06:17:07.003081+00
849b8292-b604-49af-8cd6-ab5c379a3559	650e8400-e29b-41d4-a716-446655440019	CO-2025-2634	CONFIRMED	50	\N	8914d95f-ca40-4458-844e-5e5b65953b36	SELL	FOB	00000000-0000-0000-0000-000000000000	2025-07-12 19:49:12.662621+00	2025-07-15 06:17:13.941+00	\N	\N	\N	2025-07-15 06:17:14.01339+00
b2966dae-d6b5-436b-ae5d-ecd88a0a8275	650e8400-e29b-41d4-a716-446655440018	CO-2025-1911	NEW	100	2025-07-19	7bb883d1-ebbe-4287-b5a7-da541deee4b6	BUY	CIF	00000000-0000-0000-0000-000000000000	2025-07-16 12:57:41.927492+00	\N	\N	\N	\N	2025-07-16 12:57:41.927492+00
e73cfd6c-70d2-4024-b4e1-15851b6f7f47	650e8400-e29b-41d4-a716-446655440019	CO-2025-8668	NEW	4321	2025-07-20	64e97ff3-0248-480d-a51c-aeaf354afe3c	SELL	FOB	00000000-0000-0000-0000-000000000000	2025-07-13 15:08:18.71167+00	\N	\N	\N	\N	2025-07-17 19:40:18.342835+00
7b8f9f18-a30f-4535-a6a5-38b31bbdceb4	650e8400-e29b-41d4-a716-446655440019	CO-2025-3672	CONFIRMED	10	\N	64e97ff3-0248-480d-a51c-aeaf354afe3c	SELL	FOB	00000000-0000-0000-0000-000000000000	2025-07-17 19:41:33.733479+00	2025-07-17 19:56:45.071+00	\N	\N	\N	2025-07-17 19:56:45.152631+00
3a1c4bab-a6b7-4965-9116-f88f1da17079	650e8400-e29b-41d4-a716-446655440011	CO-2025-5294	NEW	10	\N	07812d0b-8716-43a3-808c-3aabbe78a520	BUY	CIF	00000000-0000-0000-0000-000000000000	2025-07-17 20:40:45.347635+00	\N	\N	\N	\N	2025-07-17 20:40:45.347635+00
e06c8c36-31a0-4746-b948-de0f1cba9b0a	650e8400-e29b-41d4-a716-446655440018	CO-2025-5825	NEW	1324	\N	7bb883d1-ebbe-4287-b5a7-da541deee4b6	BUY	CIF	00000000-0000-0000-0000-000000000000	2025-07-18 20:13:35.880486+00	\N	\N	\N	\N	2025-07-18 20:13:35.880486+00
\.


--
-- Data for Name: call_off_shipment_line; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.call_off_shipment_line (shipment_line_id, call_off_id, transport_order_id, bundle_qty, metal_code, destination_party_id, expected_ship_date, created_at, updated_at, delivery_location, requested_delivery_date, notes, status) FROM stdin;
\.


--
-- Data for Name: counterparty; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.counterparty (counterparty_id, company_name, company_code, primary_contact_name, primary_contact_email, primary_contact_phone, address_line_1, address_line_2, city, state_province, postal_code, country_code, counterparty_type, tax_id, credit_rating, default_currency, payment_terms_days, is_active, created_at, updated_at) FROM stdin;
8914d95f-ca40-4458-844e-5e5b65953b36	Acme Corporation	ACME	John Smith	\N	\N	\N	\N	New York	\N	\N	US	CUSTOMER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
64e97ff3-0248-480d-a51c-aeaf354afe3c	Global Metals Ltd	GLOBAL	Sarah Johnson	\N	\N	\N	\N	London	\N	\N	GB	SUPPLIER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
7bb883d1-ebbe-4287-b5a7-da541deee4b6	TechCorp Industries	TECH	Hans Mueller	\N	\N	\N	\N	Berlin	\N	\N	DE	CUSTOMER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
75710b1e-3f72-4c34-8ae6-e340a5a1aa45	Pacific Mining Co	PACIFIC	Michael Chen	\N	\N	\N	\N	Sydney	\N	\N	AU	SUPPLIER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
8ac74cdf-2a81-41ee-89f8-221c2b3e76c1	European Alloys SA	EURO	Marie Dubois	\N	\N	\N	\N	Paris	\N	\N	FR	BOTH	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
20a12695-fd2e-4388-9c4e-2b9bc62a4833	American Steel Inc	AMSTEEL	Robert Wilson	\N	\N	\N	\N	Chicago	\N	\N	US	CUSTOMER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
7e5cf141-5554-4547-a41f-b2f0a44f79eb	Nordic Resources	NORDIC	Erik Larsen	\N	\N	\N	\N	Oslo	\N	\N	NO	SUPPLIER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
07812d0b-8716-43a3-808c-3aabbe78a520	Asian Metals Trading	ASIAN	Li Wei	\N	\N	\N	\N	Singapore	\N	\N	SG	BOTH	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
7cfe6c87-3d62-417b-9819-b85f1612aa12	Brazilian Copper Ltd	BRAZIL	Carlos Silva	\N	\N	\N	\N	São Paulo	\N	\N	BR	SUPPLIER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
b05a113e-9b63-4859-88ae-3246dcb2929f	Canadian Minerals Corp	CANADA	Emma Brown	\N	\N	\N	\N	Toronto	\N	\N	CA	SUPPLIER	\N	\N	USD	30	t	2025-07-13 07:05:20.158171+00	2025-07-13 07:05:20.158171+00
\.


--
-- Data for Name: inventory_bundle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_bundle (bundle_id, lot_id, weight_kg, warehouse_id, bin_location, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_lot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_lot (lot_id, supplier_id, metal_code, purity_pct, manufactured_on, certificate_url, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quota; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code, created_at, business_unit_id) FROM stdin;
650e8400-e29b-41d4-a716-446655440001	7e5cf141-5554-4547-a41f-b2f0a44f79eb	BUY	2025-07-01	1000.000	5.00	CIF	CU	2025-07-01 09:00:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440002	64e97ff3-0248-480d-a51c-aeaf354afe3c	SELL	2025-07-01	750.000	3.00	FOB	CU	2025-07-01 09:15:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440003	64e97ff3-0248-480d-a51c-aeaf354afe3c	BUY	2025-07-01	100.000	15.00	EXW	CU	2025-07-01 10:00:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440004	b05a113e-9b63-4859-88ae-3246dcb2929f	BUY	2025-08-01	2000.000	7.50	CIF	AL	2025-07-01 11:00:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440005	07812d0b-8716-43a3-808c-3aabbe78a520	SELL	2025-08-01	1500.000	5.00	FOB	AL	2025-07-01 11:15:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440006	7bb883d1-ebbe-4287-b5a7-da541deee4b6	BUY	2025-07-01	200.000	0.00	CIF	ZN	2025-07-01 12:00:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440007	75710b1e-3f72-4c34-8ae6-e340a5a1aa45	BUY	2025-07-01	500.000	10.00	CIF	NI	2025-07-01 14:00:00+00	550e8400-e29b-41d4-a716-446655440002
650e8400-e29b-41d4-a716-446655440008	8914d95f-ca40-4458-844e-5e5b65953b36	SELL	2025-07-01	300.000	2.50	FOB	NI	2025-07-01 14:30:00+00	550e8400-e29b-41d4-a716-446655440002
650e8400-e29b-41d4-a716-446655440009	8ac74cdf-2a81-41ee-89f8-221c2b3e76c1	BUY	2025-08-01	800.000	6.00	CIF	CU	2025-07-01 15:00:00+00	550e8400-e29b-41d4-a716-446655440002
650e8400-e29b-41d4-a716-446655440010	64e97ff3-0248-480d-a51c-aeaf354afe3c	SELL	2025-08-01	250.000	0.00	FOB	CU	2025-07-01 15:30:00+00	550e8400-e29b-41d4-a716-446655440002
650e8400-e29b-41d4-a716-446655440011	07812d0b-8716-43a3-808c-3aabbe78a520	BUY	2025-09-01	400.000	8.00	CIF	PB	2025-07-01 16:00:00+00	550e8400-e29b-41d4-a716-446655440002
650e8400-e29b-41d4-a716-446655440012	7cfe6c87-3d62-417b-9819-b85f1612aa12	BUY	2025-09-01	1200.000	6.00	CIF	CU	2025-07-01 18:00:00+00	550e8400-e29b-41d4-a716-446655440003
650e8400-e29b-41d4-a716-446655440013	7e5cf141-5554-4547-a41f-b2f0a44f79eb	BUY	2025-09-01	1500.000	8.00	CIF	AL	2025-07-01 18:30:00+00	550e8400-e29b-41d4-a716-446655440003
650e8400-e29b-41d4-a716-446655440014	75710b1e-3f72-4c34-8ae6-e340a5a1aa45	BUY	2025-09-01	150.000	12.00	EXW	SN	2025-07-01 19:00:00+00	550e8400-e29b-41d4-a716-446655440003
650e8400-e29b-41d4-a716-446655440015	8ac74cdf-2a81-41ee-89f8-221c2b3e76c1	SELL	2025-07-01	600.000	4.00	FOB	CU	2025-07-01 20:00:00+00	550e8400-e29b-41d4-a716-446655440003
650e8400-e29b-41d4-a716-446655440016	7cfe6c87-3d62-417b-9819-b85f1612aa12	SELL	2025-07-01	900.000	6.50	FOB	AL	2025-07-01 20:30:00+00	550e8400-e29b-41d4-a716-446655440003
650e8400-e29b-41d4-a716-446655440017	20a12695-fd2e-4388-9c4e-2b9bc62a4833	BUY	2025-07-01	25.000	20.00	EXW	ZN	2025-07-01 21:00:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440018	7bb883d1-ebbe-4287-b5a7-da541deee4b6	BUY	2025-08-01	5000.000	2.00	CIF	CU	2025-07-01 22:00:00+00	550e8400-e29b-41d4-a716-446655440002
650e8400-e29b-41d4-a716-446655440019	64e97ff3-0248-480d-a51c-aeaf354afe3c	SELL	2025-10-01	1000.000	5.00	FOB	AL	2025-07-01 23:00:00+00	550e8400-e29b-41d4-a716-446655440001
650e8400-e29b-41d4-a716-446655440020	07812d0b-8716-43a3-808c-3aabbe78a520	BUY	2025-06-01	750.000	7.00	CIF	NI	2025-06-15 10:00:00+00	550e8400-e29b-41d4-a716-446655440003
\.


--
-- Data for Name: transport_order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transport_order (transport_order_id, carrier_id, booking_reference, mode, equipment_type, gross_weight_t, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, business_unit_id, role, warehouse_ids, created_at, updated_at) FROM stdin;
\.


--
-- Name: business_units business_units_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT business_units_code_key UNIQUE (code);


--
-- Name: business_units business_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_units
    ADD CONSTRAINT business_units_pkey PRIMARY KEY (id);


--
-- Name: call_off call_off_call_off_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off
    ADD CONSTRAINT call_off_call_off_number_key UNIQUE (call_off_number);


--
-- Name: call_off call_off_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off
    ADD CONSTRAINT call_off_pkey PRIMARY KEY (call_off_id);


--
-- Name: call_off_shipment_line call_off_shipment_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off_shipment_line
    ADD CONSTRAINT call_off_shipment_line_pkey PRIMARY KEY (shipment_line_id);


--
-- Name: counterparty counterparty_company_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.counterparty
    ADD CONSTRAINT counterparty_company_code_key UNIQUE (company_code);


--
-- Name: counterparty counterparty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.counterparty
    ADD CONSTRAINT counterparty_pkey PRIMARY KEY (counterparty_id);


--
-- Name: inventory_bundle inventory_bundle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_bundle
    ADD CONSTRAINT inventory_bundle_pkey PRIMARY KEY (bundle_id);


--
-- Name: inventory_lot inventory_lot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_lot
    ADD CONSTRAINT inventory_lot_pkey PRIMARY KEY (lot_id);


--
-- Name: quota quota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quota
    ADD CONSTRAINT quota_pkey PRIMARY KEY (quota_id);


--
-- Name: transport_order transport_order_booking_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_order
    ADD CONSTRAINT transport_order_booking_reference_key UNIQUE (booking_reference);


--
-- Name: transport_order transport_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_order
    ADD CONSTRAINT transport_order_pkey PRIMARY KEY (transport_order_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: idx_bundle_atp_comprehensive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_atp_comprehensive ON public.inventory_bundle USING btree (warehouse_id, status, lot_id, weight_kg);


--
-- Name: INDEX idx_bundle_atp_comprehensive; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_bundle_atp_comprehensive IS 'Critical index for Available-to-Promise inventory lookups';


--
-- Name: idx_bundle_location_picking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_location_picking ON public.inventory_bundle USING btree (warehouse_id, bin_location, status, bundle_id) WHERE (status = ANY (ARRAY['ON_HAND'::public.inventory_bundle_status_enum, 'RESERVED'::public.inventory_bundle_status_enum]));


--
-- Name: idx_bundle_lot_traceability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_lot_traceability ON public.inventory_bundle USING btree (lot_id, status, warehouse_id);


--
-- Name: idx_bundle_weight_variance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_weight_variance ON public.inventory_bundle USING btree (weight_kg, warehouse_id, status) WHERE (abs((weight_kg - 1000.000)) > 50.000);


--
-- Name: idx_business_units_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_units_code ON public.business_units USING btree (code, region);


--
-- Name: idx_call_off_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_off_created_by ON public.call_off USING btree (created_by, created_at DESC);


--
-- Name: idx_call_off_delivery_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_off_delivery_date ON public.call_off USING btree (requested_delivery_date) WHERE (requested_delivery_date IS NOT NULL);


--
-- Name: idx_call_off_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_off_number ON public.call_off USING btree (call_off_number);


--
-- Name: idx_call_off_quota_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_off_quota_status ON public.call_off USING btree (quota_id, status);


--
-- Name: idx_call_off_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_off_status ON public.call_off USING btree (status);


--
-- Name: idx_calloff_counterparty_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calloff_counterparty_direction ON public.call_off USING btree (counterparty_id, direction, status);


--
-- Name: idx_calloff_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calloff_created_by ON public.call_off USING btree (created_by, created_at DESC);


--
-- Name: idx_calloff_delivery_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calloff_delivery_date ON public.call_off USING btree (requested_delivery_date) WHERE (requested_delivery_date IS NOT NULL);


--
-- Name: idx_calloff_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_calloff_number_unique ON public.call_off USING btree (call_off_number);


--
-- Name: idx_calloff_quota_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calloff_quota_status ON public.call_off USING btree (quota_id, status);


--
-- Name: INDEX idx_calloff_quota_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_calloff_quota_status IS 'Primary index for call-off listings filtered by quota and status';


--
-- Name: idx_inventory_bundle_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_bundle_location ON public.inventory_bundle USING btree (warehouse_id, bin_location, status) WHERE (status = ANY (ARRAY['ON_HAND'::public.inventory_bundle_status_enum, 'RESERVED'::public.inventory_bundle_status_enum]));


--
-- Name: idx_inventory_bundle_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_bundle_lot ON public.inventory_bundle USING btree (lot_id);


--
-- Name: idx_inventory_bundle_weight_variance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_bundle_weight_variance ON public.inventory_bundle USING btree (weight_kg) WHERE (abs((weight_kg - (1000)::numeric)) > (5)::numeric);


--
-- Name: idx_inventory_bundle_wh_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_bundle_wh_status ON public.inventory_bundle USING btree (warehouse_id, status, lot_id);


--
-- Name: idx_inventory_lot_certificate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_lot_certificate ON public.inventory_lot USING btree (certificate_url) WHERE (certificate_url IS NOT NULL);


--
-- Name: idx_inventory_lot_manufactured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_lot_manufactured ON public.inventory_lot USING btree (manufactured_on, metal_code);


--
-- Name: idx_inventory_lot_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_lot_status ON public.inventory_lot USING btree (status);


--
-- Name: idx_inventory_lot_supplier_metal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_lot_supplier_metal ON public.inventory_lot USING btree (supplier_id, metal_code, status);


--
-- Name: idx_line_calloff_comprehensive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_calloff_comprehensive ON public.call_off_shipment_line USING btree (call_off_id, bundle_qty);


--
-- Name: idx_line_destination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_destination ON public.call_off_shipment_line USING btree (destination_party_id, expected_ship_date) WHERE (destination_party_id IS NOT NULL);


--
-- Name: idx_line_ship_date_metal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_ship_date_metal ON public.call_off_shipment_line USING btree (expected_ship_date, metal_code, bundle_qty) WHERE (expected_ship_date IS NOT NULL);


--
-- Name: idx_line_transport_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_transport_order ON public.call_off_shipment_line USING btree (transport_order_id) WHERE (transport_order_id IS NOT NULL);


--
-- Name: INDEX idx_line_transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_line_transport_order IS 'Index for aggregating shipment lines by transport order';


--
-- Name: idx_lot_certificate_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_certificate_lookup ON public.inventory_lot USING btree (certificate_url) WHERE (certificate_url IS NOT NULL);


--
-- Name: idx_lot_manufactured_fifo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_manufactured_fifo ON public.inventory_lot USING btree (manufactured_on DESC, metal_code, status);


--
-- Name: idx_lot_status_metal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_status_metal ON public.inventory_lot USING btree (status, metal_code, manufactured_on);


--
-- Name: idx_lot_supplier_metal_comprehensive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_supplier_metal_comprehensive ON public.inventory_lot USING btree (supplier_id, metal_code, status, manufactured_on);


--
-- Name: idx_quota_active_periods; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_active_periods ON public.quota USING btree (quota_id, period_month, business_unit_id);


--
-- Name: idx_quota_counterparty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_counterparty ON public.quota USING btree (counterparty_id);


--
-- Name: idx_quota_counterparty_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_counterparty_period ON public.quota USING btree (counterparty_id, period_month, direction);


--
-- Name: INDEX idx_quota_counterparty_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_quota_counterparty_period IS 'Primary index for quota filtering by trading partner and time period';


--
-- Name: idx_quota_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_direction ON public.quota USING btree (direction);


--
-- Name: idx_quota_direction_metal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_direction_metal ON public.quota USING btree (direction, metal_code, period_month);


--
-- Name: idx_quota_metal_business_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_metal_business_unit ON public.quota USING btree (metal_code, period_month, business_unit_id);


--
-- Name: idx_quota_period_metal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quota_period_metal ON public.quota USING btree (period_month, metal_code);


--
-- Name: idx_shipment_line_call_off; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_line_call_off ON public.call_off_shipment_line USING btree (call_off_id);


--
-- Name: idx_shipment_line_ship_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_line_ship_date ON public.call_off_shipment_line USING btree (expected_ship_date, metal_code) WHERE (expected_ship_date IS NOT NULL);


--
-- Name: idx_shipment_line_transport_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_line_transport_order ON public.call_off_shipment_line USING btree (transport_order_id) WHERE (transport_order_id IS NOT NULL);


--
-- Name: idx_transport_booking_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_booking_ref ON public.transport_order USING btree (booking_reference) WHERE (booking_reference IS NOT NULL);


--
-- Name: idx_transport_created_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_created_audit ON public.transport_order USING btree (created_by, created_at DESC, status);


--
-- Name: idx_transport_mode_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_mode_equipment ON public.transport_order USING btree (mode, equipment_type, status);


--
-- Name: idx_transport_order_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_order_carrier ON public.transport_order USING btree (carrier_id);


--
-- Name: idx_transport_order_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_order_created_by ON public.transport_order USING btree (created_by, created_at DESC);


--
-- Name: idx_transport_order_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_order_status ON public.transport_order USING btree (status);


--
-- Name: idx_transport_status_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_status_carrier ON public.transport_order USING btree (status, carrier_id, created_at DESC);


--
-- Name: idx_user_profiles_business_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_business_unit ON public.user_profiles USING btree (business_unit_id);


--
-- Name: idx_user_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);


--
-- Name: idx_user_profiles_role_bu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_role_bu ON public.user_profiles USING btree (role, business_unit_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_user_profiles_user_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_lookup ON public.user_profiles USING btree (user_id, business_unit_id, role);


--
-- Name: idx_user_profiles_warehouse_access; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_warehouse_access ON public.user_profiles USING gin (warehouse_ids) WHERE ((warehouse_ids IS NOT NULL) AND (array_length(warehouse_ids, 1) > 0));


--
-- Name: INDEX idx_user_profiles_warehouse_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_user_profiles_warehouse_access IS 'GIN index for efficient warehouse access checks in RLS policies';


--
-- Name: call_off trg_audit_call_off_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_call_off_changes AFTER UPDATE ON public.call_off FOR EACH ROW EXECUTE FUNCTION public.audit_important_changes();


--
-- Name: call_off trg_generate_call_off_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_call_off_number BEFORE INSERT ON public.call_off FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_call_off_number();


--
-- Name: call_off trg_validate_call_off_status_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_call_off_status_transition BEFORE UPDATE ON public.call_off FOR EACH ROW EXECUTE FUNCTION public.validate_call_off_status_transition();


--
-- Name: call_off trg_validate_calloff_direction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_calloff_direction BEFORE INSERT OR UPDATE ON public.call_off FOR EACH ROW EXECUTE FUNCTION public.validate_calloff_direction();


--
-- Name: inventory_bundle trg_validate_inventory_bundle_status_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_inventory_bundle_status_transition BEFORE UPDATE ON public.inventory_bundle FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_bundle_status_transition();


--
-- Name: call_off_shipment_line trg_validate_shipment_line_metal; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_shipment_line_metal BEFORE INSERT OR UPDATE ON public.call_off_shipment_line FOR EACH ROW EXECUTE FUNCTION public.validate_shipment_line_metal();


--
-- Name: call_off_shipment_line trg_validate_shipment_line_quantities; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_shipment_line_quantities BEFORE INSERT OR UPDATE ON public.call_off_shipment_line FOR EACH ROW EXECUTE FUNCTION public.validate_shipment_line_quantities();


--
-- Name: call_off_shipment_line update_call_off_shipment_line_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_call_off_shipment_line_updated_at BEFORE UPDATE ON public.call_off_shipment_line FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: call_off update_call_off_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_call_off_updated_at BEFORE UPDATE ON public.call_off FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_bundle update_inventory_bundle_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_bundle_updated_at BEFORE UPDATE ON public.inventory_bundle FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_lot update_inventory_lot_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_lot_updated_at BEFORE UPDATE ON public.inventory_lot FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transport_order update_transport_order_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transport_order_updated_at BEFORE UPDATE ON public.transport_order FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: call_off call_off_quota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off
    ADD CONSTRAINT call_off_quota_id_fkey FOREIGN KEY (quota_id) REFERENCES public.quota(quota_id) ON DELETE RESTRICT;


--
-- Name: call_off_shipment_line call_off_shipment_line_call_off_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off_shipment_line
    ADD CONSTRAINT call_off_shipment_line_call_off_id_fkey FOREIGN KEY (call_off_id) REFERENCES public.call_off(call_off_id) ON DELETE CASCADE;


--
-- Name: call_off fk_call_off_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off
    ADD CONSTRAINT fk_call_off_counterparty FOREIGN KEY (counterparty_id) REFERENCES public.counterparty(counterparty_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: call_off fk_call_off_quota; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off
    ADD CONSTRAINT fk_call_off_quota FOREIGN KEY (quota_id) REFERENCES public.quota(quota_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quota fk_quota_counterparty; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quota
    ADD CONSTRAINT fk_quota_counterparty FOREIGN KEY (counterparty_id) REFERENCES public.counterparty(counterparty_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: call_off_shipment_line fk_shipment_line_transport_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_off_shipment_line
    ADD CONSTRAINT fk_shipment_line_transport_order FOREIGN KEY (transport_order_id) REFERENCES public.transport_order(transport_order_id) ON DELETE SET NULL;


--
-- Name: inventory_bundle inventory_bundle_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_bundle
    ADD CONSTRAINT inventory_bundle_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.inventory_lot(lot_id) ON DELETE RESTRICT;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: business_units Authenticated users can read business units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read business units" ON public.business_units FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: inventory_bundle OPS can create inventory bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can create inventory bundles" ON public.inventory_bundle FOR INSERT WITH CHECK ((public.user_has_ops_role() AND public.user_can_access_warehouse(warehouse_id)));


--
-- Name: POLICY "OPS can create inventory bundles" ON inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can create inventory bundles" ON public.inventory_bundle IS 'OPS role can create inventory bundles via ASN processing in accessible warehouses';


--
-- Name: inventory_lot OPS can create inventory lots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can create inventory lots" ON public.inventory_lot FOR INSERT WITH CHECK (public.user_has_ops_role());


--
-- Name: POLICY "OPS can create inventory lots" ON inventory_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can create inventory lots" ON public.inventory_lot IS 'OPS role can create inventory lots via ASN processing';


--
-- Name: call_off_shipment_line OPS can create shipment lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can create shipment lines" ON public.call_off_shipment_line FOR INSERT WITH CHECK ((public.user_has_ops_role() AND (EXISTS ( SELECT 1
   FROM (public.call_off co
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((co.call_off_id = call_off_shipment_line.call_off_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "OPS can create shipment lines" ON call_off_shipment_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can create shipment lines" ON public.call_off_shipment_line IS 'OPS role can create shipment lines for call-offs in their business unit';


--
-- Name: transport_order OPS can create transport orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can create transport orders" ON public.transport_order FOR INSERT WITH CHECK (public.user_has_ops_role());


--
-- Name: POLICY "OPS can create transport orders" ON transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can create transport orders" ON public.transport_order IS 'OPS role can create transport orders for call-offs in their business unit';


--
-- Name: call_off OPS can update call-off status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can update call-off status" ON public.call_off FOR UPDATE USING ((public.user_has_ops_role() AND (EXISTS ( SELECT 1
   FROM public.quota q
  WHERE ((q.quota_id = call_off.quota_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "OPS can update call-off status" ON call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can update call-off status" ON public.call_off IS 'OPS role can update call-off status for fulfillment tracking';


--
-- Name: inventory_bundle OPS can update inventory bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can update inventory bundles" ON public.inventory_bundle FOR UPDATE USING ((public.user_has_ops_role() AND public.user_can_access_warehouse(warehouse_id)));


--
-- Name: POLICY "OPS can update inventory bundles" ON inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can update inventory bundles" ON public.inventory_bundle IS 'OPS role can modify inventory bundles for status changes and location moves';


--
-- Name: inventory_lot OPS can update inventory lots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can update inventory lots" ON public.inventory_lot FOR UPDATE USING (public.user_has_ops_role());


--
-- Name: POLICY "OPS can update inventory lots" ON inventory_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can update inventory lots" ON public.inventory_lot IS 'OPS role can modify inventory lots for status changes and GRN processing';


--
-- Name: call_off_shipment_line OPS can update shipment lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can update shipment lines" ON public.call_off_shipment_line FOR UPDATE USING ((public.user_has_ops_role() AND (EXISTS ( SELECT 1
   FROM (public.call_off co
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((co.call_off_id = call_off_shipment_line.call_off_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "OPS can update shipment lines" ON call_off_shipment_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can update shipment lines" ON public.call_off_shipment_line IS 'OPS role can modify shipment lines for tracking updates and POD processing';


--
-- Name: transport_order OPS can update transport orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OPS can update transport orders" ON public.transport_order FOR UPDATE USING ((public.user_has_ops_role() AND ((NOT (EXISTS ( SELECT 1
   FROM public.call_off_shipment_line csl
  WHERE (csl.transport_order_id = transport_order.transport_order_id)))) OR (EXISTS ( SELECT 1
   FROM ((public.call_off_shipment_line csl
     JOIN public.call_off co ON ((co.call_off_id = csl.call_off_id)))
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((csl.transport_order_id = transport_order.transport_order_id) AND (q.business_unit_id = public.get_user_business_unit_id())))))));


--
-- Name: POLICY "OPS can update transport orders" ON transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "OPS can update transport orders" ON public.transport_order IS 'OPS role can modify transport orders in their business unit';


--
-- Name: inventory_bundle Planner can update inventory bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Planner can update inventory bundles" ON public.inventory_bundle FOR UPDATE USING ((public.user_has_planner_role() AND (warehouse_id = ANY (public.get_user_warehouse_ids()))));


--
-- Name: POLICY "Planner can update inventory bundles" ON inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Planner can update inventory bundles" ON public.inventory_bundle IS 'PLANNER role can modify inventory bundles for allocation purposes';


--
-- Name: call_off_shipment_line Planner can update shipment lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Planner can update shipment lines" ON public.call_off_shipment_line FOR UPDATE USING ((public.user_has_planner_role() AND (EXISTS ( SELECT 1
   FROM (public.call_off co
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((co.call_off_id = call_off_shipment_line.call_off_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "Planner can update shipment lines" ON call_off_shipment_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Planner can update shipment lines" ON public.call_off_shipment_line IS 'PLANNER role can modify shipment lines for planning purposes';


--
-- Name: transport_order Planner can update transport orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Planner can update transport orders" ON public.transport_order FOR UPDATE USING ((public.user_has_planner_role() AND ((NOT (EXISTS ( SELECT 1
   FROM public.call_off_shipment_line csl
  WHERE (csl.transport_order_id = transport_order.transport_order_id)))) OR (EXISTS ( SELECT 1
   FROM ((public.call_off_shipment_line csl
     JOIN public.call_off co ON ((co.call_off_id = csl.call_off_id)))
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((csl.transport_order_id = transport_order.transport_order_id) AND (q.business_unit_id = public.get_user_business_unit_id())))))));


--
-- Name: POLICY "Planner can update transport orders" ON transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Planner can update transport orders" ON public.transport_order IS 'PLANNER role can modify transport orders for planning purposes';


--
-- Name: call_off Service role can delete call-offs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete call-offs" ON public.call_off FOR DELETE USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: POLICY "Service role can delete call-offs" ON call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Service role can delete call-offs" ON public.call_off IS 'Only service role can delete call-offs for data management purposes';


--
-- Name: inventory_bundle Service role can delete inventory bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete inventory bundles" ON public.inventory_bundle FOR DELETE USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: POLICY "Service role can delete inventory bundles" ON inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Service role can delete inventory bundles" ON public.inventory_bundle IS 'Only service role can delete inventory bundles for data management purposes';


--
-- Name: inventory_lot Service role can delete inventory lots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete inventory lots" ON public.inventory_lot FOR DELETE USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: POLICY "Service role can delete inventory lots" ON inventory_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Service role can delete inventory lots" ON public.inventory_lot IS 'Only service role can delete inventory lots for data management purposes';


--
-- Name: quota Service role can delete quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete quotas" ON public.quota FOR DELETE USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: POLICY "Service role can delete quotas" ON quota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Service role can delete quotas" ON public.quota IS 'Only service role can delete quotas for data management purposes';


--
-- Name: call_off_shipment_line Service role can delete shipment lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete shipment lines" ON public.call_off_shipment_line FOR DELETE USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: POLICY "Service role can delete shipment lines" ON call_off_shipment_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Service role can delete shipment lines" ON public.call_off_shipment_line IS 'Only service role can delete shipment lines for data management purposes';


--
-- Name: transport_order Service role can delete transport orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete transport orders" ON public.transport_order FOR DELETE USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: POLICY "Service role can delete transport orders" ON transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Service role can delete transport orders" ON public.transport_order IS 'Only service role can delete transport orders for data management purposes';


--
-- Name: business_units Service role can manage business units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage business units" ON public.business_units USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: user_profiles Service role can manage profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage profiles" ON public.user_profiles USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: call_off Trade and Planner can create call-offs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trade and Planner can create call-offs" ON public.call_off FOR INSERT WITH CHECK (((public.user_has_trade_role() OR public.user_has_planner_role()) AND (EXISTS ( SELECT 1
   FROM public.quota q
  WHERE ((q.quota_id = call_off.quota_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "Trade and Planner can create call-offs" ON call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Trade and Planner can create call-offs" ON public.call_off IS 'TRADE and PLANNER roles can create call-offs for quotas in their business unit';


--
-- Name: quota Trade and Planner can create quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trade and Planner can create quotas" ON public.quota FOR INSERT WITH CHECK (((public.user_has_trade_role() OR public.user_has_planner_role()) AND (business_unit_id = public.get_user_business_unit_id())));


--
-- Name: POLICY "Trade and Planner can create quotas" ON quota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Trade and Planner can create quotas" ON public.quota IS 'TRADE and PLANNER roles can create new quotas in their business unit';


--
-- Name: call_off Trade and Planner can update call-offs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trade and Planner can update call-offs" ON public.call_off FOR UPDATE USING (((public.user_has_trade_role() OR public.user_has_planner_role()) AND (EXISTS ( SELECT 1
   FROM public.quota q
  WHERE ((q.quota_id = call_off.quota_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "Trade and Planner can update call-offs" ON call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Trade and Planner can update call-offs" ON public.call_off IS 'TRADE and PLANNER roles can modify call-offs in their business unit';


--
-- Name: quota Trade and Planner can update quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Trade and Planner can update quotas" ON public.quota FOR UPDATE USING (((public.user_has_trade_role() OR public.user_has_planner_role()) AND (business_unit_id = public.get_user_business_unit_id())));


--
-- Name: POLICY "Trade and Planner can update quotas" ON quota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Trade and Planner can update quotas" ON public.quota IS 'TRADE and PLANNER roles can modify quotas in their business unit';


--
-- Name: call_off Users can read call-offs in their business unit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read call-offs in their business unit" ON public.call_off FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM public.quota q
  WHERE ((q.quota_id = call_off.quota_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "Users can read call-offs in their business unit" ON call_off; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can read call-offs in their business unit" ON public.call_off IS 'All authenticated users can view call-offs for quotas in their business unit';


--
-- Name: inventory_bundle Users can read inventory bundles in accessible warehouses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read inventory bundles in accessible warehouses" ON public.inventory_bundle FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (public.user_has_ops_role() OR (warehouse_id = ANY (public.get_user_warehouse_ids())))));


--
-- Name: POLICY "Users can read inventory bundles in accessible warehouses" ON inventory_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can read inventory bundles in accessible warehouses" ON public.inventory_bundle IS 'All authenticated users can view inventory bundles in warehouses they have access to';


--
-- Name: inventory_lot Users can read inventory lots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read inventory lots" ON public.inventory_lot FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: POLICY "Users can read inventory lots" ON inventory_lot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can read inventory lots" ON public.inventory_lot IS 'All authenticated users can view inventory lots';


--
-- Name: quota Users can read quotas in their business unit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read quotas in their business unit" ON public.quota FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (business_unit_id = public.get_user_business_unit_id())));


--
-- Name: POLICY "Users can read quotas in their business unit" ON quota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can read quotas in their business unit" ON public.quota IS 'All authenticated users can view quotas within their business unit';


--
-- Name: call_off_shipment_line Users can read shipment lines in their business unit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read shipment lines in their business unit" ON public.call_off_shipment_line FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM (public.call_off co
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((co.call_off_id = call_off_shipment_line.call_off_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "Users can read shipment lines in their business unit" ON call_off_shipment_line; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can read shipment lines in their business unit" ON public.call_off_shipment_line IS 'All authenticated users can view shipment lines for call-offs in their business unit';


--
-- Name: transport_order Users can read transport orders in their business unit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read transport orders in their business unit" ON public.transport_order FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM ((public.call_off_shipment_line csl
     JOIN public.call_off co ON ((co.call_off_id = csl.call_off_id)))
     JOIN public.quota q ON ((q.quota_id = co.quota_id)))
  WHERE ((csl.transport_order_id = transport_order.transport_order_id) AND (q.business_unit_id = public.get_user_business_unit_id()))))));


--
-- Name: POLICY "Users can read transport orders in their business unit" ON transport_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can read transport orders in their business unit" ON public.transport_order IS 'All authenticated users can view transport orders for call-offs in their business unit';


--
-- Name: user_profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: business_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

--
-- Name: call_off; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_off ENABLE ROW LEVEL SECURITY;

--
-- Name: call_off_shipment_line; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_off_shipment_line ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_bundle; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_bundle ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_lot; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_lot ENABLE ROW LEVEL SECURITY;

--
-- Name: quota; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quota ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_order ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

