import type { SupabaseClient } from '@supabase/supabase-js'

// Use environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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