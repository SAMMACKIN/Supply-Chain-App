import React from 'react'
import { UserButton, useAuth, useUser } from '@clerk/clerk-react'
import { Button, Avatar, Box, Typography } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { SignInButton } from './SignInButton'

interface UserProfileButtonProps {
  showName?: boolean
  variant?: 'avatar' | 'button'
}

export function UserProfileButton({ 
  showName = false, 
  variant = 'avatar' 
}: UserProfileButtonProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <Avatar sx={{ width: 32, height: 32 }}>
        <AccountCircleIcon />
      </Avatar>
    )
  }

  // Show sign in button if not signed in
  if (!isSignedIn) {
    return <SignInButton variant="outlined" size="small" />
  }

  // Show user profile based on variant
  if (variant === 'button' && user) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: '32px',
                height: '32px'
              }
            }
          }}
        />
        {showName && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {user.fullName || user.firstName || 'User'}
          </Typography>
        )}
      </Box>
    )
  }

  // Default avatar variant
  return (
    <UserButton 
      appearance={{
        elements: {
          userButtonAvatarBox: {
            width: '32px',
            height: '32px'
          }
        }
      }}
    />
  )
}