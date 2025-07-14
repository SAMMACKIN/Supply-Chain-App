import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Environment:', import.meta.env.MODE)
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key exists:', !!supabaseAnonKey)
  console.log('Key length:', supabaseAnonKey.length)
  console.log('All env vars:', Object.keys(import.meta.env))
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`)
}

// Ensure values are strings and properly formatted
const cleanUrl = String(supabaseUrl).trim()
const cleanKey = String(supabaseAnonKey).trim()

// Validate URL format
if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL format: ${cleanUrl}`)
}

// Create client with minimal options first
export const supabase = createClient(cleanUrl, cleanKey)