import { supabase, supabaseConfig } from '../lib/supabase'
import type { Quota, QuotaBalance, CallOff, CreateCallOffRequest, Counterparty } from '../types/calloff'

export async function fetchCounterparties(): Promise<Counterparty[]> {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  
  if (isDevMode) {
    // Return mock counterparties for development
    return [
      {
        counterparty_id: 'mock-cp-1',
        company_name: 'Mock Supplier Co',
        company_code: 'MOCKSUPP',
        counterparty_type: 'SUPPLIER',
        country_code: 'US',
        is_active: true
      },
      {
        counterparty_id: 'mock-cp-2',
        company_name: 'Mock Customer Inc',
        company_code: 'MOCKCUST',
        counterparty_type: 'CUSTOMER',
        country_code: 'GB',
        is_active: true
      },
      {
        counterparty_id: 'mock-cp-3',
        company_name: 'Mock Trading Ltd',
        company_code: 'MOCKTRADE',
        counterparty_type: 'BOTH',
        country_code: 'DE',
        is_active: true
      }
    ]
  }

  console.log('Fetching counterparties from Edge Function...')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const token = user ? (await supabase.auth.getSession()).data.session?.access_token : null
    
    const response = await fetch(`${supabaseConfig.url}/functions/v1/calloff-crud/counterparties`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseConfig.anonKey}`,
        'apikey': supabaseConfig.anonKey,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    console.log('Counterparties response:', data)
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch counterparties')
    }
    
    return data.data
  } catch (error) {
    console.error('Error fetching counterparties:', error)
    throw error
  }
}

export async function fetchQuotasByCounterparty(counterpartyId: string): Promise<Quota[]> {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  
  if (isDevMode) {
    // Return mock quotas filtered by counterparty
    const allQuotas = await fetchAvailableQuotas()
    return allQuotas.filter(q => q.counterparty_id === counterpartyId)
  }

  const { data, error } = await supabase.functions.invoke(`calloff-crud/counterparties/${counterpartyId}/quotas`, {
    method: 'GET'
  })

  if (error) {
    throw new Error(`Failed to fetch quotas for counterparty: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch quotas for counterparty')
  }

  return data.data
}

export async function fetchAvailableQuotas(): Promise<Quota[]> {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  console.log('Dev mode:', isDevMode)
  
  if (isDevMode) {
    // Return mock quotas for development
    return [
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
          company_code: 'MOCKSUPP',
          counterparty_type: 'SUPPLIER',
          country_code: 'US',
          is_active: true
        }
      },
      {
        quota_id: 'mock-quota-2',
        counterparty_id: 'mock-cp-2',
        direction: 'SELL',
        period_month: '2025-02',
        qty_t: 500,
        tolerance_pct: 10,
        metal_code: 'AL',
        business_unit_id: 'BU002',
        incoterm_code: 'DDP',
        created_at: new Date().toISOString(),
        counterparty: {
          counterparty_id: 'mock-cp-2',
          company_name: 'Mock Customer Inc',
          company_code: 'MOCKCUST',
          counterparty_type: 'CUSTOMER',
          country_code: 'GB',
          is_active: true
        }
      },
      {
        quota_id: 'mock-quota-3',
        counterparty_id: 'mock-cp-3',
        direction: 'BUY',
        period_month: '2025-03',
        qty_t: 750,
        tolerance_pct: 7.5,
        metal_code: 'ZN',
        business_unit_id: 'BU001',
        incoterm_code: 'EXW',
        created_at: new Date().toISOString(),
        counterparty: {
          counterparty_id: 'mock-cp-3',
          company_name: 'Mock Trading Ltd',
          company_code: 'MOCKTRADE',
          counterparty_type: 'BOTH',
          country_code: 'DE',
          is_active: true
        }
      }
    ]
  }

  console.log('Fetching quotas from Edge Function...')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const token = user ? (await supabase.auth.getSession()).data.session?.access_token : null
    
    const response = await fetch(`${supabaseConfig.url}/functions/v1/calloff-crud/quotas`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseConfig.anonKey}`,
        'apikey': supabaseConfig.anonKey,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    console.log('Quotas response:', data)
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch quotas')
    }
    
    return data.data
  } catch (error) {
    console.error('Error fetching quotas:', error)
    throw error
  }
}

export async function fetchQuotaBalance(quotaId: string): Promise<QuotaBalance> {
  // Check if we're in dev mode
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  
  if (isDevMode) {
    // Return mock quota balance data for development
    return {
      quota_id: quotaId,
      quota_qty_tonnes: 1000,
      consumed_bundles: 250,
      pending_bundles: 50,
      remaining_qty_tonnes: 750,
      tolerance_pct: 5,
      utilization_pct: 25,
      tolerance_status: 'WITHIN_LIMITS',
      call_off_count: 3
    }
  }

  // For production: calculate balance directly from database
  const { data: quota, error: quotaError } = await supabase
    .from('quota')
    .select('*')
    .eq('quota_id', quotaId)
    .single()

  if (quotaError || !quota) {
    throw new Error(`Failed to fetch quota: ${quotaError?.message || 'Quota not found'}`)
  }

  // Get total consumed from call-offs
  const { data: callOffs, error: callOffError } = await supabase
    .from('call_off')
    .select('bundle_qty')
    .eq('quota_id', quotaId)
    .in('status', ['CONFIRMED', 'FULFILLED'])

  if (callOffError) {
    throw new Error(`Failed to fetch call-offs: ${callOffError.message}`)
  }

  const consumedBundles = callOffs?.reduce((sum, co) => sum + co.bundle_qty, 0) || 0
  const remainingQty = quota.qty_t - consumedBundles
  const utilizationPct = (consumedBundles / quota.qty_t) * 100

  return {
    quota_id: quotaId,
    quota_qty_tonnes: quota.qty_t,
    consumed_bundles: consumedBundles,
    pending_bundles: 0, // Could calculate from pending call-offs
    remaining_qty_tonnes: remainingQty,
    tolerance_pct: quota.tolerance_pct,
    utilization_pct: utilizationPct,
    tolerance_status: utilizationPct > (100 + quota.tolerance_pct) ? 'OVER_TOLERANCE' : 
                     utilizationPct > 100 ? 'OVER_QUOTA' : 'WITHIN_LIMITS',
    call_off_count: callOffs?.length || 0
  }
}

export async function createCallOff(callOffData: CreateCallOffRequest): Promise<CallOff> {
  const { data, error } = await supabase.functions.invoke('calloff-crud/call-offs', {
    method: 'POST',
    body: callOffData
  })

  if (error) {
    throw new Error(`Failed to create call-off: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to create call-off')
  }

  return data.data
}

export async function fetchCallOffs(): Promise<CallOff[]> {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  
  if (isDevMode) {
    // Return mock call-offs for development
    return [
      {
        call_off_id: 'mock-co-1',
        call_off_number: 'CO-2025-001',
        quota_id: 'mock-quota-1',
        counterparty_id: 'mock-cp-1',
        direction: 'BUY',
        incoterm_code: 'DAP',
        bundle_qty: 25,
        requested_delivery_date: '2025-02-15',
        status: 'NEW',
        created_by: 'mock-user',
        created_at: new Date().toISOString()
      },
      {
        call_off_id: 'mock-co-2',
        call_off_number: 'CO-2025-002',
        quota_id: 'mock-quota-2',
        counterparty_id: 'mock-cp-2',
        direction: 'SELL',
        incoterm_code: 'DDP',
        bundle_qty: 10,
        requested_delivery_date: '2025-03-01',
        fulfillment_location: 'Hamburg Warehouse',
        delivery_location: 'London Port',
        status: 'CONFIRMED',
        created_by: 'mock-user',
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString()
      }
    ]
  }

  const { data, error } = await supabase.functions.invoke('calloff-crud/call-offs', {
    method: 'GET'
  })

  if (error) {
    throw new Error(`Failed to fetch call-offs: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch call-offs')
  }

  return data.data
}

export async function updateCallOff(callOffId: string, updates: Partial<CreateCallOffRequest>): Promise<CallOff> {
  console.log('updateCallOff called with:', { callOffId, updates })
  
  // Check if we should use real database or mock data
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const useRealDatabase = import.meta.env.VITE_USE_REAL_DATABASE === 'true'
  
  if (isDevMode && !useRealDatabase) {
    // Return mock updated call-off for development
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return {
      call_off_id: callOffId,
      call_off_number: 'CO-2025-MOCK',
      quota_id: 'mock-quota-id',
      bundle_qty: updates.bundle_qty || 10,
      requested_delivery_date: updates.requested_delivery_date,
      counterparty_id: 'mock-counterparty-id',
      direction: 'SELL',
      incoterm_code: 'DAP',
      fulfillment_location: updates.fulfillment_location,
      delivery_location: updates.delivery_location,
      status: 'NEW',
      created_by: 'mock-user-id',
      created_at: new Date().toISOString()
    } as CallOff
  }
  
  const { data, error } = await supabase.functions.invoke(`calloff-crud/call-offs/${callOffId}`, {
    method: 'PATCH',
    body: updates
  })

  console.log('updateCallOff response:', { data, error })

  if (error) {
    console.error('Supabase function error:', error)
    throw new Error(`Failed to update call-off: ${error.message}`)
  }

  if (!data.success) {
    console.error('API response error:', data)
    throw new Error(data.error || 'Failed to update call-off')
  }

  return data.data
}

export async function confirmCallOff(callOffId: string): Promise<CallOff> {
  const { data, error } = await supabase.functions.invoke(`calloff-crud/call-offs/${callOffId}/confirm`, {
    method: 'POST'
  })

  if (error) {
    throw new Error(`Failed to confirm call-off: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to confirm call-off')
  }

  return data.data
}

export async function cancelCallOff(callOffId: string, reason?: string): Promise<CallOff> {
  const { data, error } = await supabase.functions.invoke(`calloff-crud/call-offs/${callOffId}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : undefined
  })

  if (error) {
    throw new Error(`Failed to cancel call-off: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to cancel call-off')
  }

  return data.data
}

export async function fulfillCallOff(callOffId: string): Promise<CallOff> {
  const { data, error } = await supabase.functions.invoke(`calloff-crud/call-offs/${callOffId}/fulfill`, {
    method: 'POST'
  })

  if (error) {
    throw new Error(`Failed to fulfill call-off: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fulfill call-off')
  }

  return data.data
}

// Import shipment line types from centralized location
import type { ShipmentLine, CreateShipmentLineRequest, UpdateShipmentLineRequest } from '../types/shipment-line'

// In-memory store for mock shipment lines in dev mode
const mockShipmentLinesStore: Record<string, ShipmentLine[]> = {}

export async function fetchShipmentLines(callOffId: string): Promise<ShipmentLine[]> {
  // Check if we should use real database or mock data
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const useRealDatabase = import.meta.env.VITE_USE_REAL_DATABASE === 'true'
  
  if (isDevMode && !useRealDatabase) {
    // Initialize with default mock data if not exists
    if (!mockShipmentLinesStore[callOffId]) {
      mockShipmentLinesStore[callOffId] = [
        {
          shipment_line_id: '1',
          call_off_id: callOffId,
          bundle_qty: 5,
          metal_code: 'CU',
          destination_party_id: 'CUST001',
          expected_ship_date: '2025-08-15',
          delivery_location: 'Hamburg Port',
          requested_delivery_date: '2025-08-20',
          notes: 'Urgent delivery required',
          status: 'PLANNED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
    
    return mockShipmentLinesStore[callOffId] || []
  }

  const { data, error } = await supabase.functions.invoke(`calloff-crud/call-offs/${callOffId}/shipment-lines`, {
    method: 'GET'
  })

  if (error) {
    throw new Error(`Failed to fetch shipment lines: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch shipment lines')
  }

  return data.data
}

export async function createShipmentLine(callOffId: string, shipmentLineData: CreateShipmentLineRequest): Promise<ShipmentLine> {
  // Check if we should use real database or mock data
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const useRealDatabase = import.meta.env.VITE_USE_REAL_DATABASE === 'true'
  
  if (isDevMode && !useRealDatabase) {
    // Return mock created shipment line for development
    const newShipmentLine: ShipmentLine = {
      shipment_line_id: Math.random().toString(36).substr(2, 9),
      call_off_id: callOffId,
      bundle_qty: shipmentLineData.bundle_qty,
      metal_code: shipmentLineData.metal_code,
      destination_party_id: shipmentLineData.destination_party_id,
      expected_ship_date: shipmentLineData.expected_ship_date,
      delivery_location: shipmentLineData.delivery_location,
      requested_delivery_date: shipmentLineData.requested_delivery_date,
      notes: shipmentLineData.notes,
      status: 'PLANNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Add to mock store
    if (!mockShipmentLinesStore[callOffId]) {
      mockShipmentLinesStore[callOffId] = []
    }
    mockShipmentLinesStore[callOffId].push(newShipmentLine)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return newShipmentLine
  }

  const { data, error } = await supabase.functions.invoke(`calloff-crud/call-offs/${callOffId}/shipment-lines`, {
    method: 'POST',
    body: shipmentLineData
  })

  if (error) {
    throw new Error(`Failed to create shipment line: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to create shipment line')
  }

  return data.data
}

export async function updateShipmentLine(shipmentLineId: string, updates: UpdateShipmentLineRequest): Promise<ShipmentLine> {
  // Check if we should use real database or mock data
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const useRealDatabase = import.meta.env.VITE_USE_REAL_DATABASE === 'true'
  
  if (isDevMode && !useRealDatabase) {
    // Return mock updated shipment line for development
    const updatedShipmentLine: ShipmentLine = {
      shipment_line_id: shipmentLineId,
      call_off_id: 'mock-call-off-id',
      bundle_qty: updates.bundle_qty || 1,
      metal_code: updates.metal_code || 'CU',
      destination_party_id: updates.destination_party_id,
      expected_ship_date: updates.expected_ship_date,
      delivery_location: updates.delivery_location,
      requested_delivery_date: updates.requested_delivery_date,
      notes: updates.notes,
      status: updates.status || 'PLANNED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return updatedShipmentLine
  }

  const { data, error } = await supabase.functions.invoke(`calloff-crud/shipment-lines/${shipmentLineId}`, {
    method: 'PATCH',
    body: updates
  })

  if (error) {
    throw new Error(`Failed to update shipment line: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to update shipment line')
  }

  return data.data
}

export async function deleteShipmentLine(shipmentLineId: string): Promise<void> {
  // Check if we should use real database or mock data
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const useRealDatabase = import.meta.env.VITE_USE_REAL_DATABASE === 'true'
  
  if (isDevMode && !useRealDatabase) {
    // Remove from mock store
    for (const callOffId in mockShipmentLinesStore) {
      const lines = mockShipmentLinesStore[callOffId]
      const index = lines.findIndex(line => line.shipment_line_id === shipmentLineId)
      if (index !== -1) {
        lines.splice(index, 1)
        break
      }
    }
    
    // Simulate API delay for delete operation
    await new Promise(resolve => setTimeout(resolve, 200))
    return
  }

  const { data, error } = await supabase.functions.invoke(`calloff-crud/shipment-lines/${shipmentLineId}`, {
    method: 'DELETE'
  })

  if (error) {
    throw new Error(`Failed to delete shipment line: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete shipment line')
  }
}