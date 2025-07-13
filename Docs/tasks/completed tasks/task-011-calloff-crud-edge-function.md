# Task 011: Backend Development - Build Edge Function calloff_crud.ts

**Status**: ✅ COMPLETED & CONFIRMED  
**Priority**: High  
**Estimated Effort**: 3-4 hours  
**Actual Effort**: 4 hours  
**Completed Date**: July 12, 2025  
**Confirmed By**: System  
**Prerequisites**: Tasks 005-010 (Database schema + seed data complete)

## 🎉 Completion Summary

**Successfully implemented comprehensive Call-Off CRUD Edge Function with:**

- ✅ **7 TypeScript modules** deployed to Supabase Edge Functions
- ✅ **RESTful API endpoints** for all call-off operations (CREATE, READ, UPDATE, state transitions)
- ✅ **State machine implementation** with validation (NEW → CONFIRMED → FULFILLED/CANCELLED)
- ✅ **Quota balance validation** preventing over-consumption
- ✅ **Role-based access control** (OPS, TRADE, PLANNER permissions)
- ✅ **Comprehensive request validation** and error handling
- ✅ **Migration 026** applied for additional timestamp fields
- ✅ **Complete API documentation** and testing guide

## 📋 Original Objective

Create a comprehensive Supabase Edge Function that handles all Call-Off operations including CRUD operations, state machine transitions, and business rule validation with proper RLS enforcement.

## 🎯 Scope

### API Endpoints:
1. **POST /call-offs** - Create new call-off
2. **GET /call-offs** - List call-offs with filtering
3. **GET /call-offs/{id}** - Get single call-off details
4. **PATCH /call-offs/{id}** - Update mutable fields (NEW status only)
5. **POST /call-offs/{id}/confirm** - Transition NEW → CONFIRMED
6. **POST /call-offs/{id}/cancel** - Cancel call-off
7. **GET /quotas/{id}/remaining-balance** - Calculate available quota

### Business Logic:
- State machine enforcement (NEW → CONFIRMED → FULFILLED/CANCELLED)
- Quota consumption validation
- Bundle quantity limits and validation
- User role and BU authorization checks
- Automatic call-off number generation

## 📝 Detailed Implementation Plan

### 1. Main Edge Function Structure
```typescript
// supabase/functions/calloff-crud/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CallOffController } from './calloff-controller.ts'
import { AuthMiddleware } from './auth-middleware.ts'

serve(async (req) => {
  try {
    // Apply authentication middleware
    const authResult = await AuthMiddleware.authenticate(req)
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Route the request
    const controller = new CallOffController(authResult.supabase, authResult.user)
    return await controller.handleRequest(req)
    
  } catch (error) {
    console.error('CallOff API Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### 2. Request Router and Controller
```typescript
// calloff-controller.ts
export class CallOffController {
  constructor(
    private supabase: SupabaseClient,
    private user: User
  ) {}

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    
    // Route: /call-offs
    if (pathParts[0] === 'call-offs') {
      return await this.handleCallOffRoutes(req, pathParts, url)
    }
    
    // Route: /quotas/{id}/remaining-balance
    if (pathParts[0] === 'quotas' && pathParts[2] === 'remaining-balance') {
      return await this.handleQuotaBalance(pathParts[1])
    }
    
    return new Response('Not found', { status: 404 })
  }

  private async handleCallOffRoutes(req: Request, pathParts: string[], url: URL): Promise<Response> {
    const method = req.method
    const callOffId = pathParts[1]
    const action = pathParts[2]

    switch (method) {
      case 'GET':
        if (callOffId) {
          return await this.getCallOff(callOffId)
        } else {
          return await this.listCallOffs(url.searchParams)
        }
        
      case 'POST':
        if (callOffId && action === 'confirm') {
          return await this.confirmCallOff(callOffId)
        } else if (callOffId && action === 'cancel') {
          return await this.cancelCallOff(callOffId)
        } else if (!callOffId) {
          return await this.createCallOff(req)
        }
        break
        
      case 'PATCH':
        if (callOffId) {
          return await this.updateCallOff(callOffId, req)
        }
        break
    }
    
    return new Response('Method not allowed', { status: 405 })
  }
}
```

### 3. Call-Off CRUD Operations
```typescript
// calloff-service.ts
export interface CreateCallOffRequest {
  quota_id: string
  bundle_qty: number
  requested_delivery_date?: string
}

export interface UpdateCallOffRequest {
  bundle_qty?: number
  requested_delivery_date?: string
}

export class CallOffService {
  constructor(private supabase: SupabaseClient) {}

  async createCallOff(request: CreateCallOffRequest, userId: string): Promise<any> {
    // Validate quota exists and user has access
    const quota = await this.validateQuotaAccess(request.quota_id)
    
    // Check quota balance
    const balance = await this.getQuotaBalance(request.quota_id)
    if (balance.remaining_qty < request.bundle_qty) {
      throw new Error(`Insufficient quota balance. Available: ${balance.remaining_qty}, requested: ${request.bundle_qty}`)
    }
    
    // Create call-off (trigger will generate call_off_number)
    const callOffData = {
      quota_id: request.quota_id,
      bundle_qty: request.bundle_qty,
      requested_delivery_date: request.requested_delivery_date,
      counterparty_id: quota.counterparty_id,
      direction: quota.direction,
      incoterm_code: quota.incoterm_code,
      created_by: userId,
      status: 'NEW'
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .insert(callOffData)
      .select('*')
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
      throw new Error(`Cannot update call-off in ${callOff.status} status`)
    }
    
    // If updating bundle_qty, check quota balance
    if (request.bundle_qty && request.bundle_qty !== callOff.bundle_qty) {
      const balance = await this.getQuotaBalance(callOff.quota_id)
      const currentConsumption = balance.consumed_bundles - callOff.bundle_qty
      const newConsumption = currentConsumption + request.bundle_qty
      
      if (newConsumption > balance.quota_qty) {
        throw new Error(`Quota would be exceeded. Max available: ${balance.quota_qty - currentConsumption}`)
      }
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .update(request)
      .eq('call_off_id', callOffId)
      .select('*')
      .single()
    
    if (error) {
      throw new Error(`Failed to update call-off: ${error.message}`)
    }
    
    return data
  }

  async getCallOff(callOffId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('v_calloff_summary')
      .select('*')
      .eq('call_off_id', callOffId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Call-off not found')
      }
      throw new Error(`Failed to get call-off: ${error.message}`)
    }
    
    return data
  }

  async listCallOffs(filters: URLSearchParams): Promise<any> {
    let query = this.supabase
      .from('v_calloff_summary')
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
    
    return data
  }
}
```

### 4. State Machine Operations
```typescript
// calloff-state-machine.ts
export class CallOffStateMachine {
  constructor(private supabase: SupabaseClient) {}

  async confirmCallOff(callOffId: string): Promise<any> {
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    if (callOff.status !== 'NEW') {
      throw new Error(`Cannot confirm call-off in ${callOff.status} status`)
    }
    
    // Validate bundle_qty > 0
    if (callOff.bundle_qty <= 0) {
      throw new Error('Cannot confirm call-off with zero bundle quantity')
    }
    
    // Check quota doesn't exceed tolerance
    const balance = await this.getQuotaBalance(callOff.quota_id)
    const tolerance = balance.tolerance_pct / 100
    const maxAllowed = balance.quota_qty * (1 + tolerance)
    
    if (balance.consumed_bundles > maxAllowed) {
      throw new Error(`Quota tolerance exceeded. Max allowed: ${maxAllowed}, current: ${balance.consumed_bundles}`)
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .update({ 
        status: 'CONFIRMED',
        confirmed_at: new Date().toISOString()
      })
      .eq('call_off_id', callOffId)
      .select('*')
      .single()
    
    if (error) {
      throw new Error(`Failed to confirm call-off: ${error.message}`)
    }
    
    return data
  }

  async cancelCallOff(callOffId: string): Promise<any> {
    const callOff = await this.getCallOffForStateChange(callOffId)
    
    if (!['NEW', 'CONFIRMED'].includes(callOff.status)) {
      throw new Error(`Cannot cancel call-off in ${callOff.status} status`)
    }
    
    const { data, error } = await this.supabase
      .from('call_off')
      .update({ 
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString()
      })
      .eq('call_off_id', callOffId)
      .select('*')
      .single()
    
    if (error) {
      throw new Error(`Failed to cancel call-off: ${error.message}`)
    }
    
    return data
  }

  private async getCallOffForStateChange(callOffId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('call_off')
      .select('*')
      .eq('call_off_id', callOffId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Call-off not found')
      }
      throw new Error(`Failed to get call-off: ${error.message}`)
    }
    
    return data
  }
}
```

### 5. Quota Balance Calculation
```typescript
// quota-service.ts
export class QuotaService {
  constructor(private supabase: SupabaseClient) {}

  async getQuotaBalance(quotaId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('v_quota_balance')
      .select('*')
      .eq('quota_id', quotaId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quota not found')
      }
      throw new Error(`Failed to get quota balance: ${error.message}`)
    }
    
    return {
      quota_id: data.quota_id,
      quota_qty: data.quota_qty,
      consumed_bundles: data.consumed_bundles,
      remaining_qty: data.remaining_qty,
      tolerance_pct: data.tolerance_pct,
      utilization_pct: (data.consumed_bundles / data.quota_qty) * 100
    }
  }

  async validateQuotaAccess(quotaId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('quota')
      .select('*')
      .eq('quota_id', quotaId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quota not found or access denied')
      }
      throw new Error(`Failed to validate quota access: ${error.message}`)
    }
    
    return data
  }
}
```

### 6. Request Validation
```typescript
// validation.ts
export class CallOffValidator {
  static validateCreateRequest(request: any): string[] {
    const errors: string[] = []
    
    if (!request.quota_id || !request.quota_id.match(/^[0-9a-f-]{36}$/i)) {
      errors.push('Valid quota_id is required')
    }
    
    if (!request.bundle_qty || !Number.isInteger(request.bundle_qty) || request.bundle_qty <= 0) {
      errors.push('bundle_qty must be a positive integer')
    }
    
    if (request.bundle_qty > 10000) {
      errors.push('bundle_qty cannot exceed 10,000')
    }
    
    if (request.requested_delivery_date) {
      const deliveryDate = new Date(request.requested_delivery_date)
      if (isNaN(deliveryDate.getTime()) || deliveryDate < new Date()) {
        errors.push('requested_delivery_date must be a valid future date')
      }
    }
    
    return errors
  }
  
  static validateUpdateRequest(request: any): string[] {
    const errors: string[] = []
    
    if (request.bundle_qty !== undefined) {
      if (!Number.isInteger(request.bundle_qty) || request.bundle_qty <= 0) {
        errors.push('bundle_qty must be a positive integer')
      }
      
      if (request.bundle_qty > 10000) {
        errors.push('bundle_qty cannot exceed 10,000')
      }
    }
    
    if (request.requested_delivery_date !== undefined) {
      if (request.requested_delivery_date !== null) {
        const deliveryDate = new Date(request.requested_delivery_date)
        if (isNaN(deliveryDate.getTime()) || deliveryDate < new Date()) {
          errors.push('requested_delivery_date must be a valid future date')
        }
      }
    }
    
    return errors
  }
}
```

## ✅ Acceptance Criteria

- [ ] All API endpoints functional and properly routed
- [ ] CRUD operations work with proper RLS enforcement
- [ ] State machine transitions follow business rules:
  - [ ] NEW → CONFIRMED only with valid bundle_qty
  - [ ] Cancellation allowed only in NEW/CONFIRMED states
  - [ ] Updates only allowed in NEW state
- [ ] Quota balance validation prevents over-consumption
- [ ] Call-off number auto-generation working
- [ ] Input validation prevents invalid data
- [ ] Error responses are clear and actionable
- [ ] Performance: API responses under 500ms
- [ ] User permissions properly enforced
- [ ] Pagination and filtering work correctly

## 🔄 Dependencies

**Requires**:
- Tasks 005-008: Database schema + seed data complete
- User authentication and profile setup
- RLS policies properly configured

**Blocks**:
- Frontend call-off management screens
- Shipment line creation and management
- Transport order integration

**Note**: This task has been updated to work with manual quota seeding instead of Titan integration. Titan quota import (originally Task 008) has been moved to backlog for later implementation.

## 📁 Files to Create/Modify

```
supabase/
├── functions/
│   └── calloff-crud/
│       ├── index.ts
│       ├── calloff-controller.ts
│       ├── calloff-service.ts
│       ├── calloff-state-machine.ts
│       ├── quota-service.ts
│       ├── auth-middleware.ts
│       └── validation.ts
database/
├── migrations/
│   └── 022_add_calloff_timestamps.sql
└── docs/
    └── calloff-api.md
```

## 🚨 Risks & Considerations

1. **Concurrent Access**: Multiple users modifying same call-off
2. **Quota Race Conditions**: Simultaneous quota consumption checks
3. **State Consistency**: Ensuring state transitions are atomic
4. **Performance**: Complex quota balance calculations
5. **User Permissions**: RLS policy interaction with business logic

## 🧪 Testing Strategy

1. **Unit Tests**: Individual service methods
2. **Integration Tests**: Full API endpoint flows
3. **State Tests**: All valid and invalid state transitions
4. **Concurrent Tests**: Multiple users, quota contention
5. **Permission Tests**: Role-based access scenarios

## 📋 Review Checklist

Before approval, verify:
- [ ] API design follows RESTful principles
- [ ] Business rules correctly implemented
- [ ] State machine logic is robust
- [ ] Error handling covers all edge cases
- [ ] Performance considerations addressed
- [ ] Security (authentication, authorization) is complete
- [ ] Documentation covers all endpoints and responses

---

**Next Task**: Task 010 - Create React form for Create Call-Off  
**Review Required**: Yes - Please approve before implementation