export interface CreateCallOffRequest {
  quota_id: string
  bundle_qty: number
  requested_delivery_date?: string
}

export interface UpdateCallOffRequest {
  bundle_qty?: number
  requested_delivery_date?: string | null
}

export class CallOffValidator {
  static validateCreateRequest(request: any): string[] {
    const errors: string[] = []
    
    // Validate quota_id
    if (!request.quota_id) {
      errors.push('quota_id is required')
    } else if (typeof request.quota_id !== 'string' || !request.quota_id.match(/^[0-9a-f-]{36}$/i)) {
      errors.push('quota_id must be a valid UUID')
    }
    
    // Validate bundle_qty
    if (request.bundle_qty === undefined || request.bundle_qty === null) {
      errors.push('bundle_qty is required')
    } else if (!Number.isInteger(request.bundle_qty) || request.bundle_qty <= 0) {
      errors.push('bundle_qty must be a positive integer')
    } else if (request.bundle_qty > 10000) {
      errors.push('bundle_qty cannot exceed 10,000')
    }
    
    // Validate requested_delivery_date (optional)
    if (request.requested_delivery_date !== undefined && request.requested_delivery_date !== null) {
      const deliveryDate = new Date(request.requested_delivery_date)
      if (isNaN(deliveryDate.getTime())) {
        errors.push('requested_delivery_date must be a valid ISO date string')
      } else if (deliveryDate < new Date()) {
        errors.push('requested_delivery_date must be in the future')
      }
    }
    
    return errors
  }
  
  static validateUpdateRequest(request: any): string[] {
    const errors: string[] = []
    
    // Check if at least one field is provided
    if (request.bundle_qty === undefined && request.requested_delivery_date === undefined) {
      errors.push('At least one field must be provided for update')
    }
    
    // Validate bundle_qty if provided
    if (request.bundle_qty !== undefined) {
      if (!Number.isInteger(request.bundle_qty) || request.bundle_qty <= 0) {
        errors.push('bundle_qty must be a positive integer')
      } else if (request.bundle_qty > 10000) {
        errors.push('bundle_qty cannot exceed 10,000')
      }
    }
    
    // Validate requested_delivery_date if provided
    if (request.requested_delivery_date !== undefined && request.requested_delivery_date !== null) {
      const deliveryDate = new Date(request.requested_delivery_date)
      if (isNaN(deliveryDate.getTime())) {
        errors.push('requested_delivery_date must be a valid ISO date string')
      } else if (deliveryDate < new Date()) {
        errors.push('requested_delivery_date must be in the future')
      }
    }
    
    return errors
  }

  static validateUUID(value: string, fieldName: string): string[] {
    const errors: string[] = []
    
    if (!value) {
      errors.push(`${fieldName} is required`)
    } else if (typeof value !== 'string' || !value.match(/^[0-9a-f-]{36}$/i)) {
      errors.push(`${fieldName} must be a valid UUID`)
    }
    
    return errors
  }

  static validateListFilters(params: URLSearchParams): string[] {
    const errors: string[] = []
    
    // Validate status
    const status = params.get('status')
    if (status && !['NEW', 'CONFIRMED', 'FULFILLED', 'CANCELLED'].includes(status)) {
      errors.push('status must be one of: NEW, CONFIRMED, FULFILLED, CANCELLED')
    }
    
    // Validate direction
    const direction = params.get('direction')
    if (direction && !['BUY', 'SELL'].includes(direction)) {
      errors.push('direction must be one of: BUY, SELL')
    }
    
    // Validate metal_code
    const metalCode = params.get('metal_code')
    if (metalCode && !['CU', 'AL', 'NI', 'ZN', 'PB', 'SN', 'AG', 'AU'].includes(metalCode)) {
      errors.push('metal_code must be a valid metal code')
    }
    
    // Validate pagination parameters
    const page = params.get('page')
    if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
      errors.push('page must be a positive integer')
    }
    
    const limit = params.get('limit')
    if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
      errors.push('limit must be an integer between 1 and 100')
    }
    
    // Validate sort parameters
    const sortBy = params.get('sort_by')
    if (sortBy && !['created_at', 'bundle_qty', 'status', 'requested_delivery_date', 'call_off_number'].includes(sortBy)) {
      errors.push('sort_by must be one of: created_at, bundle_qty, status, requested_delivery_date, call_off_number')
    }
    
    const sortOrder = params.get('sort_order')
    if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
      errors.push('sort_order must be one of: asc, desc')
    }
    
    return errors
  }
}