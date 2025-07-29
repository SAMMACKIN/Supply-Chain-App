import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api-client'

export function useQuotas(filters?: {
  direction?: 'BUY' | 'SELL'
  month?: string
}) {
  return useQuery({
    queryKey: ['quotas', filters],
    queryFn: async () => {
      console.log('Fetching quotas from Railway API')
      const response = await api.quotas.list(filters)
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}