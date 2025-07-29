import React, { createContext, useState, useEffect, useCallback } from 'react'
import type { 
  AuthContextType, 
  AuthUser, 
  LoginCredentials, 
  RegisterData, 
  UserProfile,
} from '../types/auth'
import { hasPermission } from '../utils/auth-helpers'

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
}

// Simple dev user - no external dependencies
const devUser: AuthUser = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  profile: {
    user_id: 'dev-user-123',
    email: 'dev@example.com',
    full_name: 'Development User',
    company: 'Dev Company',
    role: 'admin',
    department: 'IT',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing session
  useEffect(() => {
    const savedAuth = localStorage.getItem('dev-auth')
    if (savedAuth === 'true') {
      setUser(devUser)
    }
    setLoading(false)
  }, [])

  const handleSession = useCallback((sessionData: any) => {
    console.log('handleSession called with:', sessionData)
    // For dev mode, we ignore session data
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null)
    setLoading(true)
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Accept any credentials in dev mode
      if (credentials.email && credentials.password) {
        setUser(devUser)
        localStorage.setItem('dev-auth', 'true')
        console.log('Dev mode: Logged in successfully')
      } else {
        throw new Error('Please enter email and password')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    // In dev mode, registration is the same as login
    return login({ email: data.email, password: data.password })
  }, [login])

  const logout = useCallback(async () => {
    setUser(null)
    localStorage.removeItem('dev-auth')
    console.log('Dev mode: Logged out')
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (user && user.profile) {
      const updatedUser = {
        ...user,
        profile: { ...user.profile, ...updates }
      }
      setUser(updatedUser)
    }
  }, [user])

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    hasPermission: (permission: string) => hasPermission(user, permission),
    handleSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}