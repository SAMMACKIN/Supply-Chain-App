import React, { useState, useEffect, useCallback } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { AuthContext } from './AuthContext'
import { MockAuthProvider } from './MockAuthProvider'
import type { 
  AuthContextType, 
  AuthUser, 
  LoginCredentials, 
  RegisterData, 
  UserProfile,
  UserRole 
} from '../types/auth'

interface ClerkAuthProviderProps {
  children: React.ReactNode
}

// Map Clerk role metadata to our UserRole enum
const mapClerkRoleToUserRole = (clerkRole?: string): UserRole => {
  switch (clerkRole?.toLowerCase()) {
    case 'ops':
      return 'OPS'
    case 'trade':
      return 'TRADE'
    case 'planner':
      return 'PLANNER'
    case 'admin':
      return 'ADMIN'
    default:
      return 'OPS' // Default role for users without specific role
  }
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  // Check if Clerk is available (has publishable key)
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'
  
  // If no Clerk key in dev mode, fall back to MockAuthProvider
  if (!PUBLISHABLE_KEY && DEV_MODE) {
    console.warn('🔄 Falling back to MockAuthProvider in development mode')
    return <MockAuthProvider>{children}</MockAuthProvider>
  }

  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut } = useClerkAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Convert Clerk user to our AuthUser format
  useEffect(() => {
    if (!isLoaded) {
      setLoading(true)
      return
    }

    if (isSignedIn && clerkUser) {
      // Extract role from Clerk user metadata
      const clerkRole = clerkUser.publicMetadata?.role as string
      const userRole = mapClerkRoleToUserRole(clerkRole)

      // Create UserProfile from Clerk user data
      const profile: UserProfile = {
        id: clerkUser.id,
        user_id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        display_name: clerkUser.fullName || clerkUser.firstName || 'User',
        business_unit: (clerkUser.publicMetadata?.businessUnit as string) || 'Default',
        role: userRole,
        warehouse_ids: (clerkUser.publicMetadata?.warehouseIds as string[]) || [],
        created_at: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: clerkUser.updatedAt?.toISOString() || new Date().toISOString()
      }

      // Create AuthUser
      const authUser: AuthUser = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        profile
      }

      setUser(authUser)
    } else {
      setUser(null)
    }

    setLoading(false)
  }, [isLoaded, isSignedIn, clerkUser])

  // Auth methods - these will redirect to Clerk's hosted authentication
  const login = useCallback(async (_credentials: LoginCredentials) => {
    // Clerk handles login through their UI components
    // This method is kept for interface compatibility
    // Navigation is handled by React Router
  }, [])

  const register = useCallback(async (_data: RegisterData) => {
    // Clerk handles registration through their UI components
    // This method is kept for interface compatibility
    // Navigation is handled by React Router
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await signOut()
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    }
  }, [signOut])

  const resetPassword = useCallback(async (_email: string) => {
    // Clerk handles password reset through their hosted UI
    // This method is kept for interface compatibility
    window.location.href = '/forgot-password'
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user || !clerkUser) throw new Error('No user logged in')
    
    setError(null)
    
    try {
      // Update Clerk user metadata
      const metadataUpdates: Record<string, any> = {}
      
      if (updates.role) {
        metadataUpdates.role = updates.role.toLowerCase()
      }
      if (updates.business_unit) {
        metadataUpdates.businessUnit = updates.business_unit
      }
      if (updates.warehouse_ids) {
        metadataUpdates.warehouseIds = updates.warehouse_ids
      }

      if (Object.keys(metadataUpdates).length > 0) {
        await clerkUser.update({
          publicMetadata: {
            ...clerkUser.publicMetadata,
            ...metadataUpdates
          }
        })
      }

      // Update display name if provided
      if (updates.display_name) {
        const [firstName, ...lastNameParts] = updates.display_name.split(' ')
        await clerkUser.update({
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || ''
        })
      }

      // The useEffect will automatically update the local user state
      // when Clerk user data changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed')
      throw err
    }
  }, [user, clerkUser])

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!user?.profile?.role) return false
    
    if (Array.isArray(role)) {
      return role.includes(user.profile.role)
    }
    
    return user.profile.role === role
  }, [user])

  const canAccess = useCallback((resource: string, action: string) => {
    if (!user?.profile?.role) return false

    // Import and use the existing ROLE_PERMISSIONS logic
    const ROLE_PERMISSIONS = {
      OPS: {
        calloffs: ['create', 'read', 'update', 'delete'],
        quotas: ['create', 'read', 'update', 'delete'],
        transport: ['create', 'read', 'update', 'delete'],
        inventory: ['read', 'update'],
        users: []
      },
      TRADE: {
        calloffs: ['create', 'read', 'update'],
        quotas: ['read'],
        transport: ['read'],
        inventory: ['read'],
        users: []
      },
      PLANNER: {
        calloffs: ['read', 'fulfill'],
        quotas: ['read'],
        transport: ['create', 'read', 'update'],
        inventory: ['read'],
        users: []
      },
      ADMIN: {
        calloffs: ['create', 'read', 'update', 'delete'],
        quotas: ['create', 'read', 'update', 'delete'],
        transport: ['create', 'read', 'update', 'delete'],
        inventory: ['create', 'read', 'update', 'delete'],
        users: ['create', 'read', 'update', 'delete']
      }
    } as const

    const permissions = ROLE_PERMISSIONS[user.profile.role]
    if (!permissions) return false

    const resourcePermissions = permissions[resource as keyof typeof permissions] as string[]
    return resourcePermissions?.includes(action) || false
  }, [user])

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    hasRole,
    canAccess
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}