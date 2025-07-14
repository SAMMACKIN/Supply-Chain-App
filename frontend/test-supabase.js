import { createClient } from '@supabase/supabase-js'

// Test with the same hardcoded values
const url = 'https://pxwtdaqhwzweedflwora.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM'

console.log('Testing Supabase connection...')
console.log('URL:', url)
console.log('Key length:', anonKey.length)

try {
  const supabase = createClient(url, anonKey)
  console.log('Supabase client created successfully')
  
  // Test a simple query
  const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
  
  if (error) {
    console.error('Query error:', error)
  } else {
    console.log('Query successful:', data)
  }
} catch (err) {
  console.error('Error creating client:', err)
}