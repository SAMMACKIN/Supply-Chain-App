import React from 'react'
import { Alert, Box } from '@mui/material'
import { Code as CodeIcon } from '@mui/icons-material'

export function DevBanner() {
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    return null
  }

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert 
        severity="info" 
        icon={<CodeIcon />}
        sx={{ 
          borderRadius: 0,
          '& .MuiAlert-message': {
            width: '100%',
            textAlign: 'center'
          }
        }}
      >
        🚧 Development Mode - Using Mock Authentication (Docker/Supabase not running)
      </Alert>
    </Box>
  )
}