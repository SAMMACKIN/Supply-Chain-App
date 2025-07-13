import { supabase } from '../lib/supabase'

export async function fixUpdatedAt() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE call_off 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      
      CREATE INDEX IF NOT EXISTS idx_call_off_updated_at ON call_off (updated_at DESC);
    `
  })
  
  if (error) {
    console.error('Error adding updated_at column:', error)
  } else {
    console.log('Successfully added updated_at column')
  }
}