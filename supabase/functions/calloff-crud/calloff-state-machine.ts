import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { QuotaService } from './quota-service.ts'

export class CallOffStateMachine {
  private quotaService: QuotaService

  constructor(private supabase: SupabaseClient) {
    this.quotaService = new QuotaService(supabase)
  }

  async confirmCallOff(callOffId: string): Promise<any> {
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    // Validate current state
    if (callOff.status !== 'NEW') {
      throw new Error(`Cannot confirm call-off in ${callOff.status} status. Only NEW call-offs can be confirmed.`)
    }
    
    // Validate bundle_qty > 0
    if (callOff.bundle_qty <= 0) {
      throw new Error('Cannot confirm call-off with zero bundle quantity')
    }
    
    // Check quota tolerance limits for confirmation
    await this.quotaService.validateQuotaForConfirmation(callOff.quota_id)
    
    // Perform the state transition
    const { data, error } = await this.supabase
      .from('call_off')
      .update({ 
        status: 'CONFIRMED',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('call_off_id', callOffId)
      .select(`
        call_off_id,
        call_off_number,
        quota_id,
        bundle_qty,
        status,
        confirmed_at,
        created_at,
        created_by
      `)
      .single()
    
    if (error) {
      throw new Error(`Failed to confirm call-off: ${error.message}`)
    }
    
    return data
  }

  async cancelCallOff(callOffId: string, reason?: string): Promise<any> {
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    // Validate current state - can cancel from NEW or CONFIRMED
    if (!['NEW', 'CONFIRMED'].includes(callOff.status)) {
      throw new Error(`Cannot cancel call-off in ${callOff.status} status. Only NEW or CONFIRMED call-offs can be cancelled.`)
    }
    
    // Additional validation for CONFIRMED cancellations
    if (callOff.status === 'CONFIRMED') {
      // Check if there are any shipment lines associated
      const { data: shipmentLines, error: slError } = await this.supabase
        .from('call_off_shipment_line')
        .select('shipment_line_id')
        .eq('call_off_id', callOffId)
        .limit(1)
      
      if (slError) {
        throw new Error(`Failed to check shipment lines: ${slError.message}`)
      }
      
      if (shipmentLines && shipmentLines.length > 0) {
        throw new Error('Cannot cancel call-off that has associated shipment lines. Please remove shipment lines first.')
      }
    }
    
    // Perform the state transition
    const updateData: any = {
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    if (reason) {
      updateData.cancellation_reason = reason
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .update(updateData)
      .eq('call_off_id', callOffId)
      .select(`
        call_off_id,
        call_off_number,
        quota_id,
        bundle_qty,
        status,
        cancelled_at,
        created_at,
        created_by
      `)
      .single()
    
    if (error) {
      throw new Error(`Failed to cancel call-off: ${error.message}`)
    }
    
    return data
  }

  async fulfillCallOff(callOffId: string): Promise<any> {
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    // Validate current state
    if (callOff.status !== 'CONFIRMED') {
      throw new Error(`Cannot fulfill call-off in ${callOff.status} status. Only CONFIRMED call-offs can be fulfilled.`)
    }
    
    // Check that all shipment lines are properly planned and executed
    const { data: shipmentLines, error: slError } = await this.supabase
      .from('call_off_shipment_line')
      .select(`
        shipment_line_id,
        bundle_qty,
        transport_order_id
      `)
      .eq('call_off_id', callOffId)
    
    if (slError) {
      throw new Error(`Failed to check shipment lines: ${slError.message}`)
    }
    
    if (!shipmentLines || shipmentLines.length === 0) {
      throw new Error('Cannot fulfill call-off without shipment lines')
    }
    
    // Verify total bundle quantity matches
    const totalShippedBundles = shipmentLines.reduce((sum, line) => sum + line.bundle_qty, 0)
    if (totalShippedBundles !== callOff.bundle_qty) {
      throw new Error(`Shipment line quantities (${totalShippedBundles}) do not match call-off quantity (${callOff.bundle_qty})`)
    }
    
    // Verify all shipment lines have transport orders
    const unassignedLines = shipmentLines.filter(line => !line.transport_order_id)
    if (unassignedLines.length > 0) {
      throw new Error(`${unassignedLines.length} shipment lines are not assigned to transport orders`)
    }
    
    // Perform the state transition
    const { data, error } = await this.supabase
      .from('call_off')
      .update({ 
        status: 'FULFILLED',
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('call_off_id', callOffId)
      .select(`
        call_off_id,
        call_off_number,
        quota_id,
        bundle_qty,
        status,
        fulfilled_at,
        confirmed_at,
        created_at,
        created_by
      `)
      .single()
    
    if (error) {
      throw new Error(`Failed to fulfill call-off: ${error.message}`)
    }
    
    return data
  }

  async getValidTransitions(callOffId: string): Promise<string[]> {
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    switch (callOff.status) {
      case 'NEW':
        return ['CONFIRMED', 'CANCELLED']
      case 'CONFIRMED':
        return ['FULFILLED', 'CANCELLED']
      case 'FULFILLED':
        return [] // Terminal state
      case 'CANCELLED':
        return [] // Terminal state
      default:
        return []
    }
  }

  async validateTransition(callOffId: string, targetStatus: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const validTransitions = await this.getValidTransitions(callOffId)
      
      if (!validTransitions.includes(targetStatus)) {
        return {
          valid: false,
          reason: `Invalid transition to ${targetStatus}. Valid transitions: ${validTransitions.join(', ')}`
        }
      }
      
      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        reason: error.message
      }
    }
  }

  private async getCallOffForStateChange(callOffId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('call_off')
      .select(`
        call_off_id,
        quota_id,
        bundle_qty,
        status,
        created_by,
        created_at,
        confirmed_at,
        cancelled_at,
        fulfilled_at
      `)
      .eq('call_off_id', callOffId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Call-off not found or access denied')
      }
      throw new Error(`Failed to get call-off: ${error.message}`)
    }
    
    return data
  }

  async getStatusHistory(callOffId: string): Promise<any[]> {
    // This would require an audit table or status history table
    // For now, we'll return the current state information
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    const history = [
      {
        status: 'NEW',
        timestamp: callOff.created_at,
        user_id: callOff.created_by
      }
    ]
    
    if (callOff.confirmed_at) {
      history.push({
        status: 'CONFIRMED',
        timestamp: callOff.confirmed_at,
        user_id: callOff.created_by // Would need to track this separately
      })
    }
    
    if (callOff.cancelled_at) {
      history.push({
        status: 'CANCELLED',
        timestamp: callOff.cancelled_at,
        user_id: callOff.created_by // Would need to track this separately
      })
    }
    
    if (callOff.fulfilled_at) {
      history.push({
        status: 'FULFILLED',
        timestamp: callOff.fulfilled_at,
        user_id: callOff.created_by // Would need to track this separately
      })
    }
    
    return history
  }
}