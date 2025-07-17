import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Link,
  CircularProgress,
  InputAdornment,
  IconButton,
  Paper,
  Container
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import type { LoginCredentials } from '../types/auth'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const from = location.state?.from?.pathname || '/dashboard'
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      console.log('User already logged in, redirecting to:', from)
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema)
  })
  
  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await login(data)
      console.log('Login successful, navigating to:', from)
      // Add a small delay to ensure auth state is fully updated
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 100)
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }
  
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Sign In
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Welcome back to Supply Chain Logistics
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('email')}
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              {...register('password')}
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Link component={RouterLink} to="/reset-password" variant="body2">
                Forgot password?
              </Link>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}