import { supabase } from '../lib/supabase'
import type { Quota, QuotaBalance, CallOff, CreateCallOffRequest, Counterparty } from '../types/calloff'

export async function fetchCounterparties(): Promise<Counterparty[]> {
  const { data, error } = await supabase.functions.invoke('calloff-crud/counterparties', {
    method: 'GET'
  })

  if (error) {
    throw new Error(`Failed to fetch counterparties: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch counterparties')
  }

  return data.data
}

export async function fetchQuotasByCounterparty(counterpartyId: string): Promise<Quota[]> {
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
  const { data, error } = await supabase.functions.invoke('calloff-crud/quotas', {
    method: 'GET'
  })

  if (error) {
    throw new Error(`Failed to fetch quotas: ${error.message}`)
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch quotas')
  }

  return data.data
}

export async function fetchQuotaBalance(quotaId: string): Promise<QuotaBalance> {
  // For development: calculate balance directly from database
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

// Shipment Line API functions
export interface ShipmentLine {
  shipment_line_id: string
  call_off_id: string
  transport_order_id?: string
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  created_at: string
  updated_at: string
}

export interface CreateShipmentLineRequest {
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
}

export async function fetchShipmentLines(callOffId: string): Promise<ShipmentLine[]> {
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

export async function updateShipmentLine(shipmentLineId: string, updates: Partial<CreateShipmentLineRequest>): Promise<ShipmentLine> {
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