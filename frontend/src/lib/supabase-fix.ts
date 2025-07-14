import { createClient } from '@supabase/supabase-js'

// Use environment variables for proper dev/prod configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Log for debugging (remove in production)
console.log('Supabase URL from env:', SUPABASE_URL)
console.log('Supabase key exists:', !!SUPABASE_ANON_KEY)
console.log('Supabase key length:', SUPABASE_ANON_KEY?.length)

// Validate before creating client
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration:', {
    url: SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY
  })
  throw new Error('Supabase configuration is missing')
}

// Create client with explicit configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public',
  },
})

// Export config for debugging
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
}