import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        console.log('Verification params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

        if (type === 'signup' && accessToken && refreshToken) {
          // Verify the email using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Verification error:', error)
            setStatus('error')
            setMessage(error.message)
            return
          }

          if (data.user) {
            console.log('Email verified successfully for user:', data.user.id)
            
            // Check if user profile exists, if not create it
            const { error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', data.user.id)
              .single()

            if (profileError && profileError.code === 'PGRST116') {
              // Profile doesn't exist, create it with metadata from auth
              console.log('Creating user profile from metadata:', data.user.user_metadata)
              
              const { error: insertError } = await supabase
                .from('user_profiles')
                .insert({
                  user_id: data.user.id,
                  email: data.user.email!,
                  display_name: data.user.user_metadata.display_name || data.user.email!.split('@')[0],
                  business_unit: data.user.user_metadata.business_unit || 'General',
                  role: data.user.user_metadata.role || 'TRADE',
                  warehouse_ids: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })

              if (insertError) {
                console.error('Failed to create user profile:', insertError)
                setStatus('error')
                setMessage('Email verified but failed to create user profile. Please contact support.')
                return
              }
              
              console.log('User profile created successfully')
            }

            setStatus('success')
            setMessage('Your email has been verified successfully! You can now log in.')
          } else {
            setStatus('error')
            setMessage('Verification failed: No user data received.')
          }
        } else {
          setStatus('error')
          setMessage('Invalid verification link. Please check your email and try again.')
        }
      } catch (err) {
        console.error('Verification process failed:', err)
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
      }
    }

    verifyEmail()
  }, [searchParams])

  const handleGoToLogin = () => {
    navigate('/login')
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
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {status === 'loading' && (
            <>
              <CircularProgress sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom>
                Verifying your email...
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please wait while we verify your email address.
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon
                sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 3
                }}
              />
              <Typography variant="h5" gutterBottom>
                Email Verified!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {message}
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon
                sx={{
                  fontSize: 80,
                  color: 'error.main',
                  mb: 3
                }}
              />
              <Typography variant="h5" gutterBottom>
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Button
                variant="outlined"
                onClick={handleGoToLogin}
                fullWidth
              >
                Back to Login
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  )
}