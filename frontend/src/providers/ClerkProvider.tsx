import React from 'react'
import { ClerkProvider as ClerkProviderBase } from '@clerk/clerk-react'

interface ClerkProviderProps {
  children: React.ReactNode
}

// Get Clerk publishable key from environment variables
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

export function ClerkProvider({ children }: ClerkProviderProps) {
  // In development mode, if no Clerk key is provided, show a warning but continue
  if (!PUBLISHABLE_KEY) {
    if (DEV_MODE) {
      console.warn('⚠️ Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env file for authentication to work.')
      // Return children without Clerk wrapper in dev mode when key is missing
      return <>{children}</>
    } else {
      throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env file.')
    }
  }

  return (
    <ClerkProviderBase publishableKey={PUBLISHABLE_KEY}>
      {children}
    </ClerkProviderBase>
  )
}