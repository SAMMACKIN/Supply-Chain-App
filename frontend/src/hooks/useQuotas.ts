import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { api } from '../services/api-client'

// Check if new API is configured
const USE_NEW_API = import.meta.env.VITE_API_URL

export function useQuotas(filters?: {
  direction?: 'BUY' | 'SELL'
  month?: string
}) {
  return useQuery({
    queryKey: ['quotas', filters],
    queryFn: async () => {
      if (USE_NEW_API) {
        // Use new Railway API
        console.log('Using Railway API for quotas')
        const response = await api.quotas.list(filters)
        return response.data
      } else {
        // Use existing Supabase
        console.log('Using Supabase for quotas')
        let query = supabase
          .from('quota')
          .select(`
            *,
            counterparty:counterparty_id(
              company_name,
              company_code
            )
          `)
          .eq('is_active', true)
          
        if (filters?.direction) {
          query = query.eq('direction', filters.direction)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        return data || []
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}