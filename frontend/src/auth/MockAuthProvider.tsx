import React, { useState, useEffect, useCallback } from 'react'
import { AuthContext } from './AuthProvider'
import type { 
  AuthContextType, 
  AuthUser, 
  LoginCredentials, 
  RegisterData, 
  UserProfile,
  UserRole 
} from '../types/auth'

interface MockAuthProviderProps {
  children: React.ReactNode
}

const mockProfiles: Record<string, UserProfile> = {
  'test-user-id': {
    id: 'test-profile-id',
    user_id: 'test-user-id',
    email: 'test@example.com',
    display_name: 'Test User',
    business_unit: 'Development',
    role: 'ADMIN',
    warehouse_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export function MockAuthProvider({ children }: MockAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate loading and check for existing session
    const timer = setTimeout(() => {
      const storedUser = localStorage.getItem('mock_auth_user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null)
    setLoading(true)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock successful login
    const mockUser: AuthUser = {
      id: 'test-user-id',
      email: credentials.email,
      profile: mockProfiles['test-user-id']
    }

    setUser(mockUser)
    localStorage.setItem('mock_auth_user', JSON.stringify(mockUser))
    setLoading(false)
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    setError(null)
    setLoading(true)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Create new mock user
    const newUserId = `user-${Date.now()}`
    const newProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      user_id: newUserId,
      email: data.email,
      display_name: data.display_name,
      business_unit: data.business_unit,
      role: data.role,
      warehouse_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    mockProfiles[newUserId] = newProfile

    const mockUser: AuthUser = {
      id: newUserId,
      email: data.email,
      profile: newProfile
    }

    setUser(mockUser)
    localStorage.setItem('mock_auth_user', JSON.stringify(mockUser))
    setLoading(false)
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setUser(null)
    localStorage.removeItem('mock_auth_user')
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`Mock: Password reset email sent to ${email}`)
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')
    
    setError(null)
    await new Promise(resolve => setTimeout(resolve, 500))

    const updatedProfile = { ...user.profile!, ...updates, updated_at: new Date().toISOString() }
    const updatedUser = { ...user, profile: updatedProfile }
    
    setUser(updatedUser)
    localStorage.setItem('mock_auth_user', JSON.stringify(updatedUser))
    
    // Update mock profiles
    mockProfiles[user.id] = updatedProfile
  }, [user])

  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!user?.profile?.role) return false
    
    if (Array.isArray(role)) {
      return role.includes(user.profile.role)
    }
    
    return user.profile.role === role
  }, [user])

  const canAccess = useCallback((resource: string, action: string) => {
    return true // Mock: allow all access in development
  }, [])

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