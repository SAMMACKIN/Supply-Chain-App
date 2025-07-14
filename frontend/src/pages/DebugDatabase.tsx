import { useState } from 'react'
import { Box, Typography, Button, Card, CardContent, Alert } from '@mui/material'
import { supabase } from '../lib/supabase'

export function DebugDatabase() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkQuotas = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Checking quotas table...')
      const { data, error: dbError } = await supabase
        .from('quota')
        .select('*')

      if (dbError) {
        console.error('Database Error:', dbError)
        setError(`Database Error: ${dbError.message}`)
        return
      }

      console.log('Quotas found:', data)
      setResult({ quotas: data, count: data?.length || 0 })

    } catch (err: any) {
      console.error('Check Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkTables = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Checking available tables...')
      const { data, error: dbError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')

      if (dbError) {
        console.error('Database Error:', dbError)
        setError(`Database Error: ${dbError.message}`)
        return
      }

      console.log('Tables found:', data)
      setResult({ tables: data })

    } catch (err: any) {
      console.error('Check Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Database Debug
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database Structure Check
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button 
              variant="contained" 
              onClick={checkQuotas} 
              disabled={loading}
            >
              Check Quotas
            </Button>
            <Button 
              variant="outlined" 
              onClick={checkTables} 
              disabled={loading}
            >
              List Tables
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Result:</strong>
              </Typography>
              <pre style={{ fontSize: '12px', marginTop: '8px', maxHeight: '300px', overflow: 'auto' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </Alert>
          )}

          {loading && (
            <Typography variant="body2" color="text.secondary">
              Checking database...
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}