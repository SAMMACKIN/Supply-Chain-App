import { useState } from 'react'
import { Box, Typography, Button, Card, CardContent, Alert } from '@mui/material'
import { supabase } from '../lib/supabase'

export function TestSupabase() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Test 1: Basic connection
      console.log('Testing Supabase connection...')
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('Supabase Key (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20))

      // Test 2: Edge Function call
      console.log('Calling Edge Function...')
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('Expected function URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calloff-crud/quotas`)
      
      const { data, error: functionError } = await supabase.functions.invoke('calloff-crud/quotas', {
        method: 'GET'
      })

      if (functionError) {
        console.error('Edge Function Error:', functionError)
        setError(`Edge Function Error: ${functionError.message}`)
        return
      }

      console.log('Edge Function Response:', data)
      setResult(data)

    } catch (err: any) {
      console.error('Test Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testDirectDatabase = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Test direct database access (if RLS allows)
      console.log('Testing direct database access...')
      const { data, error: dbError } = await supabase
        .from('quota')
        .select('*')
        .limit(5)

      if (dbError) {
        console.error('Database Error:', dbError)
        setError(`Database Error: ${dbError.message}`)
        return
      }

      console.log('Database Response:', data)
      setResult({ directDB: data })

    } catch (err: any) {
      console.error('Database Test Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Supabase Connection Test
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Environment Check
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (✓)' : 'Not set (✗)'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button 
              variant="contained" 
              onClick={testConnection} 
              disabled={loading}
            >
              Test Edge Function
            </Button>
            <Button 
              variant="outlined" 
              onClick={testDirectDatabase} 
              disabled={loading}
            >
              Test Direct DB
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Success!</strong> Check console for full response.
              </Typography>
              <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </Alert>
          )}

          {loading && (
            <Typography variant="body2" color="text.secondary">
              Testing connection...
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}