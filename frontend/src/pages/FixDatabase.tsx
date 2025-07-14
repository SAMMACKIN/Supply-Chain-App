import { useState } from 'react'
import { Box, Typography, Button, Alert } from '@mui/material'
import { supabase } from '../lib/supabase'

export function FixDatabase() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const fixUpdatedAt = async () => {
    setLoading(true)
    setError('')
    setResult('')

    try {
      // First, drop the trigger
      const { error: dropError } = await supabase.rpc('exec_sql', {
        sql: 'DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off;'
      })

      if (dropError) {
        console.log('Could not drop trigger (may not exist):', dropError)
      }

      // Add the updated_at column
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE call_off 
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        `
      })

      if (alterError) {
        throw new Error(`Failed to add column: ${alterError.message}`)
      }

      // Recreate the trigger
      const { error: triggerError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TRIGGER update_call_off_updated_at 
          BEFORE UPDATE ON call_off 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `
      })

      if (triggerError) {
        console.log('Could not create trigger:', triggerError)
      }

      setResult('Successfully added updated_at column to call_off table!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Fix Database
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        This will add the missing updated_at column to the call_off table.
      </Typography>

      <Button 
        variant="contained" 
        onClick={fixUpdatedAt}
        disabled={loading}
      >
        {loading ? 'Fixing...' : 'Fix Updated At Column'}
      </Button>

      {result && (
        <Alert severity="success" sx={{ mt: 3 }}>
          {result}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
    </Box>
  )
}