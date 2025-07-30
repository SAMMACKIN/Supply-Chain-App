import React from 'react'
import { SignInButton as ClerkSignInButton, useAuth } from '@clerk/clerk-react'
import { Button } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'

interface SignInButtonProps {
  variant?: 'text' | 'outlined' | 'contained'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  className?: string
}

export function SignInButton({ 
  variant = 'contained', 
  size = 'medium', 
  fullWidth = false,
  className 
}: SignInButtonProps) {
  const { isSignedIn } = useAuth()

  // Don't show sign in button if user is already signed in
  if (isSignedIn) {
    return null
  }

  return (
    <ClerkSignInButton mode="modal">
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        startIcon={<LoginIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        Sign In
      </Button>
    </ClerkSignInButton>
  )
}