import type { QuotaBalance, QuotaBalanceEnhanced, QuotaStatusTheme, ProgressBarConfig } from '../types/quota-balance'

// Thresholds for different utilization levels
export const UTILIZATION_THRESHOLDS = {
  LOW: 0,
  MEDIUM: 70,
  HIGH: 90,
  CRITICAL: 100,
  OVER: 110
} as const

// Color mappings for different status levels
export const STATUS_COLORS = {
  success: {
    color: 'success' as const,
    backgroundColor: '#e8f5e8',
    textColor: '#2e7d32'
  },
  warning: {
    color: 'warning' as const,
    backgroundColor: '#fff8c4',
    textColor: '#f57c00'
  },
  error: {
    color: 'error' as const,
    backgroundColor: '#ffebee',
    textColor: '#d32f2f'
  }
} as const

/**
 * Calculate utilization level based on percentage
 */
export function calculateUtilizationLevel(utilizationPct: number): QuotaBalanceEnhanced['utilization_level'] {
  if (utilizationPct >= UTILIZATION_THRESHOLDS.OVER) return 'over'
  if (utilizationPct >= UTILIZATION_THRESHOLDS.CRITICAL) return 'critical'
  if (utilizationPct >= UTILIZATION_THRESHOLDS.HIGH) return 'high'
  if (utilizationPct >= UTILIZATION_THRESHOLDS.MEDIUM) return 'medium'
  return 'low'
}

/**
 * Determine quota status based on utilization and remaining quantity
 */
export function calculateQuotaStatus(balance: QuotaBalance): QuotaBalanceEnhanced['status'] {
  if (balance.remaining_qty_tonnes < 0) return 'over_allocated'
  if (balance.utilization_pct >= 90) return 'low_stock'
  return 'available'
}

/**
 * Get color mapping for status
 */
export function getStatusColor(status: QuotaBalanceEnhanced['status']): QuotaBalanceEnhanced['status_color'] {
  switch (status) {
    case 'available':
      return 'success'
    case 'low_stock':
      return 'warning'
    case 'over_allocated':
      return 'error'
    default:
      return 'success'
  }
}

/**
 * Get progress bar color based on utilization percentage
 */
export function getProgressColor(utilizationPct: number): ProgressBarConfig['color'] {
  if (utilizationPct >= 100) return 'error'
  if (utilizationPct >= 90) return 'warning'
  return 'success'
}

/**
 * Calculate available capacity percentage for progress bars
 */
export function calculateCapacityPercentage(balance: QuotaBalance): number {
  // Cap at 100% for display purposes, even if over-allocated
  return Math.min(balance.utilization_pct, 100)
}

/**
 * Format quantity with proper units and precision
 */
export function formatQuantity(quantity: number, unit: string = 't'): string {
  if (quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}k${unit}`
  }
  return `${quantity.toFixed(0)}${unit}`
}

/**
 * Format percentage with appropriate precision
 */
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`
}

/**
 * Calculate capacity after a potential call-off
 */
export function calculateCapacityAfterCallOff(balance: QuotaBalance, requestedQty: number): {
  newUtilization: number
  newRemaining: number
  isExceeding: boolean
  withinTolerance: boolean
} {
  const newConsumed = balance.consumed_bundles + requestedQty
  const maxAllowedWithTolerance = balance.quota_qty_tonnes * (1 + balance.tolerance_pct / 100)
  
  const newUtilization = (newConsumed / balance.quota_qty_tonnes) * 100
  const newRemaining = balance.quota_qty_tonnes - newConsumed
  const isExceeding = newRemaining < 0
  const withinTolerance = newConsumed <= maxAllowedWithTolerance

  return {
    newUtilization,
    newRemaining,
    isExceeding,
    withinTolerance
  }
}

/**
 * Convert basic QuotaBalance to enhanced version with computed fields
 */
export function enhanceQuotaBalance(balance: QuotaBalance): QuotaBalanceEnhanced {
  const utilizationLevel = calculateUtilizationLevel(balance.utilization_pct)
  const status = calculateQuotaStatus(balance)
  const statusColor = getStatusColor(status)
  const progressColor = getProgressColor(balance.utilization_pct)
  const capacityPercentage = calculateCapacityPercentage(balance)

  return {
    ...balance,
    available_capacity: balance.remaining_qty_tonnes,
    utilization_level: utilizationLevel,
    status: status,
    status_color: statusColor,
    progress_color: progressColor,
    capacity_percentage: capacityPercentage
  }
}

/**
 * Get status theme configuration
 */
export function getStatusTheme(status: QuotaBalanceEnhanced['status']): QuotaStatusTheme {
  switch (status) {
    case 'available':
      return STATUS_COLORS.success
    case 'low_stock':
      return STATUS_COLORS.warning
    case 'over_allocated':
      return STATUS_COLORS.error
    default:
      return STATUS_COLORS.success
  }
}

/**
 * Generate progress bar configuration
 */
export function getProgressBarConfig(balance: QuotaBalanceEnhanced): ProgressBarConfig {
  return {
    color: balance.progress_color,
    variant: 'determinate',
    value: balance.capacity_percentage
  }
}

/**
 * Calculate color zones for progress bars
 */
export function getProgressBarSx(utilizationPct: number) {
  let backgroundColor = '#4caf50' // Green for 0-70%
  
  if (utilizationPct >= 100) {
    backgroundColor = '#f44336' // Red for >100%
  } else if (utilizationPct >= 90) {
    backgroundColor = '#ff9800' // Orange for 90-100%
  } else if (utilizationPct >= 70) {
    backgroundColor = '#ffc107' // Yellow for 70-90%
  }
  
  return {
    '& .MuiLinearProgress-bar': {
      backgroundColor
    }
  }
}