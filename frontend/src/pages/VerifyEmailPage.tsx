import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button
} from '@mui/material'
import {
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'

export function VerifyEmailPage() {
  const navigate = useNavigate()

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
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 3
            }}
          />
          <Typography variant="h5" gutterBottom>
            Email Verification
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Email verification is not required in development mode.
            You can proceed to login with any email.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGoToLogin}
            fullWidth
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    </Container>
  )
}