-- Fix the call-off number generation function to avoid FOR UPDATE with aggregate functions

-- Drop and recreate the function with proper locking approach
DROP FUNCTION IF EXISTS generate_call_off_number();

CREATE OR REPLACE FUNCTION generate_call_off_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  formatted_num TEXT;
  max_num INTEGER;
BEGIN
  -- Extract year from current date
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- First, lock the call_off table to prevent concurrent access
  LOCK TABLE call_off IN EXCLUSIVE MODE;
  
  -- Get the maximum sequence number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN call_off_number ~ ('^CO-' || year_part || '-[0-9]+$')
      THEN CAST(SUBSTRING(call_off_number FROM LENGTH('CO-' || year_part || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0)
  INTO max_num
  FROM call_off;
  
  -- Increment for next number
  sequence_num := max_num + 1;
  
  -- Format sequence number with leading zeros
  formatted_num := LPAD(sequence_num::TEXT, 4, '0');
  
  -- Return formatted call-off number
  RETURN 'CO-' || year_part || '-' || formatted_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_call_off_number() IS 'Generates sequential call-off numbers in format CO-YYYY-####';