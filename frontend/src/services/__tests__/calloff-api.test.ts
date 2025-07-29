import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { 
  Quota, 
  QuotaBalance, 
  CallOff, 
  CreateCallOffRequest, 
  Counterparty, 
  CounterpartyAddress 
} from '../../types/calloff'
import {
  fetchCounterpartyAddresses,
  fetchCounterparties,
  fetchQuotasByCounterparty,
  fetchAvailableQuotas,
  fetchQuotaBalance,
  fetchCallOffs,
  fetchCallOff,
  createCallOff,
  updateCallOff,
  deleteCallOff,
  fetchShipmentLines,
  createShipmentLine,
  updateShipmentLine,
  deleteShipmentLine,
  confirmCallOff,
  cancelCallOff,
  fulfillCallOff,
} from '../calloff-api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('call-off-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset import.meta.env for each test
    vi.stubEnv('VITE_API_URL', 'http://test-api.example.com/api')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('apiCall helper', () => {
    it('should handle successful API responses', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await fetchCallOffs()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/api/call-offs',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid request' }),
      })

      await expect(fetchCallOffs()).rejects.toThrow('Invalid request')
    })

    it('should handle API responses without data wrapper', async () => {
      const mockData = [{ id: 1 }, { id: 2 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchCallOffs()
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchCounterpartyAddresses', () => {
    it('should always return mock addresses', async () => {
      const addresses = await fetchCounterpartyAddresses('test-cp-id')
      
      expect(addresses).toHaveLength(2)
      expect(addresses[0]).toMatchObject({
        address_id: 'mock-addr-1',
        counterparty_id: 'test-cp-id',
        address_type: 'DELIVERY',
        address_name: 'Main Warehouse',
      })
      expect(addresses[1]).toMatchObject({
        address_id: 'mock-addr-2',
        counterparty_id: 'test-cp-id',
        address_type: 'DELIVERY',
        address_name: 'Port Office',
      })
    })
  })

  describe('fetchCounterparties', () => {
    it('should fetch counterparties from API when available', async () => {
      const mockCounterparties: Counterparty[] = [
        {
          counterparty_id: 'cp-1',
          company_name: 'Test Company',
          company_code: 'TC001',
          counterparty_type: 'SUPPLIER',
          country_code: 'US',
          is_active: true,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCounterparties }),
      })

      const result = await fetchCounterparties()
      
      expect(result).toEqual(mockCounterparties)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/api/counterparties',
        expect.any(Object)
      )
    })

    it('should return mock data when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchCounterparties()
      
      expect(result).toHaveLength(2)
      expect(result[0].company_name).toBe('Mock Supplier Co')
      expect(result[1].company_name).toBe('Mock Customer Inc')
    })

    it('should return mock data when API_URL not configured', async () => {
      vi.stubEnv('VITE_API_URL', '')

      const result = await fetchCounterparties()
      
      expect(result).toHaveLength(2)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('fetchQuotasByCounterparty', () => {
    it('should fetch quotas by counterparty from API', async () => {
      const mockQuotas: Quota[] = [
        {
          quota_id: 'q-1',
          counterparty_id: 'cp-1',
          direction: 'BUY',
          period_month: '2025-01',
          qty_t: 1000,
          tolerance_pct: 5,
          metal_code: 'CU',
          business_unit_id: 'BU001',
          incoterm_code: 'DAP',
          created_at: new Date().toISOString(),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuotas }),
      })

      const result = await fetchQuotasByCounterparty('cp-1')
      
      expect(result).toEqual(mockQuotas)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/api/quotas?counterparty_id=cp-1',
        expect.any(Object)
      )
    })

    it('should filter mock data by counterparty when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const result = await fetchQuotasByCounterparty('mock-cp-1')
      
      expect(result).toHaveLength(1)
      expect(result[0].counterparty_id).toBe('mock-cp-1')
    })
  })

  describe('fetchAvailableQuotas', () => {
    it('should try mock endpoint first', async () => {
      const mockQuotas: Quota[] = [{
        quota_id: 'q-1',
        counterparty_id: 'cp-1',
        direction: 'BUY',
        period_month: '2025-01',
        qty_t: 1000,
        tolerance_pct: 5,
        metal_code: 'CU',
        business_unit_id: 'BU001',
        incoterm_code: 'DAP',
        created_at: new Date().toISOString(),
      }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuotas }),
      })

      const result = await fetchAvailableQuotas()
      
      expect(result).toEqual(mockQuotas)
      expect(mockFetch).toHaveBeenCalledWith('http://test-api.example.com/api/quotas/mock')
    })

    it('should fall back to real endpoint if mock fails', async () => {
      const realQuotas: Quota[] = [{
        quota_id: 'q-2',
        counterparty_id: 'cp-2',
        direction: 'SELL',
        period_month: '2025-02',
        qty_t: 500,
        tolerance_pct: 10,
        metal_code: 'AL',
        business_unit_id: 'BU002',
        incoterm_code: 'FOB',
        created_at: new Date().toISOString(),
      }]

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Not Found',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: realQuotas }),
        })

      const result = await fetchAvailableQuotas()
      
      expect(result).toEqual(realQuotas)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(2, 
        'http://test-api.example.com/api/quotas',
        expect.any(Object)
      )
    })
  })

  describe('fetchQuotaBalance', () => {
    it('should fetch quota balance from API', async () => {
      const mockBalance: QuotaBalance = {
        quota_id: 'q-1',
        quota_qty_tonnes: 1000,
        consumed_bundles: 10,
        pending_bundles: 5,
        remaining_qty_tonnes: 850,
        tolerance_pct: 5,
        utilization_pct: 15,
        tolerance_status: 'WITHIN_LIMITS',
        call_off_count: 3,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBalance }),
      })

      const result = await fetchQuotaBalance('q-1')
      
      expect(result).toEqual(mockBalance)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/api/quotas/q-1/balance',
        expect.any(Object)
      )
    })

    it('should return mock balance when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const result = await fetchQuotaBalance('mock-quota-1')
      
      expect(result).toMatchObject({
        quota_id: 'mock-quota-1',
        total_qty: 1000000, // 1000 tonnes in kg
        used_qty: 100000,
        available_qty: 900000,
        tolerance_qty: 50000,
        pending_qty: 50000,
      })
    })

    it('should throw error when quota not found in mock data', async () => {
      vi.stubEnv('VITE_API_URL', '')

      await expect(fetchQuotaBalance('non-existent')).rejects.toThrow('Quota not found')
    })
  })

  describe('CallOff CRUD operations', () => {
    describe('fetchCallOffs', () => {
      it('should fetch all call-offs from API', async () => {
        const mockCallOffs: CallOff[] = [{
          call_off_id: 'co-1',
          call_off_number: 'CO-2025-001',
          quota_id: 'q-1',
          counterparty_id: 'cp-1',
          direction: 'BUY',
          status: 'NEW',
          bundle_qty: 100,
          incoterm_code: 'DAP',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
        }]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockCallOffs }),
        })

        const result = await fetchCallOffs()
        
        expect(result).toEqual(mockCallOffs)
      })
    })

    describe('fetchCallOff', () => {
      it('should fetch single call-off by ID', async () => {
        const mockCallOff: CallOff = {
          call_off_id: 'co-1',
          call_off_number: 'CO-2025-001',
          quota_id: 'q-1',
          counterparty_id: 'cp-1',
          direction: 'BUY',
          status: 'NEW',
          bundle_qty: 100,
          incoterm_code: 'DAP',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockCallOff }),
        })

        const result = await fetchCallOff('co-1')
        
        expect(result).toEqual(mockCallOff)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/call-offs/co-1',
          expect.any(Object)
        )
      })

      it('should throw error when call-off not found in mock data', async () => {
        vi.stubEnv('VITE_API_URL', '')

        await expect(fetchCallOff('non-existent')).rejects.toThrow('Call-off not found')
      })
    })

    describe('createCallOff', () => {
      it('should create call-off via API', async () => {
        const createRequest: CreateCallOffRequest = {
          quota_id: 'q-1',
          bundle_qty: 150,
          requested_delivery_date: '2025-02-15',
          delivery_address_id: 'addr-1',
        }

        const createdCallOff: CallOff = {
          call_off_id: 'co-new',
          call_off_number: 'CO-2025-002',
          quota_id: 'q-1',
          counterparty_id: 'cp-1',
          direction: 'BUY',
          status: 'NEW',
          bundle_qty: 150,
          incoterm_code: 'DAP',
          requested_delivery_date: '2025-02-15',
          delivery_address_id: 'addr-1',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: createdCallOff }),
        })

        const result = await createCallOff(createRequest)
        
        expect(result).toEqual(createdCallOff)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/call-offs',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(createRequest),
          })
        )
      })

      it('should create mock call-off when API not available', async () => {
        vi.stubEnv('VITE_API_URL', '')

        const createRequest: CreateCallOffRequest = {
          quota_id: 'q-1',
          bundle_qty: 200,
        }

        const result = await createCallOff(createRequest)
        
        expect(result).toMatchObject({
          quota_id: 'q-1',
          bundle_qty: 200,
          status: 'NEW',
          direction: 'BUY',
        })
        expect(result.call_off_id).toMatch(/^mock-co-/)
        expect(result.call_off_number).toMatch(/^CO-2025-/)
      })
    })

    describe('updateCallOff', () => {
      it('should update call-off via API', async () => {
        const updates = { status: 'CONFIRMED' as const, bundle_qty: 120 }
        const updatedCallOff: CallOff = {
          call_off_id: 'co-1',
          call_off_number: 'CO-2025-001',
          quota_id: 'q-1',
          counterparty_id: 'cp-1',
          direction: 'BUY',
          status: 'CONFIRMED',
          bundle_qty: 120,
          incoterm_code: 'DAP',
          created_at: new Date().toISOString(),
          created_by: 'user-1',
          confirmed_at: new Date().toISOString(),
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: updatedCallOff }),
        })

        const result = await updateCallOff('co-1', updates)
        
        expect(result).toEqual(updatedCallOff)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/call-offs/co-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(updates),
          })
        )
      })

      it('should update mock call-off when API fails', async () => {
        vi.stubEnv('VITE_API_URL', '')

        // First create a mock call-off
        const createRequest: CreateCallOffRequest = {
          quota_id: 'mock-quota-1',
          bundle_qty: 100,
        }
        const created = await createCallOff(createRequest)

        // Then update it
        const result = await updateCallOff(created.call_off_id, { status: 'CONFIRMED' })
        
        expect(result.status).toBe('CONFIRMED')
        expect(result.call_off_id).toBe(created.call_off_id)
      })
    })

    describe('deleteCallOff', () => {
      it('should delete call-off via API', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })

        await deleteCallOff('co-1')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/call-offs/co-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        )
      })

      it('should delete from mock data when API not available', async () => {
        vi.stubEnv('VITE_API_URL', '')

        // Create and then delete
        const createRequest: CreateCallOffRequest = {
          quota_id: 'mock-quota-1',
          bundle_qty: 100,
        }
        const created = await createCallOff(createRequest)
        
        await deleteCallOff(created.call_off_id)
        
        // Verify it's deleted by trying to fetch it
        await expect(fetchCallOff(created.call_off_id)).rejects.toThrow('Call-off not found')
      })
    })
  })

  describe('Shipment Line operations', () => {
    describe('fetchShipmentLines', () => {
      it('should fetch shipment lines for a call-off', async () => {
        const mockShipmentLines = [
          { shipment_line_id: 'sl-1', call_off_id: 'co-1', qty: 50 },
          { shipment_line_id: 'sl-2', call_off_id: 'co-1', qty: 50 },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockShipmentLines }),
        })

        const result = await fetchShipmentLines('co-1')
        
        expect(result).toEqual(mockShipmentLines)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/call-offs/co-1/shipment-lines',
          expect.any(Object)
        )
      })

      it('should return empty array when API fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        const result = await fetchShipmentLines('co-1')
        
        expect(result).toEqual([])
      })
    })

    describe('createShipmentLine', () => {
      it('should create shipment line via API', async () => {
        const shipmentData = { qty: 75, shipment_date: '2025-02-20' }
        const createdShipmentLine = {
          shipment_line_id: 'sl-new',
          call_off_id: 'co-1',
          ...shipmentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: createdShipmentLine }),
        })

        const result = await createShipmentLine('co-1', shipmentData)
        
        expect(result).toEqual(createdShipmentLine)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/call-offs/co-1/shipment-lines',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(shipmentData),
          })
        )
      })

      it('should create mock shipment line when API not available', async () => {
        vi.stubEnv('VITE_API_URL', '')

        const shipmentData = { qty: 100 }
        const result = await createShipmentLine('co-1', shipmentData)
        
        expect(result).toMatchObject({
          call_off_id: 'co-1',
          qty: 100,
        })
        expect(result.shipment_line_id).toMatch(/^mock-sl-/)
      })
    })

    describe('updateShipmentLine', () => {
      it('should update shipment line via API', async () => {
        const updates = { qty: 80, status: 'SHIPPED' }
        const updatedShipmentLine = {
          shipment_line_id: 'sl-1',
          call_off_id: 'co-1',
          qty: 80,
          status: 'SHIPPED',
          updated_at: new Date().toISOString(),
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: updatedShipmentLine }),
        })

        const result = await updateShipmentLine('sl-1', updates)
        
        expect(result).toEqual(updatedShipmentLine)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/shipment-lines/sl-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(updates),
          })
        )
      })
    })

    describe('deleteShipmentLine', () => {
      it('should delete shipment line via API', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })

        await deleteShipmentLine('sl-1')
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-api.example.com/api/shipment-lines/sl-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        )
      })
    })
  })

  describe('Call-off status update helpers', () => {
    it('confirmCallOff should update status to CONFIRMED', async () => {
      const confirmedCallOff: CallOff = {
        call_off_id: 'co-1',
        call_off_number: 'CO-2025-001',
        quota_id: 'q-1',
        counterparty_id: 'cp-1',
        direction: 'BUY',
        status: 'CONFIRMED',
        bundle_qty: 100,
        incoterm_code: 'DAP',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        confirmed_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: confirmedCallOff }),
      })

      const result = await confirmCallOff('co-1')
      
      expect(result.status).toBe('CONFIRMED')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/api/call-offs/co-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'CONFIRMED' }),
        })
      )
    })

    it('cancelCallOff should update status to CANCELLED', async () => {
      const cancelledCallOff: CallOff = {
        call_off_id: 'co-1',
        call_off_number: 'CO-2025-001',
        quota_id: 'q-1',
        counterparty_id: 'cp-1',
        direction: 'BUY',
        status: 'CANCELLED',
        bundle_qty: 100,
        incoterm_code: 'DAP',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        cancelled_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: cancelledCallOff }),
      })

      const result = await cancelCallOff('co-1')
      
      expect(result.status).toBe('CANCELLED')
    })

    it('fulfillCallOff should update status to FULFILLED', async () => {
      const fulfilledCallOff: CallOff = {
        call_off_id: 'co-1',
        call_off_number: 'CO-2025-001',
        quota_id: 'q-1',
        counterparty_id: 'cp-1',
        direction: 'BUY',
        status: 'FULFILLED',
        bundle_qty: 100,
        incoterm_code: 'DAP',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        fulfilled_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: fulfilledCallOff }),
      })

      const result = await fulfillCallOff('co-1')
      
      expect(result.status).toBe('FULFILLED')
    })
  })

  describe('Type safety tests', () => {
    it('should maintain type safety for Quota objects', () => {
      const quota: Quota = {
        quota_id: 'q-1',
        counterparty_id: 'cp-1',
        direction: 'BUY',
        period_month: '2025-01',
        qty_t: 1000,
        tolerance_pct: 5,
        metal_code: 'CU',
        business_unit_id: 'BU001',
        incoterm_code: 'DAP',
        created_at: new Date().toISOString(),
      }

      // This should compile without errors
      expect(quota.direction).toBeOneOf(['BUY', 'SELL'])
    })

    it('should maintain type safety for CallOff status', () => {
      const callOff: CallOff = {
        call_off_id: 'co-1',
        call_off_number: 'CO-2025-001',
        quota_id: 'q-1',
        counterparty_id: 'cp-1',
        direction: 'BUY',
        status: 'NEW',
        bundle_qty: 100,
        incoterm_code: 'DAP',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
      }

      // This should compile without errors
      expect(callOff.status).toBeOneOf(['NEW', 'CONFIRMED', 'FULFILLED', 'CANCELLED'])
    })

    it('should enforce required fields in CreateCallOffRequest', () => {
      const validRequest: CreateCallOffRequest = {
        quota_id: 'q-1',
        bundle_qty: 100,
      }

      // Optional fields should be allowed
      const requestWithOptionalFields: CreateCallOffRequest = {
        quota_id: 'q-1',
        bundle_qty: 100,
        requested_delivery_date: '2025-02-15',
        delivery_address_id: 'addr-1',
      }

      expect(validRequest.quota_id).toBeDefined()
      expect(validRequest.bundle_qty).toBeDefined()
      expect(requestWithOptionalFields.requested_delivery_date).toBeDefined()
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      // Functions that fall back to mock data should not throw
      const counterparties = await fetchCounterparties()
      expect(counterparties).toHaveLength(2)

      // Functions that don't have fallback should throw
      vi.stubEnv('VITE_API_URL', 'http://test-api.example.com/api')
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))
      await expect(createCallOff({ quota_id: 'q-1', bundle_qty: 100 }))
        .rejects.toThrow('Network failure')
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })

      const result = await fetchCallOffs()
      expect(result).toBeNull()
    })

    it('should handle empty API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const result = await fetchCallOffs()
      expect(result).toEqual([])
    })

    it('should handle API timeout', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      await expect(createCallOff({ quota_id: 'q-1', bundle_qty: 100 }))
        .rejects.toThrow('Request timeout')
    })

    it('should handle concurrent requests', async () => {
      const mockData1 = [{ call_off_id: 'co-1' }]
      const mockData2 = [{ quota_id: 'q-1' }]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockData1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockData2 }),
        })

      const [callOffs, quotas] = await Promise.all([
        fetchCallOffs(),
        fetchAvailableQuotas(),
      ])

      expect(callOffs).toEqual(mockData1)
      expect(quotas).toEqual(mockData2)
    })
  })
})