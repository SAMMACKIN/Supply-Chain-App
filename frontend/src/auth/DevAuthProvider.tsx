import React, { createContext, useState, useCallback } from 'react'
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

// Mock user for development
const mockUser: AuthUser = {
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock login - accepts any credentials
  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null)
    setLoading(true)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // For dev mode, accept any credentials
    if (credentials.email && credentials.password) {
      setUser(mockUser)
      setLoading(false)
      
      // Store in localStorage for persistence
      localStorage.setItem('dev-auth-user', JSON.stringify(mockUser))
      
    } else {
      setError('Please enter email and password')
      setLoading(false)
      throw new Error('Please enter email and password')
    }
  }, [])

  // Mock register
  const register = useCallback(async (data: RegisterData) => {
    return login({ email: data.email, password: data.password })
  }, [login])

  // Mock logout
  const logout = useCallback(async () => {
    setUser(null)
    localStorage.removeItem('dev-auth-user')
  }, [])

  // Mock update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (user) {
      const updatedUser = {
        ...user,
        profile: user.profile ? { ...user.profile, ...updates } : null
      }
      setUser(updatedUser)
      localStorage.setItem('dev-auth-user', JSON.stringify(updatedUser))
    }
  }, [user])

  // Check for saved user on mount
  React.useEffect(() => {
    const savedUser = localStorage.getItem('dev-auth-user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}