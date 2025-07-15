-- Create call-off number generation function and trigger
-- Migration: 008_create_call_off_number_generator.sql
-- Created: July 12, 2025

-- Function to generate sequential call-off numbers by year
CREATE OR REPLACE FUNCTION generate_call_off_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_num INT;
    new_number TEXT;
BEGIN
    -- Only generate if call_off_number is NULL (not provided)
    IF NEW.call_off_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Extract year from current date
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(SUBSTRING(call_off_number FROM 9 FOR 4)::INT), 0) + 1
    INTO sequence_num
    FROM call_off 
    WHERE call_off_number LIKE 'CO-' || year_part || '-%';
    
    -- Generate new call-off number: CO-YYYY-NNNN
    new_number := 'CO-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.call_off_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION generate_call_off_number() IS 
'Generates sequential call-off numbers in format CO-YYYY-NNNN, restarting sequence each calendar year';

-- Create trigger to auto-generate call-off numbers
CREATE TRIGGER generate_call_off_number_trigger
    BEFORE INSERT ON call_off 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_call_off_number();

-- Add comment about the trigger
COMMENT ON TRIGGER generate_call_off_number_trigger ON call_off IS 
'Automatically generates call-off numbers when call_off_number is NULL during INSERT';