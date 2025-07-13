import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
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
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          display_name: updates.display_name,
          business_unit: updates.business_unit,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      // Update the auth context with new profile data
      await updateAuthProfile(data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [user?.id, updateAuthProfile])
  
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      
      await updateAuthProfile(data)
    } catch (err) {
      console.error('Failed to refresh profile:', err)
    }
  }, [user?.id, updateAuthProfile])
  
  return {
    profile,
    updateProfile,
    refreshProfile,
    updating,
    error
  }
}