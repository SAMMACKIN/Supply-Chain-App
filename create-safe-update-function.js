// Simple script to create the safe update function via Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://pxwtdaqhwzweedflwora.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMyMjg5NiwiZXhwIjoyMDY3ODk4ODk2fQ.VbQfgpqcI8x_iy6A7lsAhMU4hsDl9OOzO4e0WFO24sQ'

const supabase = createClient(supabaseUrl, serviceRoleKey)

const createSafeUpdateFunction = async () => {
  const sql = `
    -- Drop the problematic trigger first
    DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off;
    
    -- Create a function to safely update call-offs
    CREATE OR REPLACE FUNCTION update_call_off_safe(
      p_call_off_id UUID,
      p_bundle_qty INTEGER DEFAULT NULL,
      p_requested_delivery_date DATE DEFAULT NULL
    )
    RETURNS SETOF call_off
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      UPDATE call_off 
      SET 
        bundle_qty = COALESCE(p_bundle_qty, call_off.bundle_qty),
        requested_delivery_date = COALESCE(p_requested_delivery_date, call_off.requested_delivery_date)
      WHERE call_off.call_off_id = p_call_off_id 
        AND call_off.status = 'NEW'
      RETURNING *;
    END;
    $$;
  `
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('Error creating function:', error)
    } else {
      console.log('Successfully created safe update function')
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

createSafeUpdateFunction()