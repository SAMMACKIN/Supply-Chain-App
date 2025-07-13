import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CallOffService } from './calloff-service.ts'
import { CallOffStateMachine } from './calloff-state-machine.ts'
import { QuotaService } from './quota-service.ts'
import { AuthMiddleware } from './auth-middleware.ts'
import { CallOffValidator, CreateCallOffRequest, UpdateCallOffRequest } from './validation.ts'

export class CallOffController {
  private callOffService: CallOffService
  private stateMachine: CallOffStateMachine
  private quotaService: QuotaService

  constructor(
    private supabase: SupabaseClient,
    private user: any
  ) {
    this.callOffService = new CallOffService(supabase)
    this.stateMachine = new CallOffStateMachine(supabase)
    this.quotaService = new QuotaService(supabase)
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    
    try {
      // Route: /call-offs
      if (pathParts.length >= 1 && pathParts[0] === 'call-offs') {
        return await this.handleCallOffRoutes(req, pathParts, url)
      }
      
      // Route: /quotas/{id}/remaining-balance
      if (pathParts.length === 3 && pathParts[0] === 'quotas' && pathParts[2] === 'remaining-balance') {
        return await this.handleQuotaBalance(pathParts[1])
      }
      
      // Route: /quotas (list available quotas)
      if (pathParts.length === 1 && pathParts[0] === 'quotas') {
        return await this.handleQuotaList(url.searchParams)
      }
      
      return this.notFoundResponse()
      
    } catch (error) {
      return this.errorResponse(error.message, 500, 'OPERATION_FAILED')
    }
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
          return await this.cancelCallOff(callOffId, req)
        } else if (callOffId && action === 'fulfill') {
          return await this.fulfillCallOff(callOffId)
        } else if (!callOffId) {
          return await this.createCallOff(req)
        }
        return this.methodNotAllowedResponse()
        
      case 'PATCH':
        if (callOffId) {
          return await this.updateCallOff(callOffId, req)
        }
        return this.methodNotAllowedResponse()
        
      case 'DELETE':
        if (callOffId) {
          // For this implementation, DELETE will cancel the call-off
          return await this.cancelCallOff(callOffId, req)
        }
        return this.methodNotAllowedResponse()
        
      default:
        return this.methodNotAllowedResponse()
    }
  }

  private async createCallOff(req: Request): Promise<Response> {
    try {
      // Check permissions
      if (!AuthMiddleware.canCreateCallOff(this.user)) {
        return this.forbiddenResponse('Insufficient permissions to create call-offs')
      }

      const body = await req.json()
      
      // Validate request
      const validationErrors = CallOffValidator.validateCreateRequest(body)
      if (validationErrors.length > 0) {
        return this.badRequestResponse('Validation failed', validationErrors)
      }

      const request: CreateCallOffRequest = {
        quota_id: body.quota_id,
        bundle_qty: body.bundle_qty,
        requested_delivery_date: body.requested_delivery_date
      }

      const callOff = await this.callOffService.createCallOff(request, this.user.id)
      
      return this.successResponse(callOff, 201)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      if (error.message.includes('exceeded') || error.message.includes('capacity')) {
        return this.badRequestResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'CREATE_FAILED')
    }
  }

  private async updateCallOff(callOffId: string, req: Request): Promise<Response> {
    try {
      // Check permissions
      if (!AuthMiddleware.canUpdateCallOff(this.user)) {
        return this.forbiddenResponse('Insufficient permissions to update call-offs')
      }

      // Validate UUID
      const uuidErrors = CallOffValidator.validateUUID(callOffId, 'call_off_id')
      if (uuidErrors.length > 0) {
        return this.badRequestResponse('Invalid call-off ID', uuidErrors)
      }

      const body = await req.json()
      
      // Validate request
      const validationErrors = CallOffValidator.validateUpdateRequest(body)
      if (validationErrors.length > 0) {
        return this.badRequestResponse('Validation failed', validationErrors)
      }

      const request: UpdateCallOffRequest = {
        bundle_qty: body.bundle_qty,
        requested_delivery_date: body.requested_delivery_date
      }

      const callOff = await this.callOffService.updateCallOff(callOffId, request)
      
      return this.successResponse(callOff)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      if (error.message.includes('Cannot update') || error.message.includes('exceeded')) {
        return this.badRequestResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'UPDATE_FAILED')
    }
  }

  private async getCallOff(callOffId: string): Promise<Response> {
    try {
      // Validate UUID
      const uuidErrors = CallOffValidator.validateUUID(callOffId, 'call_off_id')
      if (uuidErrors.length > 0) {
        return this.badRequestResponse('Invalid call-off ID', uuidErrors)
      }

      const callOff = await this.callOffService.getCallOff(callOffId)
      
      return this.successResponse(callOff)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'GET_FAILED')
    }
  }

  private async listCallOffs(params: URLSearchParams): Promise<Response> {
    try {
      // Validate filters
      const validationErrors = CallOffValidator.validateListFilters(params)
      if (validationErrors.length > 0) {
        return this.badRequestResponse('Invalid filter parameters', validationErrors)
      }

      const result = await this.callOffService.listCallOffs(params)
      
      return this.successResponse(result)
      
    } catch (error) {
      return this.errorResponse(error.message, 500, 'LIST_FAILED')
    }
  }

  private async confirmCallOff(callOffId: string): Promise<Response> {
    try {
      // Check permissions
      if (!AuthMiddleware.canConfirmCallOff(this.user)) {
        return this.forbiddenResponse('Insufficient permissions to confirm call-offs')
      }

      // Validate UUID
      const uuidErrors = CallOffValidator.validateUUID(callOffId, 'call_off_id')
      if (uuidErrors.length > 0) {
        return this.badRequestResponse('Invalid call-off ID', uuidErrors)
      }

      const callOff = await this.stateMachine.confirmCallOff(callOffId)
      
      return this.successResponse(callOff)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      if (error.message.includes('Cannot confirm') || error.message.includes('exceeded')) {
        return this.badRequestResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'CONFIRM_FAILED')
    }
  }

  private async cancelCallOff(callOffId: string, req: Request): Promise<Response> {
    try {
      // Check permissions
      if (!AuthMiddleware.canCancelCallOff(this.user)) {
        return this.forbiddenResponse('Insufficient permissions to cancel call-offs')
      }

      // Validate UUID
      const uuidErrors = CallOffValidator.validateUUID(callOffId, 'call_off_id')
      if (uuidErrors.length > 0) {
        return this.badRequestResponse('Invalid call-off ID', uuidErrors)
      }

      // Get optional reason from request body
      let reason: string | undefined
      try {
        const body = await req.json()
        reason = body.reason
      } catch {
        // Body is optional for cancellation
      }

      const callOff = await this.stateMachine.cancelCallOff(callOffId, reason)
      
      return this.successResponse(callOff)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      if (error.message.includes('Cannot cancel')) {
        return this.badRequestResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'CANCEL_FAILED')
    }
  }

  private async fulfillCallOff(callOffId: string): Promise<Response> {
    try {
      // Check permissions (only OPS and PLANNER can fulfill)
      if (!AuthMiddleware.hasRole(this.user, ['OPS', 'PLANNER'])) {
        return this.forbiddenResponse('Insufficient permissions to fulfill call-offs')
      }

      // Validate UUID
      const uuidErrors = CallOffValidator.validateUUID(callOffId, 'call_off_id')
      if (uuidErrors.length > 0) {
        return this.badRequestResponse('Invalid call-off ID', uuidErrors)
      }

      const callOff = await this.stateMachine.fulfillCallOff(callOffId)
      
      return this.successResponse(callOff)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      if (error.message.includes('Cannot fulfill')) {
        return this.badRequestResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'FULFILL_FAILED')
    }
  }

  private async handleQuotaBalance(quotaId: string): Promise<Response> {
    try {
      // Validate UUID
      const uuidErrors = CallOffValidator.validateUUID(quotaId, 'quota_id')
      if (uuidErrors.length > 0) {
        return this.badRequestResponse('Invalid quota ID', uuidErrors)
      }

      const balance = await this.quotaService.getQuotaBalance(quotaId)
      
      return this.successResponse(balance)
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return this.notFoundResponse(error.message)
      }
      return this.errorResponse(error.message, 500, 'QUOTA_BALANCE_FAILED')
    }
  }

  private async handleQuotaList(params: URLSearchParams): Promise<Response> {
    try {
      // For public access, query quotas directly without RLS restrictions
      if (!this.user) {
        // TEMP: Return test data to verify the flow works
        return this.successResponse({
          data: [
            {
              quota_id: 'test-quota-1',
              metal_code: 'AL99',
              direction: 'BUY',
              qty_t: 1000,
              period_month: '2025-01-01'
            }
          ],
          count: 1
        })
        
        // Public access - get quotas directly
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
        
        // Apply basic filters
        if (params.get('metal_code')) {
          query = query.eq('metal_code', params.get('metal_code'))
        }
        
        if (params.get('direction')) {
          query = query.eq('direction', params.get('direction'))
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
        
        return this.successResponse({
          data: data || [],
          count: (data || []).length
        })
      } else {
        // Authenticated access - use the service method
        const quotas = await this.quotaService.getQuotasByUser(params)
        
        return this.successResponse({
          data: quotas,
          count: quotas.length
        })
      }
      
    } catch (error) {
      return this.errorResponse(error.message, 500, 'QUOTA_LIST_FAILED')
    }
  }

  // Response helpers
  private successResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private errorResponse(message: string, status = 500, code = 'ERROR'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      code
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private badRequestResponse(message: string, errors?: string[]): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
      details: errors
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private notFoundResponse(message = 'Resource not found'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      code: 'NOT_FOUND'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private forbiddenResponse(message = 'Access forbidden'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      code: 'FORBIDDEN'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private methodNotAllowedResponse(): Response {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}