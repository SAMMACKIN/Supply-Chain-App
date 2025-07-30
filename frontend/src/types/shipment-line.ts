export type ShipmentLineStatus = 'PLANNED' | 'READY' | 'PICKED' | 'SHIPPED' | 'DELIVERED'

export interface ShipmentLine {
  shipment_line_id: string
  call_off_id: string
  transport_order_id?: string
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
  status: ShipmentLineStatus
  created_at: string
  updated_at: string
}

export interface CreateShipmentLineRequest {
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
}

export interface UpdateShipmentLineRequest {
  bundle_qty?: number
  metal_code?: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
  status?: ShipmentLineStatus
}

export interface ShipmentLineFormData {
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
}

// Enhanced validation types
export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ShipmentLineValidationResult {
  isValid: boolean
  errors: ValidationError[]
  hasWarnings: boolean
  capacityInfo?: {
    remainingCallOffCapacity: number
    quotaUtilization: number
    withinTolerance: boolean
  }
}

export interface BusinessRuleValidationResult {
  isValid: boolean
  requiresConfirmation: boolean
  error?: ValidationError
  warning?: ValidationError
}

export interface StatusTransitionRule {
  fromStatus: ShipmentLineStatus
  toStatus: ShipmentLineStatus
  requiresConfirmation: boolean
  isDestructive: boolean
}

// Enhanced shipment line with computed fields
export interface ShipmentLineEnhanced extends ShipmentLine {
  canEdit: boolean
  canDelete: boolean
  editReason?: string
  deleteReason?: string
  requiresDeleteConfirmation?: boolean
  statusTransitions: ShipmentLineStatus[]
  utilizationImpact?: number
}

// Filtering and sorting types
export interface ShipmentLineFilters {
  status?: ShipmentLineStatus[]
  dateRange?: {
    start: string
    end: string
    field: 'expected_ship_date' | 'requested_delivery_date' | 'created_at'
  }
  metalCode?: string[]
  bundleQtyRange?: {
    min: number
    max: number
  }
}

export interface ShipmentLineSortConfig {
  field: keyof ShipmentLine
  direction: 'asc' | 'desc'
}

// Bulk operations foundation
export interface BulkShipmentLineOperation {
  type: 'update_status' | 'delete' | 'update_dates'
  shipmentLineIds: string[]
  data?: Partial<UpdateShipmentLineRequest>
}

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors?: Array<{
    shipmentLineId: string
    error: string
  }>
}

// Capacity visualization types
export interface CapacityVisualization {
  totalCapacity: number
  allocatedCapacity: number
  remainingCapacity: number
  utilizationPercentage: number
  isOverAllocated: boolean
  allocationBreakdown: Array<{
    shipmentLineId: string
    bundleQty: number
    percentage: number
    status: ShipmentLineStatus
  }>
}

// Form state management
export interface ShipmentLineFormState {
  isValid: boolean
  isDirty: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  smartDefaults: Partial<CreateShipmentLineRequest>
  validationInProgress: boolean
}

// Real-time validation hooks
export interface UseShipmentLineValidationProps {
  callOffId: string
  quotaId?: string
  existingShipmentLines?: ShipmentLine[]
}

export interface UseShipmentLineValidationResult {
  validateCreate: (data: CreateShipmentLineRequest) => ShipmentLineValidationResult
  validateUpdate: (data: UpdateShipmentLineRequest, currentLine: ShipmentLine) => ShipmentLineValidationResult & { businessRules?: BusinessRuleValidationResult }
  validateField: (field: string, value: any) => ValidationError | null
  smartDefaults: Partial<CreateShipmentLineRequest>
  capacityInfo: CapacityVisualization
  loading: boolean
}

// Timeline and audit trail types
export interface ShipmentLineTimelineEntry {
  timestamp: string
  action: 'created' | 'updated' | 'status_changed' | 'deleted'
  field?: string
  oldValue?: any
  newValue?: any
  userId: string
  userRole?: string
  notes?: string
}

export interface ShipmentLineAuditTrail {
  shipmentLineId: string
  timeline: ShipmentLineTimelineEntry[]
  lastModified: string
  modifiedBy: string
}