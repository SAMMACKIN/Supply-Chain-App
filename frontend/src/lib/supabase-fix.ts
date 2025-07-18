import { createClient } from '@supabase/supabase-js'

// Use environment variables for proper dev/prod configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Clean up any potential whitespace issues
const cleanUrl = SUPABASE_URL.trim()
const cleanKey = SUPABASE_ANON_KEY.trim()

// Log minimal info for debugging
if (import.meta.env.DEV) {
  console.log('Supabase URL:', cleanUrl)
  console.log('Supabase configured:', !!cleanKey)
}

// Validate before creating client
if (!cleanUrl || !cleanKey) {
  console.error('Missing Supabase configuration:', {
    url: cleanUrl,
    hasKey: !!cleanKey
  })
  throw new Error('Supabase configuration is missing')
}

// Create client with explicit configuration
export const supabase = createClient(cleanUrl, cleanKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    storage: window.localStorage,
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
  url: cleanUrl,
  anonKey: cleanKey,
}