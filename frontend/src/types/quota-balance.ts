import type { Quota, QuotaBalance } from './calloff'

export interface QuotaBalanceEnhanced extends QuotaBalance {
  // Additional computed fields for enhanced display
  available_capacity: number
  utilization_level: 'low' | 'medium' | 'high' | 'critical' | 'over'
  status: 'available' | 'low_stock' | 'over_allocated'
  status_color: 'success' | 'warning' | 'error'
  progress_color: 'success' | 'warning' | 'error'
  capacity_percentage: number
}

export interface QuotaWithBalance extends Quota {
  balance?: QuotaBalanceEnhanced
  balance_loading?: boolean
  balance_error?: string
}

export interface BatchQuotaBalanceRequest {
  quota_ids: string[]
}

export interface BatchQuotaBalanceResponse {
  balances: Record<string, QuotaBalance>
  errors?: Record<string, string>
}

// Color themes for different status levels
export interface QuotaStatusTheme {
  color: 'success' | 'warning' | 'error' | 'info'
  backgroundColor: string
  textColor: string
}

// Progress bar configuration
export interface ProgressBarConfig {
  color: 'success' | 'warning' | 'error'
  variant: 'determinate' | 'indeterminate'
  value: number
}

// Enhanced quota balance card props
export interface QuotaBalanceCardEnhancedProps {
  balance: QuotaBalanceEnhanced
  requestedQty: number
  showAnimation?: boolean
  onCapacityChange?: (newCapacity: number) => void
}