import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchQuotaBalance } from '../services/calloff-api'
import { enhanceQuotaBalance } from '../utils/quota-balance-utils'
import type { Quota, QuotaBalance, QuotaBalanceEnhanced, QuotaWithBalance } from '../types/quota-balance'

/**
 * Custom hook to fetch quota balances for multiple quotas efficiently
 * Uses React Query for caching and parallel requests
 */
export function useBatchQuotaBalances(quotas: Quota[]) {
  // Use useQueries for parallel fetching with individual caching
  const balanceQueries = useQueries({
    queries: quotas.map((quota) => ({
      queryKey: ['quota-balance', quota.quota_id],
      queryFn: () => fetchQuotaBalance(quota.quota_id),
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
      // Don't refetch on window focus for balance data
      refetchOnWindowFocus: false,
      // Enable background refetch
      refetchOnMount: 'always',
    }))
  })

  // Process the results to combine quotas with their balance data
  const quotasWithBalances: QuotaWithBalance[] = quotas.map((quota, index) => {
    const balanceQuery = balanceQueries[index]
    
    let enhancedBalance: QuotaBalanceEnhanced | undefined
    if (balanceQuery.data) {
      enhancedBalance = enhanceQuotaBalance(balanceQuery.data)
    }

    return {
      ...quota,
      balance: enhancedBalance,
      balance_loading: balanceQuery.isLoading,
      balance_error: balanceQuery.error ? (balanceQuery.error as Error).message : undefined
    }
  })

  // Aggregate loading and error states
  const isLoading = balanceQueries.some(query => query.isLoading)
  const isError = balanceQueries.some(query => query.isError)
  const errors = balanceQueries
    .map((query, index) => ({ 
      quota_id: quotas[index].quota_id, 
      error: query.error 
    }))
    .filter(item => item.error)

  // Count successful vs failed requests
  const successCount = balanceQueries.filter(query => query.isSuccess).length
  const totalCount = balanceQueries.length

  return {
    quotasWithBalances,
    isLoading,
    isError,
    errors,
    successCount,
    totalCount,
    // Utility function to refetch all balances
    refetchAll: () => {
      balanceQueries.forEach(query => query.refetch())
    },
    // Utility function to refetch specific quota balance
    refetchQuota: (quotaId: string) => {
      const index = quotas.findIndex(q => q.quota_id === quotaId)
      if (index >= 0) {
        balanceQueries[index].refetch()
      }
    }
  }
}

/**
 * Hook to fetch a single quota balance with enhanced data
 */
export function useQuotaBalance(quotaId: string) {
  return useQuery({
    queryKey: ['quota-balance', quotaId],
    queryFn: () => fetchQuotaBalance(quotaId),
    select: (data: QuotaBalance) => enhanceQuotaBalance(data),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    enabled: !!quotaId,
  })
}

/**
 * Hook for optimistic quota balance updates
 * Useful when creating call-offs to show immediate feedback
 */
export function useOptimisticQuotaBalance(
  quotaId: string, 
  requestedQty: number = 0
) {
  const { data: balance, ...rest } = useQuotaBalance(quotaId)
  
  // Calculate optimistic balance if we have data and a requested quantity
  const optimisticBalance: QuotaBalanceEnhanced | undefined = balance && requestedQty > 0 
    ? enhanceQuotaBalance({
        ...balance,
        consumed_bundles: balance.consumed_bundles + requestedQty,
        remaining_qty_tonnes: balance.remaining_qty_tonnes - requestedQty,
        utilization_pct: ((balance.consumed_bundles + requestedQty) / balance.quota_qty_tonnes) * 100
      })
    : balance

  return {
    ...rest,
    data: optimisticBalance,
    originalBalance: balance
  }
}

/**
 * Hook to get aggregated balance statistics
 */
export function useQuotaBalanceStats(quotas: Quota[]) {
  const { quotasWithBalances } = useBatchQuotaBalances(quotas)
  
  const stats = quotasWithBalances.reduce(
    (acc, quota) => {
      if (quota.balance) {
        acc.totalQuotas++
        
        switch (quota.balance.status) {
          case 'available':
            acc.availableCount++
            break
          case 'low_stock':
            acc.lowStockCount++
            break
          case 'over_allocated':
            acc.overAllocatedCount++
            break
        }
        
        acc.totalCapacity += quota.balance.quota_qty_tonnes
        acc.totalConsumed += quota.balance.consumed_bundles
        acc.totalRemaining += quota.balance.remaining_qty_tonnes
      }
      
      return acc
    },
    {
      totalQuotas: 0,
      availableCount: 0,
      lowStockCount: 0,
      overAllocatedCount: 0,
      totalCapacity: 0,
      totalConsumed: 0,
      totalRemaining: 0,
      get overallUtilization() {
        return this.totalCapacity > 0 ? (this.totalConsumed / this.totalCapacity) * 100 : 0
      }
    }
  )
  
  return stats
}