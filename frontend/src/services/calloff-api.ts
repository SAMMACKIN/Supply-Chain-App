import type { Quota, QuotaBalance, CallOff, CreateCallOffRequest, Counterparty, CounterpartyAddress } from '../types/calloff'

// Use Railway API if available, otherwise use mock data
const API_URL = import.meta.env.VITE_API_URL || ''
const USE_API = !!API_URL

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!USE_API) {
    throw new Error('API URL not configured')
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `API call failed: ${response.statusText}`)
  }
  
  return data.data || data
}

// Mock data for development
const mockQuotas: Quota[] = [
  {
    quota_id: 'mock-quota-1',
    counterparty_id: 'mock-cp-1',
    direction: 'BUY',
    period_month: '2025-01',
    qty_t: 1000,
    tolerance_pct: 5,
    metal_code: 'CU',
    business_unit_id: 'BU001',
    incoterm_code: 'DAP',
    created_at: new Date().toISOString(),
    counterparty: {
      counterparty_id: 'mock-cp-1',
      company_name: 'Mock Supplier Co',
      company_code: 'MS001',
      is_active: true,
    },
  },
  {
    quota_id: 'mock-quota-2',
    counterparty_id: 'mock-cp-2',
    direction: 'SELL',
    period_month: '2025-01',
    qty_t: 500,
    tolerance_pct: 10,
    metal_code: 'AL',
    business_unit_id: 'BU002',
    incoterm_code: 'FOB',
    created_at: new Date().toISOString(),
    counterparty: {
      counterparty_id: 'mock-cp-2',
      company_name: 'Mock Customer Inc',
      company_code: 'MC001',
      is_active: true,
    },
  },
]

const mockCallOffs: CallOff[] = [
  {
    call_off_id: 'mock-co-1',
    call_off_number: 'CO-2025-001',
    quota_id: 'mock-quota-1',
    counterparty_id: 'mock-cp-1',
    direction: 'BUY',
    status: 'NEW',
    bundle_qty: 100,
    incoterm_code: 'DAP',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    counterparty: {
      company_name: 'Mock Supplier Co',
      company_code: 'MS001',
    },
  },
]

export async function fetchCounterpartyAddresses(counterpartyId: string): Promise<CounterpartyAddress[]> {
  // Always return mock addresses for now
  return [
    {
      address_id: 'mock-addr-1',
      counterparty_id: counterpartyId,
      address_type: 'DELIVERY',
      address_name: 'Main Warehouse',
      street_address: '123 Industrial Way',
      city: 'Hamburg',
      state_province: 'Hamburg',
      postal_code: '20095',
      country_code: 'DE',
      contact_name: 'John Doe',
      contact_phone: '+49 40 123456',
      contact_email: 'warehouse@example.com',
      is_default: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      address_id: 'mock-addr-2',
      counterparty_id: counterpartyId,
      address_type: 'DELIVERY',
      address_name: 'Port Office',
      street_address: '456 Harbor Blvd',
      city: 'Rotterdam',
      postal_code: '3011',
      country_code: 'NL',
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

export async function fetchCounterparties(): Promise<Counterparty[]> {
  if (USE_API) {
    try {
      return await apiCall<Counterparty[]>('/counterparties')
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }
  }
  
  // Return mock counterparties
  return [
    {
      counterparty_id: 'mock-cp-1',
      company_name: 'Mock Supplier Co',
      company_code: 'MS001',
      counterparty_type: 'SUPPLIER',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      counterparty_id: 'mock-cp-2',
      company_name: 'Mock Customer Inc',
      company_code: 'MC001',
      counterparty_type: 'CUSTOMER',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]
}

export async function fetchQuotasByCounterparty(counterpartyId: string): Promise<Quota[]> {
  if (USE_API) {
    try {
      return await apiCall<Quota[]>(`/quotas?counterparty_id=${counterpartyId}`)
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }
  }
  
  return mockQuotas.filter(q => q.counterparty_id === counterpartyId)
}

export async function fetchAvailableQuotas(): Promise<Quota[]> {
  if (USE_API) {
    try {
      // First try the mock endpoint for testing
      const response = await fetch(`${API_URL}/quotas/mock`)
      if (response.ok) {
        const data = await response.json()
        return data.data || []
      }
      
      // Fall back to real endpoint
      return await apiCall<Quota[]>('/quotas')
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }
  }
  
  return mockQuotas
}

export async function fetchQuotaBalance(quotaId: string): Promise<QuotaBalance> {
  if (USE_API) {
    try {
      return await apiCall<QuotaBalance>(`/quotas/${quotaId}/balance`)
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }
  }
  
  // Return mock balance
  const quota = mockQuotas.find(q => q.quota_id === quotaId)
  if (!quota) {
    throw new Error('Quota not found')
  }
  
  return {
    quota_id: quotaId,
    total_qty: quota.qty_t * 1000, // Convert tonnes to kg
    used_qty: 100000, // 100 tonnes used
    available_qty: (quota.qty_t * 1000) - 100000,
    tolerance_qty: quota.qty_t * 1000 * (quota.tolerance_pct / 100),
    pending_qty: 50000, // 50 tonnes pending
  }
}

export async function fetchCallOffs(): Promise<CallOff[]> {
  if (USE_API) {
    try {
      return await apiCall<CallOff[]>('/call-offs')
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }
  }
  
  return mockCallOffs
}

export async function fetchCallOff(id: string): Promise<CallOff> {
  if (USE_API) {
    try {
      return await apiCall<CallOff>(`/call-offs/${id}`)
    } catch (error) {
      console.warn('API call failed, using mock data:', error)
    }
  }
  
  const callOff = mockCallOffs.find(co => co.call_off_id === id)
  if (!callOff) {
    throw new Error('Call-off not found')
  }
  
  return callOff
}

export async function createCallOff(data: CreateCallOffRequest): Promise<CallOff> {
  if (USE_API) {
    return await apiCall<CallOff>('/call-offs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  // Create mock call-off
  const newCallOff: CallOff = {
    call_off_id: `mock-co-${Date.now()}`,
    call_off_number: `CO-2025-${Date.now().toString().slice(-6)}`,
    quota_id: data.quota_id,
    counterparty_id: 'mock-cp-1',
    direction: 'BUY',
    status: 'NEW',
    bundle_qty: data.bundle_qty,
    incoterm_code: 'DAP',
    requested_delivery_date: data.requested_delivery_date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    counterparty: {
      company_name: 'Mock Supplier Co',
      company_code: 'MS001',
    },
  }
  
  mockCallOffs.push(newCallOff)
  return newCallOff
}

export async function updateCallOff(id: string, updates: Partial<CallOff>): Promise<CallOff> {
  if (USE_API) {
    try {
      return await apiCall<CallOff>(`/call-offs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    } catch (error) {
      console.warn('API call failed, updating mock call-off:', error)
    }
  }
  
  const index = mockCallOffs.findIndex(co => co.call_off_id === id)
  if (index === -1) {
    throw new Error('Call-off not found')
  }
  
  mockCallOffs[index] = { ...mockCallOffs[index], ...updates }
  return mockCallOffs[index]
}

export async function deleteCallOff(id: string): Promise<void> {
  if (USE_API) {
    try {
      await apiCall(`/call-offs/${id}`, { method: 'DELETE' })
      return
    } catch (error) {
      console.warn('API call failed, deleting mock call-off:', error)
    }
  }
  
  const index = mockCallOffs.findIndex(co => co.call_off_id === id)
  if (index !== -1) {
    mockCallOffs.splice(index, 1)
  }
}

// Shipment line functions
export async function fetchShipmentLines(callOffId: string) {
  if (USE_API) {
    try {
      return await apiCall(`/call-offs/${callOffId}/shipment-lines`)
    } catch (error) {
      console.warn('API call failed, using empty shipment lines:', error)
    }
  }
  
  return []
}

export async function createShipmentLine(callOffId: string, data: any) {
  if (USE_API) {
    return await apiCall(`/call-offs/${callOffId}/shipment-lines`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  return {
    shipment_line_id: `mock-sl-${Date.now()}`,
    call_off_id: callOffId,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function updateShipmentLine(id: string, updates: any) {
  if (USE_API) {
    try {
      return await apiCall(`/shipment-lines/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    } catch (error) {
      console.warn('API call failed, updating mock shipment line:', error)
    }
  }
  
  return { shipment_line_id: id, ...updates }
}

export async function deleteShipmentLine(id: string) {
  if (USE_API) {
    try {
      await apiCall(`/shipment-lines/${id}`, { method: 'DELETE' })
      return
    } catch (error) {
      console.warn('API call failed, deleting mock shipment line:', error)
    }
  }
}

// Call-off status update functions
export async function confirmCallOff(id: string): Promise<CallOff> {
  return updateCallOff(id, { status: 'CONFIRMED' })
}

export async function cancelCallOff(id: string): Promise<CallOff> {
  return updateCallOff(id, { status: 'CANCELLED' })
}

export async function fulfillCallOff(id: string): Promise<CallOff> {
  return updateCallOff(id, { status: 'FULFILLED' })
}