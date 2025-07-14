import { createClient } from '@supabase/supabase-js'

// Production configuration
const PROD_CONFIG = {
  url: 'https://brixbdbunhwlhuwunqxw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyaXhiZGJ1bmh3bGh1d3VucXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMTgzNjUsImV4cCI6MjA2Nzg5NDM2NX0.8zZcFLt_Y7QJGWepRmccDLD01Ib0owlbBMigVZFMCpQ'
}

// Development configuration
const DEV_CONFIG = {
  url: 'https://pxwtdaqhwzweedflwora.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM'
}

// Determine which config to use based on domain
function getConfig() {
  if (typeof window === 'undefined') {
    // Server-side rendering, use env vars
    return {
      url: import.meta.env.VITE_SUPABASE_URL || DEV_CONFIG.url,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || DEV_CONFIG.anonKey
    }
  }
  
  const hostname = window.location.hostname
  console.log('Current hostname:', hostname)
  
  // Check if we're on a production domain
  if (hostname.includes('supply-chain-app') && !hostname.includes('dev')) {
    console.log('Using production Supabase')
    return PROD_CONFIG
  } else {
    console.log('Using development Supabase')
    return DEV_CONFIG
  }
}

const config = getConfig()

// Create the Supabase client
export const supabaseClient = createClient(config.url, config.anonKey)

// Export for debugging
export const supabaseConfig = config