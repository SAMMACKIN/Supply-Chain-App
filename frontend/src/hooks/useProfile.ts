import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import type { UserProfile } from '../types/auth'

export function useProfile() {
  const { user, updateProfile: updateAuthProfile } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const profile = user?.profile
  
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user?.id) {
      setError('No user logged in')
      return
    }
    
    setUpdating(true)
    setError(null)
    
    try {
      // In mock mode, updateAuthProfile handles everything
      await updateAuthProfile(updates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [user?.id, updateAuthProfile])
  
  const refreshProfile = useCallback(async () => {
    // In mock mode, profile is already in memory
  }, [])
  
  return {
    profile,
    updateProfile,
    refreshProfile,
    updating,
    error
  }
}