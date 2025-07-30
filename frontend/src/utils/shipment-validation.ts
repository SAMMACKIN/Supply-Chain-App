import type { 
  ShipmentLine, 
  CreateShipmentLineRequest, 
  UpdateShipmentLineRequest,
  ShipmentLineStatus,
  ShipmentLineValidationResult,
  BusinessRuleValidationResult,
  ValidationError,
  StatusTransitionRule
} from '../types/shipment-line'
import type { CallOff, QuotaBalance } from '../types/calloff'
import { calculateCapacityAfterCallOff } from './quota-balance-utils'

// Business rule constants
export const SHIPMENT_LINE_LIMITS = {
  MIN_BUNDLE_QTY: 1,
  MAX_BUNDLE_QTY: 10000,
  MAX_NOTES_LENGTH: 500,
  MAX_LOCATION_LENGTH: 100,
  MAX_PARTY_ID_LENGTH: 50
} as const

// Valid metal codes (should match backend enum)
export const VALID_METAL_CODES = ['CU', 'AL', 'ZN', 'PB', 'NI', 'SN', 'AG', 'AU'] as const

// Status transition rules
export const STATUS_TRANSITIONS: Record<ShipmentLineStatus, ShipmentLineStatus[]> = {
  PLANNED: ['READY', 'PLANNED'], // Can only progress to READY or stay PLANNED
  READY: ['PICKED', 'PLANNED'], // Can progress to PICKED or revert to PLANNED
  PICKED: ['SHIPPED', 'READY'], // Can progress to SHIPPED or revert to READY
  SHIPPED: ['DELIVERED', 'SHIPPED'], // Can only progress to DELIVERED or stay SHIPPED
  DELIVERED: ['DELIVERED'] // Terminal state
}

// Destructive actions that require confirmation
export const DESTRUCTIVE_STATUS_CHANGES: ShipmentLineStatus[] = ['DELIVERED']

/**
 * Validate metal code against call-off/quota metal code
 */
export function validateMetalCode(
  metalCode: string,
  callOff: CallOff,
  quotaBalance?: QuotaBalance
): ValidationError | null {
  if (!VALID_METAL_CODES.includes(metalCode as any)) {
    return {
      field: 'metal_code',
      message: `Invalid metal code. Must be one of: ${VALID_METAL_CODES.join(', ')}`,
      severity: 'error'
    }
  }

  // Check if quota has specific metal code requirements
  // Note: In real implementation, you'd fetch quota details to validate metal_code
  if (quotaBalance && metalCode !== callOff.direction) {
    // This is a placeholder - in real implementation, compare against quota.metal_code
    // For now, we'll just validate the format
  }

  return null
}

/**
 * Validate bundle quantity against call-off capacity and quota limits
 */
export function validateBundleQuantity(
  bundleQty: number,
  callOff: CallOff,
  existingShipmentLines: ShipmentLine[] = [],
  editingLineId?: string,
  quotaBalance?: QuotaBalance
): ValidationError | null {
  // Basic range validation
  if (bundleQty < SHIPMENT_LINE_LIMITS.MIN_BUNDLE_QTY) {
    return {
      field: 'bundle_qty',
      message: `Minimum quantity is ${SHIPMENT_LINE_LIMITS.MIN_BUNDLE_QTY} tonne`,
      severity: 'error'
    }
  }

  if (bundleQty > SHIPMENT_LINE_LIMITS.MAX_BUNDLE_QTY) {
    return {
      field: 'bundle_qty',
      message: `Maximum quantity is ${SHIPMENT_LINE_LIMITS.MAX_BUNDLE_QTY} tonnes`,
      severity: 'error'
    }
  }

  // Calculate allocated quantity (excluding the line being edited)
  const allocatedQty = existingShipmentLines
    .filter(line => line.shipment_line_id !== editingLineId)
    .reduce((sum, line) => sum + line.bundle_qty, 0)

  const remainingCapacity = callOff.bundle_qty - allocatedQty
  
  if (bundleQty > remainingCapacity) {
    return {
      field: 'bundle_qty',
      message: `Exceeds remaining call-off capacity. Available: ${remainingCapacity} tonnes`,
      severity: 'error'
    }
  }

  // Check quota capacity if available
  if (quotaBalance) {
    const quotaCheck = calculateCapacityAfterCallOff(quotaBalance, bundleQty)
    
    if (!quotaCheck.withinTolerance) {
      return {
        field: 'bundle_qty',
        message: `Exceeds quota tolerance limits. Would result in ${quotaCheck.newUtilization.toFixed(1)}% utilization`,
        severity: 'error'
      }
    }

    if (quotaCheck.isExceeding && quotaCheck.withinTolerance) {
      return {
        field: 'bundle_qty',
        message: `Exceeds quota limit but within tolerance. Utilization: ${quotaCheck.newUtilization.toFixed(1)}%`,
        severity: 'warning'
      }
    }
  }

  return null
}

/**
 * Validate date fields for logical consistency
 */
export function validateDates(
  expectedShipDate?: string,
  requestedDeliveryDate?: string
): ValidationError[] {
  const errors: ValidationError[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (expectedShipDate) {
    const shipDate = new Date(expectedShipDate)
    if (shipDate < today) {
      errors.push({
        field: 'expected_ship_date',
        message: 'Expected ship date cannot be in the past',
        severity: 'error'
      })
    }
  }

  if (requestedDeliveryDate) {
    const deliveryDate = new Date(requestedDeliveryDate)
    if (deliveryDate < today) {
      errors.push({
        field: 'requested_delivery_date',
        message: 'Requested delivery date cannot be in the past',
        severity: 'error'
      })
    }
  }

  if (expectedShipDate && requestedDeliveryDate) {
    const shipDate = new Date(expectedShipDate)
    const deliveryDate = new Date(requestedDeliveryDate)
    
    if (deliveryDate <= shipDate) {
      errors.push({
        field: 'requested_delivery_date',
        message: 'Delivery date must be after ship date',
        severity: 'warning'
      })
    }
  }

  return errors
}

/**
 * Validate status transitions
 */
export function validateStatusTransition(
  currentStatus: ShipmentLineStatus,
  newStatus: ShipmentLineStatus
): BusinessRuleValidationResult {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || []
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      isValid: false,
      error: {
        field: 'status',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
        severity: 'error'
      },
      requiresConfirmation: false
    }
  }

  const requiresConfirmation = DESTRUCTIVE_STATUS_CHANGES.includes(newStatus) || 
                              newStatus === 'DELIVERED'

  return {
    isValid: true,
    requiresConfirmation,
    warning: requiresConfirmation ? {
      field: 'status',
      message: `This status change is permanent and cannot be undone`,
      severity: 'warning'
    } : undefined
  }
}

/**
 * Validate field lengths and formats
 */
export function validateFieldFormats(data: CreateShipmentLineRequest | UpdateShipmentLineRequest): ValidationError[] {
  const errors: ValidationError[] = []

  if (data.notes && data.notes.length > SHIPMENT_LINE_LIMITS.MAX_NOTES_LENGTH) {
    errors.push({
      field: 'notes',
      message: `Notes cannot exceed ${SHIPMENT_LINE_LIMITS.MAX_NOTES_LENGTH} characters`,
      severity: 'error'
    })
  }

  if (data.delivery_location && data.delivery_location.length > SHIPMENT_LINE_LIMITS.MAX_LOCATION_LENGTH) {
    errors.push({
      field: 'delivery_location',
      message: `Delivery location cannot exceed ${SHIPMENT_LINE_LIMITS.MAX_LOCATION_LENGTH} characters`,
      severity: 'error'
    })
  }

  if (data.destination_party_id && data.destination_party_id.length > SHIPMENT_LINE_LIMITS.MAX_PARTY_ID_LENGTH) {
    errors.push({
      field: 'destination_party_id',
      message: `Destination party ID cannot exceed ${SHIPMENT_LINE_LIMITS.MAX_PARTY_ID_LENGTH} characters`,
      severity: 'error'
    })
  }

  return errors
}

/**
 * Comprehensive validation for creating shipment lines
 */
export function validateCreateShipmentLine(
  data: CreateShipmentLineRequest,
  callOff: CallOff,
  existingShipmentLines?: ShipmentLine[],
  quotaBalance?: QuotaBalance
): ShipmentLineValidationResult {
  const errors: ValidationError[] = []

  // Metal code validation
  const metalCodeError = validateMetalCode(data.metal_code, callOff, quotaBalance)
  if (metalCodeError) errors.push(metalCodeError)

  // Bundle quantity validation
  const bundleQtyError = validateBundleQuantity(
    data.bundle_qty, 
    callOff, 
    existingShipmentLines, 
    undefined, 
    quotaBalance
  )
  if (bundleQtyError) errors.push(bundleQtyError)

  // Date validation
  const dateErrors = validateDates(data.expected_ship_date, data.requested_delivery_date)
  errors.push(...dateErrors)

  // Field format validation
  const formatErrors = validateFieldFormats(data)
  errors.push(...formatErrors)

  const hasErrors = errors.some(error => error.severity === 'error')
  const hasWarnings = errors.some(error => error.severity === 'warning')

  return {
    isValid: !hasErrors,
    errors,
    hasWarnings,
    capacityInfo: quotaBalance ? {
      remainingCallOffCapacity: callOff.bundle_qty - (existingShipmentLines?.reduce((sum, line) => sum + line.bundle_qty, 0) || 0),
      quotaUtilization: quotaBalance.utilization_pct,
      withinTolerance: quotaBalance.tolerance_status !== 'OVER_TOLERANCE'
    } : undefined
  }
}

/**
 * Comprehensive validation for updating shipment lines
 */
export function validateUpdateShipmentLine(
  data: UpdateShipmentLineRequest,
  currentLine: ShipmentLine,
  callOff: CallOff,
  existingShipmentLines?: ShipmentLine[],
  quotaBalance?: QuotaBalance
): ShipmentLineValidationResult & { businessRules?: BusinessRuleValidationResult } {
  const errors: ValidationError[] = []
  let businessRules: BusinessRuleValidationResult | undefined

  // Metal code validation (if changed)
  if (data.metal_code && data.metal_code !== currentLine.metal_code) {
    const metalCodeError = validateMetalCode(data.metal_code, callOff, quotaBalance)
    if (metalCodeError) errors.push(metalCodeError)
  }

  // Bundle quantity validation (if changed)
  if (data.bundle_qty && data.bundle_qty !== currentLine.bundle_qty) {
    const bundleQtyError = validateBundleQuantity(
      data.bundle_qty, 
      callOff, 
      existingShipmentLines, 
      currentLine.shipment_line_id, 
      quotaBalance
    )
    if (bundleQtyError) errors.push(bundleQtyError)
  }

  // Status transition validation (if changed)
  if (data.status && data.status !== currentLine.status) {
    businessRules = validateStatusTransition(currentLine.status, data.status)
    if (!businessRules.isValid) {
      errors.push(businessRules.error!)
    } else if (businessRules.warning) {
      errors.push(businessRules.warning)
    }
  }

  // Date validation
  const expectedShipDate = data.expected_ship_date ?? currentLine.expected_ship_date
  const requestedDeliveryDate = data.requested_delivery_date ?? currentLine.requested_delivery_date
  const dateErrors = validateDates(expectedShipDate, requestedDeliveryDate)
  errors.push(...dateErrors)

  // Field format validation
  const formatErrors = validateFieldFormats(data)
  errors.push(...formatErrors)

  const hasErrors = errors.some(error => error.severity === 'error')
  const hasWarnings = errors.some(error => error.severity === 'warning')

  return {
    isValid: !hasErrors,
    errors,
    hasWarnings,
    businessRules,
    capacityInfo: quotaBalance ? {
      remainingCallOffCapacity: callOff.bundle_qty - (existingShipmentLines?.reduce((sum, line) => 
        line.shipment_line_id === currentLine.shipment_line_id ? 0 : sum + line.bundle_qty, 0) || 0),
      quotaUtilization: quotaBalance.utilization_pct,
      withinTolerance: quotaBalance.tolerance_status !== 'OVER_TOLERANCE'
    } : undefined
  }
}

/**
 * Generate context-aware error messages
 */
export function generateContextualErrorMessage(
  error: ValidationError,
  context: {
    callOff: CallOff
    quotaBalance?: QuotaBalance
    remainingCapacity?: number
  }
): string {
  const { callOff, quotaBalance, remainingCapacity } = context

  switch (error.field) {
    case 'bundle_qty':
      if (remainingCapacity !== undefined) {
        return `${error.message}. Call-off ${callOff.call_off_number} has ${remainingCapacity} tonnes remaining.`
      }
      break
    case 'metal_code':
      return `${error.message}. Call-off is for ${callOff.direction} direction.`
    default:
      return error.message
  }

  return error.message
}

/**
 * Calculate smart defaults for shipment line creation
 */
export function calculateSmartDefaults(
  callOff: CallOff,
  existingShipmentLines?: ShipmentLine[],
  quotaBalance?: QuotaBalance
): Partial<CreateShipmentLineRequest> {
  const allocatedQty = existingShipmentLines?.reduce((sum, line) => sum + line.bundle_qty, 0) || 0
  const remainingQty = callOff.bundle_qty - allocatedQty

  // Default to remaining quantity, but cap at reasonable amounts
  const suggestedQty = Math.min(remainingQty, 25) // Cap at 25 tonnes for single shipment

  // Smart metal code default (would come from quota in real implementation)
  const metalCode = 'CU' // Default to copper, should come from quota.metal_code

  // Default ship date to tomorrow (business day logic could be added)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultShipDate = tomorrow.toISOString().split('T')[0]

  return {
    bundle_qty: suggestedQty,
    metal_code: metalCode,
    expected_ship_date: defaultShipDate,
    notes: `Shipment for ${callOff.call_off_number}`
  }
}

/**
 * Check if shipment line can be edited
 */
export function canEditShipmentLine(shipmentLine: ShipmentLine, callOff: CallOff): {
  canEdit: boolean
  reason?: string
} {
  if (callOff.status !== 'NEW') {
    return {
      canEdit: false,
      reason: `Cannot edit shipment lines when call-off is ${callOff.status}`
    }
  }

  if (shipmentLine.status === 'DELIVERED') {
    return {
      canEdit: false,
      reason: 'Cannot edit delivered shipment lines'
    }
  }

  if (shipmentLine.status === 'SHIPPED') {
    return {
      canEdit: false,
      reason: 'Cannot edit shipped shipment lines (limited edits only)'
    }
  }

  return { canEdit: true }
}

/**
 * Check if shipment line can be deleted
 */
export function canDeleteShipmentLine(shipmentLine: ShipmentLine, callOff: CallOff): {
  canDelete: boolean
  reason?: string
  requiresConfirmation?: boolean
} {
  if (callOff.status !== 'NEW') {
    return {
      canDelete: false,
      reason: `Cannot delete shipment lines when call-off is ${callOff.status}`
    }
  }

  if (shipmentLine.status === 'DELIVERED') {
    return {
      canDelete: false,
      reason: 'Cannot delete delivered shipment lines'
    }
  }

  if (shipmentLine.status === 'SHIPPED') {
    return {
      canDelete: false,
      reason: 'Cannot delete shipped shipment lines'
    }
  }

  const requiresConfirmation = shipmentLine.status !== 'PLANNED'

  return { 
    canDelete: true, 
    requiresConfirmation,
    reason: requiresConfirmation ? 'This shipment line has progressed beyond planning stage' : undefined
  }
}