import { createClient } from '@supabase/supabase-js'

// Test with hardcoded dev values to isolate the issue
const url = 'https://pxwtdaqhwzweedflwora.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM'

console.log('Supabase client config:', { url, keyLength: anonKey.length })

// Create the Supabase client with minimal config
export const supabaseClient = createClient(url, anonKey)

// Export for debugging
export const supabaseConfig = { url, anonKey }