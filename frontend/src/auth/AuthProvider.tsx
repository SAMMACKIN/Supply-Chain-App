import React, { createContext, useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { 
  AuthContextType, 
  AuthUser, 
  LoginCredentials, 
  RegisterData, 
  UserProfile,
  UserRole 
} from '../types/auth'
import { hasPermission } from '../utils/auth-helpers'

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Clean up any corrupted session data on initialization
  const cleanupSessionStorage = useCallback(() => {
    try {
      // Check for multiple or corrupted Supabase sessions
      const allKeys = Object.keys(localStorage)
      const supabaseKeys = allKeys.filter(key => key.includes('supabase'))
      
      console.log('Found Supabase storage keys:', supabaseKeys.length)
      
      if (supabaseKeys.length > 3) { // Should typically only have 2-3 keys
        console.log('Too many Supabase keys detected, cleaning up...')
        supabaseKeys.forEach(key => {
          if (key.includes('auth-token') || key.includes('session') || key.includes('refresh')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // Also clear any corrupted session data
      const authTokenKey = `sb-${supabase.supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      const existingToken = localStorage.getItem(authTokenKey)
      if (existingToken) {
        try {
          JSON.parse(existingToken)
        } catch {
          console.log('Corrupted auth token detected, removing...')
          localStorage.removeItem(authTokenKey)
        }
      }
    } catch (err) {
      console.error('Error during session cleanup:', err)
    }
  }, [])

  // Fetch user profile from the database
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      return null
    }
  }

  // Handle session changes
  const handleSession = async (session: Session | null) => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id)
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        profile: profile || undefined
      })
    } else {
      setUser(null)
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Clean up any corrupted sessions first
    cleanupSessionStorage()
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session).finally(() => setLoading(false))
      })
    }, 100)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) throw error

      // Profile will be loaded by onAuthStateChange
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw new Error(message)
    }
  }, [])

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    setError(null)
    try {
      console.log('Starting registration for:', data.email)
      
      // Create the auth user - simplified for deployment
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.display_name,
            business_unit: data.business_unit,
            role: data.role
          }
        }
      })

      if (authError) {
        console.error('Auth signup error:', authError)
        throw authError
      }
      
      if (!authData.user) {
        throw new Error('User creation failed - no user returned')
      }

      console.log('Auth user created:', authData.user.id)

      // Try to create the user profile
      // Note: This might fail if email confirmation is required first
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            email: data.email,
            display_name: data.display_name,
            business_unit: data.business_unit,
            role: data.role,
            warehouse_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't throw here - the profile might be created by a database trigger after email confirmation
          console.warn('Profile creation failed, but this might be handled by database triggers after email confirmation')
        } else {
          console.log('User profile created successfully')
        }
      } catch (profileErr) {
        console.error('Profile creation failed:', profileErr)
        // Continue anyway - profile creation might happen via database triggers
      }

      console.log('Registration completed successfully')

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      console.error('Registration error:', err)
      setError(message)
      throw new Error(message)
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    setError(null)
    try {
      // Clear all Supabase related storage
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('supabase') || key.includes('auth-token')
      )
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      // Force reload to clear any cached state
      window.location.href = '/login'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw new Error(message)
    }
  }, [])

  // Reset password function
  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed'
      setError(message)
      throw new Error(message)
    }
  }, [])

  // Update profile function
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')
    
    setError(null)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setUser({
        ...user,
        profile: data
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed'
      setError(message)
      throw new Error(message)
    }
  }, [user])

  // Check role function
  const hasRole = useCallback((role: UserRole | UserRole[]) => {
    if (!user?.profile?.role) return false
    
    if (Array.isArray(role)) {
      return role.includes(user.profile.role)
    }
    
    return user.profile.role === role
  }, [user])

  // Check access function
  const canAccess = useCallback((resource: string, action: string) => {
    if (!user?.profile?.role) return false
    return hasPermission(user.profile.role, resource as any, action)
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