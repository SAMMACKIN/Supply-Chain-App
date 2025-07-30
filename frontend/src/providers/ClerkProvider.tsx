import React from 'react'
import { ClerkProvider as ClerkProviderBase } from '@clerk/clerk-react'

interface ClerkProviderProps {
  children: React.ReactNode
}

// Get Clerk publishable key from environment variables
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env file.')
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  return (
    <ClerkProviderBase publishableKey={PUBLISHABLE_KEY}>
      {children}
    </ClerkProviderBase>
  )
}