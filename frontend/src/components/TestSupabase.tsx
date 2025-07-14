import { useEffect } from 'react'
import { supabaseConfig } from '../lib/supabase'

export function TestSupabase() {
  useEffect(() => {
    console.log('TestSupabase component mounted')
    console.log('Supabase config:', supabaseConfig)
    
    // Test creating a client directly in the component
    const testConnection = async () => {
      try {
        console.log('Testing direct client creation...')
        const { createClient } = await import('@supabase/supabase-js')
        
        const url = supabaseConfig.url
        const key = supabaseConfig.anonKey
        
        console.log('Creating client with:', { url, keyLength: key.length })
        
        const client = createClient(url, key)
        console.log('Client created successfully')
        
        // Test a simple query
        const { data, error } = await client.from('user_profiles').select('count').limit(1)
        
        if (error) {
          console.error('Query error:', error)
        } else {
          console.log('Query successful:', data)
        }
      } catch (err) {
        console.error('Test failed:', err)
      }
    }
    
    testConnection()
  }, [])
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px' }}>
      <h3>Supabase Connection Test</h3>
      <p>Check console for results</p>
    </div>
  )
}