import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface QuotaBalance {
  quota_id: string
  quota_qty_tonnes: number
  consumed_bundles: number
  pending_bundles: number
  remaining_qty_tonnes: number
  tolerance_pct: number
  utilization_pct: number
  tolerance_status: string
  call_off_count: number
}

export class QuotaService {
  constructor(private supabase: SupabaseClient) {}

  async getQuotaBalance(quotaId: string): Promise<QuotaBalance> {
    const { data, error } = await this.supabase
      .from('v_quota_balance')
      .select('*')
      .eq('quota_id', quotaId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quota not found or access denied')
      }
      throw new Error(`Failed to get quota balance: ${error.message}`)
    }
    
    return {
      quota_id: data.quota_id,
      quota_qty_tonnes: data.quota_qty_tonnes,
      consumed_bundles: data.consumed_bundles,
      pending_bundles: data.pending_bundles,
      remaining_qty_tonnes: data.remaining_qty_tonnes,
      tolerance_pct: data.tolerance_pct || 0,
      utilization_pct: data.utilization_pct || 0,
      tolerance_status: data.tolerance_status || 'WITHIN_LIMITS',
      call_off_count: data.call_off_count || 0
    }
  }

  async validateQuotaAccess(quotaId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('quota')
      .select(`
        quota_id,
        counterparty_id,
        direction,
        period_month,
        qty_t,
        tolerance_pct,
        incoterm_code,
        metal_code,
        business_unit_id,
        created_at
      `)
      .eq('quota_id', quotaId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quota not found or access denied')
      }
      throw new Error(`Failed to validate quota access: ${error.message}`)
    }
    
    // Check if quota period is not too far in the past
    const quotaPeriod = new Date(data.period_month)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6) // 6 months back
    
    if (quotaPeriod < cutoffDate) {
      throw new Error('Cannot create call-offs for quotas older than 6 months')
    }
    
    return data
  }

  async validateQuotaConsumption(quotaId: string, additionalBundles: number): Promise<void> {
    const balance = await this.getQuotaBalance(quotaId)
    
    // Check basic quota capacity
    const totalAfterAdd = balance.consumed_bundles + balance.pending_bundles + additionalBundles
    if (totalAfterAdd > balance.quota_qty_tonnes) {
      throw new Error(
        `Quota capacity exceeded. Available: ${balance.quota_qty_tonnes - balance.consumed_bundles - balance.pending_bundles} tonnes, requested: ${additionalBundles} tonnes`
      )
    }
    
    // Check tolerance limits if tolerance is defined
    if (balance.tolerance_pct > 0) {
      const maxAllowedWithTolerance = balance.quota_qty_tonnes * (1 + balance.tolerance_pct / 100)
      if (totalAfterAdd > maxAllowedWithTolerance) {
        throw new Error(
          `Quota tolerance exceeded. Maximum allowed (including ${balance.tolerance_pct}% tolerance): ${maxAllowedWithTolerance} tonnes, would be: ${totalAfterAdd} tonnes`
        )
      }
    }
  }

  async validateQuotaForConfirmation(quotaId: string): Promise<void> {
    const balance = await this.getQuotaBalance(quotaId)
    
    // For confirmation, we only check confirmed consumption against tolerance
    if (balance.tolerance_pct > 0) {
      const maxAllowedWithTolerance = balance.quota_qty_tonnes * (1 + balance.tolerance_pct / 100)
      if (balance.consumed_bundles > maxAllowedWithTolerance) {
        throw new Error(
          `Quota tolerance would be exceeded after confirmation. Maximum allowed: ${maxAllowedWithTolerance} tonnes, would be: ${balance.consumed_bundles} tonnes`
        )
      }
    }
  }

  async getQuotasByUser(filters: URLSearchParams): Promise<any[]> {
    let query = this.supabase
      .from('quota')
      .select(`
        quota_id,
        counterparty_id,
        direction,
        period_month,
        qty_t,
        tolerance_pct,
        metal_code,
        business_unit_id,
        incoterm_code,
        created_at
      `)
    
    // Apply filters
    if (filters.get('metal_code')) {
      query = query.eq('metal_code', filters.get('metal_code'))
    }
    
    if (filters.get('direction')) {
      query = query.eq('direction', filters.get('direction'))
    }
    
    if (filters.get('period_month')) {
      query = query.eq('period_month', filters.get('period_month'))
    }
    
    // Only show recent quotas (last 12 months)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 12)
    const cutoffString = cutoffDate.toISOString().substring(0, 7) + '-01'
    query = query.gte('period_month', cutoffString)
    
    // Sorting
    query = query.order('period_month', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to get quotas: ${error.message}`)
    }
    
    return data || []
  }
}