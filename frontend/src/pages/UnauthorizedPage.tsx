import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Button,
  Paper
} from '@mui/material'
import {
  Block as BlockIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  
  const handleGoHome = () => {
    navigate('/dashboard')
  }
  
  const handleGoBack = () => {
    navigate(-1)
  }
  
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center'
        }}
      >
        <Paper elevation={3} sx={{ p: 6, width: '100%' }}>
          <BlockIcon
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 3
            }}
          />
          
          <Typography variant="h3" component="h1" gutterBottom>
            403
          </Typography>
          
          <Typography variant="h5" gutterBottom>
            Access Denied
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
            >
              Go to Dashboard
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}