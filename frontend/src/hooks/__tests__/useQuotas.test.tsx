import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useQuotas } from '../useQuotas'
import { api } from '../../services/api-client'
import type { Quota } from '../../types/calloff'

// Mock the api module
vi.mock('../../services/api-client', () => ({
  api: {
    quotas: {
      list: vi.fn()
    }
  }
}))

// Mock quota data
const mockQuotas: Quota[] = [
  {
    quota_id: '1',
    counterparty_id: 'cp1',
    direction: 'BUY',
    period_month: '2025-01',
    qty_t: 100,
    tolerance_pct: 5,
    incoterm_code: 'EXW',
    metal_code: 'AL',
    business_unit_id: 'bu1',
    created_at: '2025-01-01T00:00:00Z',
    counterparty: {
      counterparty_id: 'cp1',
      company_name: 'Test Company 1',
      company_code: 'TC1',
      counterparty_type: 'SUPPLIER',
      country_code: 'US',
      is_active: true
    }
  },
  {
    quota_id: '2',
    counterparty_id: 'cp2',
    direction: 'SELL',
    period_month: '2025-02',
    qty_t: 200,
    tolerance_pct: 10,
    incoterm_code: 'FOB',
    metal_code: 'CU',
    business_unit_id: 'bu2',
    created_at: '2025-01-02T00:00:00Z',
    counterparty: {
      counterparty_id: 'cp2',
      company_name: 'Test Company 2',
      company_code: 'TC2',
      counterparty_type: 'CUSTOMER',
      country_code: 'UK',
      is_active: true
    }
  }
]

describe('useQuotas', () => {
  let queryClient: QueryClient
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  // Helper function to create wrapper
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0
        }
      }
    })
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    queryClient?.clear()
  })

  describe('Loading State', () => {
    it('should start with loading state', () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('Success State', () => {
    it('should fetch quotas successfully without filters', async () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockResolvedValueOnce({ data: mockQuotas })

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockQuotas)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(mockList).toHaveBeenCalledWith(undefined)
      expect(consoleLogSpy).toHaveBeenCalledWith('Fetching quotas from Railway API')
    })

    it('should fetch quotas with direction filter', async () => {
      const mockList = vi.mocked(api.quotas.list)
      const filteredQuotas = mockQuotas.filter(q => q.direction === 'BUY')
      mockList.mockResolvedValueOnce({ data: filteredQuotas })

      const { result } = renderHook(
        () => useQuotas({ direction: 'BUY' }), 
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(filteredQuotas)
      expect(mockList).toHaveBeenCalledWith({ direction: 'BUY' })
    })

    it('should fetch quotas with month filter', async () => {
      const mockList = vi.mocked(api.quotas.list)
      const filteredQuotas = mockQuotas.filter(q => q.period_month === '2025-01')
      mockList.mockResolvedValueOnce({ data: filteredQuotas })

      const { result } = renderHook(
        () => useQuotas({ month: '2025-01' }), 
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(filteredQuotas)
      expect(mockList).toHaveBeenCalledWith({ month: '2025-01' })
    })

    it('should fetch quotas with multiple filters', async () => {
      const mockList = vi.mocked(api.quotas.list)
      const filteredQuotas = mockQuotas.filter(
        q => q.direction === 'SELL' && q.period_month === '2025-02'
      )
      mockList.mockResolvedValueOnce({ data: filteredQuotas })

      const { result } = renderHook(
        () => useQuotas({ direction: 'SELL', month: '2025-02' }), 
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(filteredQuotas)
      expect(mockList).toHaveBeenCalledWith({ direction: 'SELL', month: '2025-02' })
    })
  })

  describe('Error State', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error: Failed to fetch quotas')
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed')
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockRejectedValueOnce(networkError)

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(networkError)
    })
  })

  describe('Query Key and Caching', () => {
    it('should use correct query key without filters', () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockResolvedValueOnce({ data: mockQuotas })

      renderHook(() => useQuotas(), { wrapper: createWrapper() })

      const queryCache = queryClient.getQueryCache()
      const queries = queryCache.getAll()
      
      expect(queries).toHaveLength(1)
      expect(queries[0].queryKey).toEqual(['quotas', undefined])
    })

    it('should use different query keys for different filters', async () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockResolvedValue({ data: mockQuotas })

      const wrapper = createWrapper()

      // First hook with no filters
      const { result: result1 } = renderHook(() => useQuotas(), { wrapper })
      
      // Second hook with direction filter
      const { result: result2 } = renderHook(
        () => useQuotas({ direction: 'BUY' }), 
        { wrapper }
      )
      
      // Third hook with month filter
      const { result: result3 } = renderHook(
        () => useQuotas({ month: '2025-01' }), 
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
        expect(result2.current.isSuccess).toBe(true)
        expect(result3.current.isSuccess).toBe(true)
      })

      const queryCache = queryClient.getQueryCache()
      const queries = queryCache.getAll()
      
      expect(queries).toHaveLength(3)
      
      const queryKeys = queries.map(q => q.queryKey)
      expect(queryKeys).toContainEqual(['quotas', undefined])
      expect(queryKeys).toContainEqual(['quotas', { direction: 'BUY' }])
      expect(queryKeys).toContainEqual(['quotas', { month: '2025-01' }])
    })

    it('should respect staleTime configuration', async () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockResolvedValue({ data: mockQuotas })

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that the query has the correct staleTime
      const query = queryClient.getQueryCache().find(['quotas', undefined])
      expect(query?.options.staleTime).toBe(30 * 1000) // 30 seconds
    })
  })

  describe('Refetching', () => {
    it('should support manual refetch', async () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList
        .mockResolvedValueOnce({ data: mockQuotas })
        .mockResolvedValueOnce({ data: [mockQuotas[0]] })

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockQuotas)
      expect(mockList).toHaveBeenCalledTimes(1)

      // Trigger refetch
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.data).toEqual([mockQuotas[0]])
      })

      expect(mockList).toHaveBeenCalledTimes(2)
      expect(consoleLogSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Filter Parameter Changes', () => {
    it('should refetch when filters change', async () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList
        .mockResolvedValueOnce({ data: mockQuotas })
        .mockResolvedValueOnce({ data: [mockQuotas[0]] })

      const { result, rerender } = renderHook(
        ({ filters }) => useQuotas(filters),
        {
          wrapper: createWrapper(),
          initialProps: { filters: undefined as Parameters<typeof useQuotas>[0] }
        }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockQuotas)
      expect(mockList).toHaveBeenCalledWith(undefined)

      // Change filters
      rerender({ filters: { direction: 'BUY' } })

      await waitFor(() => {
        expect(result.current.data).toEqual([mockQuotas[0]])
      })

      expect(mockList).toHaveBeenCalledWith({ direction: 'BUY' })
      expect(mockList).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Transformation', () => {
    it('should return data as received from API', async () => {
      const mockList = vi.mocked(api.quotas.list)
      const apiResponse = { 
        data: mockQuotas,
        // Additional metadata that might be returned but ignored
        meta: { total: 2, page: 1 }
      }
      mockList.mockResolvedValueOnce(apiResponse)

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should only return the data property
      expect(result.current.data).toEqual(mockQuotas)
      expect(result.current.data).not.toHaveProperty('meta')
    })

    it('should handle empty data array', async () => {
      const mockList = vi.mocked(api.quotas.list)
      mockList.mockResolvedValueOnce({ data: [] })

      const { result } = renderHook(() => useQuotas(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
      expect(result.current.data).toBeInstanceOf(Array)
    })
  })
})