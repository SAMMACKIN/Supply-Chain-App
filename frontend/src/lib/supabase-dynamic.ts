import type { SupabaseClient } from '@supabase/supabase-js'

// Hardcoded values for testing
const SUPABASE_URL = 'https://pxwtdaqhwzweedflwora.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM'

let supabaseInstance: SupabaseClient | null = null

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) {
    return supabaseInstance
  }

  try {
    console.log('Dynamically importing @supabase/supabase-js...')
    const { createClient } = await import('@supabase/supabase-js')
    
    console.log('Creating Supabase client with dynamic import...')
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    console.log('Supabase client created successfully')
    return supabaseInstance
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw error
  }
}

// Export a proxy that loads the client on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return async (...args: any[]) => {
      const client = await getSupabase()
      return (client as any)[prop](...args)
    }
  }
})