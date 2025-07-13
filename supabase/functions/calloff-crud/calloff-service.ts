import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CreateCallOffRequest, UpdateCallOffRequest } from './validation.ts'
import { QuotaService } from './quota-service.ts'

export class CallOffService {
  private quotaService: QuotaService

  constructor(private supabase: SupabaseClient) {
    this.quotaService = new QuotaService(supabase)
  }

  async createCallOff(request: CreateCallOffRequest, userId: string): Promise<any> {
    // Validate quota exists and user has access
    const quota = await this.quotaService.validateQuotaAccess(request.quota_id)
    
    // Check quota balance and consumption limits
    await this.quotaService.validateQuotaConsumption(request.quota_id, request.bundle_qty)
    
    // Create call-off (trigger will generate call_off_number)
    const callOffData = {
      quota_id: request.quota_id,
      bundle_qty: request.bundle_qty,
      requested_delivery_date: request.requested_delivery_date || null,
      counterparty_id: quota.counterparty_id,
      direction: quota.direction,
      incoterm_code: quota.incoterm_code,
      created_by: userId,
      status: 'NEW'
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .insert(callOffData)
      .select(`
        call_off_id,
        call_off_number,
        quota_id,
        bundle_qty,
        requested_delivery_date,
        counterparty_id,
        direction,
        incoterm_code,
        status,
        created_by,
        created_at,
        confirmed_at,
        cancelled_at
      `)
      .single()
    
    if (error) {
      throw new Error(`Failed to create call-off: ${error.message}`)
    }
    
    return data
  }

  async updateCallOff(callOffId: string, request: UpdateCallOffRequest): Promise<any> {
    // Check call-off exists and is in NEW status
    const callOff = await this.getCallOffForUpdate(callOffId)
    
    if (callOff.status !== 'NEW') {
      throw new Error(`Cannot update call-off in ${callOff.status} status. Only NEW call-offs can be updated.`)
    }
    
    // If updating bundle_qty, check quota balance
    if (request.bundle_qty !== undefined && request.bundle_qty !== callOff.bundle_qty) {
      // Calculate the change in consumption
      const bundleChange = request.bundle_qty - callOff.bundle_qty
      
      if (bundleChange > 0) {
        // Increasing consumption - validate quota capacity
        await this.quotaService.validateQuotaConsumption(callOff.quota_id, bundleChange)
      }
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .update({
        ...request,
        updated_at: new Date().toISOString()
      })
      .eq('call_off_id', callOffId)
      .select(`
        call_off_id,
        call_off_number,
        quota_id,
        bundle_qty,
        requested_delivery_date,
        counterparty_id,
        direction,
        incoterm_code,
        status,
        created_by,
        created_at,
        confirmed_at,
        cancelled_at,
        updated_at
      `)
      .single()
    
    if (error) {
      throw new Error(`Failed to update call-off: ${error.message}`)
    }
    
    return data
  }

  async getCallOff(callOffId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('v_call_off_summary')
      .select('*')
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

  async listCallOffs(filters: URLSearchParams): Promise<any> {
    let query = this.supabase
      .from('v_call_off_summary')
      .select('*')
    
    // Apply filters
    if (filters.get('status')) {
      query = query.eq('status', filters.get('status'))
    }
    
    if (filters.get('quota_id')) {
      query = query.eq('quota_id', filters.get('quota_id'))
    }
    
    if (filters.get('metal_code')) {
      query = query.eq('metal_code', filters.get('metal_code'))
    }
    
    if (filters.get('direction')) {
      query = query.eq('direction', filters.get('direction'))
    }
    
    if (filters.get('counterparty_id')) {
      query = query.eq('counterparty_id', filters.get('counterparty_id'))
    }
    
    if (filters.get('business_unit_id')) {
      query = query.eq('business_unit_id', filters.get('business_unit_id'))
    }
    
    // Date range filtering
    if (filters.get('created_after')) {
      query = query.gte('created_at', filters.get('created_after'))
    }
    
    if (filters.get('created_before')) {
      query = query.lte('created_at', filters.get('created_before'))
    }
    
    // Pagination
    const page = parseInt(filters.get('page') || '1')
    const limit = Math.min(parseInt(filters.get('limit') || '50'), 100)
    const offset = (page - 1) * limit
    
    query = query.range(offset, offset + limit - 1)
    
    // Sorting
    const sortBy = filters.get('sort_by') || 'created_at'
    const sortOrder = filters.get('sort_order') === 'asc' ? false : true
    query = query.order(sortBy, { ascending: !sortOrder })
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to list call-offs: ${error.message}`)
    }
    
    return {
      data: data || [],
      pagination: {
        page,
        limit,
        offset,
        total: data?.length || 0,
        has_more: (data?.length || 0) === limit
      }
    }
  }

  async getCallOffForUpdate(callOffId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('call_off')
      .select(`
        call_off_id,
        quota_id,
        bundle_qty,
        status,
        created_by,
        counterparty_id,
        direction,
        incoterm_code
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

  async validateCallOffOwnership(callOffId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('call_off')
      .select('created_by')
      .eq('call_off_id', callOffId)
      .single()
    
    if (error || !data) {
      return false
    }
    
    return data.created_by === userId
  }

  async getCallOffsByQuota(quotaId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('call_off')
      .select(`
        call_off_id,
        call_off_number,
        bundle_qty,
        status,
        requested_delivery_date,
        created_at,
        confirmed_at,
        cancelled_at
      `)
      .eq('quota_id', quotaId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to get call-offs for quota: ${error.message}`)
    }
    
    return data || []
  }
}