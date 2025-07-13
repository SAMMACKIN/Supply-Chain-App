export interface Counterparty {
  counterparty_id: string
  company_name: string
  company_code: string
  counterparty_type: 'SUPPLIER' | 'CUSTOMER' | 'BOTH'
  country_code: string
  is_active: boolean
}

export interface Quota {
  quota_id: string
  counterparty_id: string
  direction: 'BUY' | 'SELL'
  period_month: string
  qty_t: number
  tolerance_pct: number
  incoterm_code: string
  metal_code: string
  business_unit_id: string
  created_at: string
  counterparty?: Counterparty
}

export interface QuotaBalance {
  quota_id: string
  quota_qty_tonnes: number
  consumed_bundles: number
  pending_bundles: number
  remaining_qty_tonnes: number
  tolerance_pct: number
  utilization_pct: number
  tolerance_status: 'WITHIN_LIMITS' | 'OVER_QUOTA' | 'OVER_TOLERANCE'
  call_off_count: number
}

export interface CallOff {
  call_off_id: string
  call_off_number: string
  quota_id: string
  bundle_qty: number
  requested_delivery_date?: string
  counterparty_id: string
  direction: 'BUY' | 'SELL'
  incoterm_code: string
  fulfillment_location?: string  // For SELL: where we source the goods from
  delivery_location?: string     // For SELL with delivery incoterms: where we deliver to
  status: 'NEW' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'
  created_by: string
  created_at: string
  confirmed_at?: string
  cancelled_at?: string
  fulfilled_at?: string
}

export interface CreateCallOffRequest {
  quota_id: string
  bundle_qty: number
  requested_delivery_date?: string
  fulfillment_location?: string
  delivery_location?: string
}

export interface CreateCallOffResponse {
  success: boolean
  data?: CallOff
  error?: string
}

// Future: Draft call-offs from email integration
export interface DraftCallOff {
  draft_id: string
  counterparty_id: string
  email_subject?: string
  email_body?: string
  extracted_data: {
    bundle_qty?: number
    metal_code?: string
    requested_delivery_date?: string
    reference_number?: string
  }
  status: 'PENDING_REVIEW' | 'QUOTA_ASSIGNED' | 'CONVERTED'
  created_at: string
  reviewed_by?: string
  quota_id?: string // Assigned by user during review
}