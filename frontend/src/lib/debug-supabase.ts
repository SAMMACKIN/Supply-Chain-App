import { createClient } from '@supabase/supabase-js'

// Debug version to help identify the issue
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('Debug: Raw environment variables:')
console.log('URL:', SUPABASE_URL)
console.log('Key first 20 chars:', SUPABASE_ANON_KEY.substring(0, 20))
console.log('Key last 20 chars:', SUPABASE_ANON_KEY.substring(SUPABASE_ANON_KEY.length - 20))
console.log('Key length:', SUPABASE_ANON_KEY.length)

// Check for common issues
if (SUPABASE_ANON_KEY.includes(' ')) {
  console.error('ERROR: Anon key contains spaces!')
}
if (SUPABASE_ANON_KEY.includes('\n')) {
  console.error('ERROR: Anon key contains newlines!')
}
if (SUPABASE_ANON_KEY.includes('"') || SUPABASE_ANON_KEY.includes("'")) {
  console.error('ERROR: Anon key contains quotes!')
}
if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
  console.error('ERROR: Anon key should start with "eyJ"')
}

// Try to create client with minimal config
export const debugSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test function
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...')
    const { data, error } = await debugSupabase.from('quota').select('count').limit(1)
    if (error) {
      console.error('Supabase test error:', error)
    } else {
      console.log('Supabase test success!')
    }
  } catch (e) {
    console.error('Supabase test exception:', e)
  }
}