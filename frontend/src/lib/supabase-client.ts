import { createClient } from '@supabase/supabase-js'

// Use environment variables
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase client config:', { url, keyLength: anonKey.length })

// Create the Supabase client with minimal config
export const supabaseClient = createClient(url, anonKey)

// Export for debugging
export const supabaseConfig = { url, anonKey }