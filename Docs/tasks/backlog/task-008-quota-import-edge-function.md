# Task 008: Backend Development - Build Edge Function import_quota_from_titan.ts

**Status**: 🔴 Pending Approval  
**Priority**: High  
**Estimated Effort**: 2-3 hours  
**Prerequisites**: Tasks 005-007 (Database schema complete)

## 📋 Objective

Create a Supabase Edge Function that consumes quota data from Titan's Kafka CDC stream and upserts it into the CSLA database, ensuring real-time synchronization and data consistency.

## 🎯 Scope

### Core Functionality:
1. **Kafka Consumer** - Subscribe to `titan.quota` CDC topic
2. **Data Transformation** - Map Titan format to CSLA schema
3. **Upsert Logic** - Handle creates/updates with conflict resolution
4. **Error Handling** - Dead letter queue and retry mechanisms
5. **Monitoring** - Logging and health checks

### Integration Points:
- Titan Kafka cluster (CDC events)
- Supabase database (quota table)
- Monitoring/alerting system
- Dead letter queue for failed messages

## 📝 Detailed Implementation Plan

### 1. Edge Function Structure
```typescript
// supabase/functions/import-quota-from-titan/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { KafkaConsumer } from './kafka-client.ts'
import { QuotaTransformer } from './quota-transformer.ts'
import { ErrorHandler } from './error-handler.ts'

serve(async (req) => {
  try {
    // Webhook endpoint for Kafka events
    if (req.method === 'POST') {
      return await handleQuotaEvent(req)
    }
    
    // Health check endpoint
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response('Method not allowed', { status: 405 })
  } catch (error) {
    console.error('Function error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
```

### 2. Quota Data Transformation
```typescript
// quota-transformer.ts
export interface TitanQuotaEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  data: {
    quota_id: string
    counterparty_id: string
    direction: 'BUY' | 'SELL'
    period_month: string  // YYYY-MM-DD format
    qty_t: number
    tolerance_pct?: number
    incoterm_code?: string
    metal_code: string
    updated_at: string
  }
  metadata: {
    timestamp: string
    version: number
    source: string
  }
}

export interface CSLAQuota {
  quota_id: string
  counterparty_id: string
  direction: 'BUY' | 'SELL'
  period_month: string  // Convert to YYYY-MM-01 format
  qty_t: number
  tolerance_pct: number | null
  incoterm_code: string | null
  metal_code: string
  created_at: string
}

export class QuotaTransformer {
  static transform(titanEvent: TitanQuotaEvent): CSLAQuota {
    return {
      quota_id: titanEvent.data.quota_id,
      counterparty_id: titanEvent.data.counterparty_id,
      direction: titanEvent.data.direction,
      period_month: this.normalizeMonthDate(titanEvent.data.period_month),
      qty_t: titanEvent.data.qty_t,
      tolerance_pct: titanEvent.data.tolerance_pct || null,
      incoterm_code: titanEvent.data.incoterm_code || null,
      metal_code: titanEvent.data.metal_code,
      created_at: new Date().toISOString()
    }
  }
  
  private static normalizeMonthDate(dateStr: string): string {
    // Convert YYYY-MM-DD to YYYY-MM-01
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
  }
  
  static validate(quota: CSLAQuota): string[] {
    const errors: string[] = []
    
    if (!quota.quota_id || !quota.quota_id.match(/^[0-9a-f-]{36}$/i)) {
      errors.push('Invalid quota_id format')
    }
    
    if (!['BUY', 'SELL'].includes(quota.direction)) {
      errors.push('Direction must be BUY or SELL')
    }
    
    if (quota.qty_t <= 0) {
      errors.push('Quantity must be positive')
    }
    
    if (quota.tolerance_pct !== null && (quota.tolerance_pct < 0 || quota.tolerance_pct > 100)) {
      errors.push('Tolerance percentage must be between 0 and 100')
    }
    
    if (!quota.metal_code || quota.metal_code.length === 0) {
      errors.push('Metal code is required')
    }
    
    return errors
  }
}
```

### 3. Database Upsert Logic
```typescript
// quota-repository.ts
import { SupabaseClient } from '@supabase/supabase-js'

export class QuotaRepository {
  constructor(private supabase: SupabaseClient) {}
  
  async upsertQuota(quota: CSLAQuota): Promise<void> {
    const { error } = await this.supabase
      .from('quota')
      .upsert(quota, {
        onConflict: 'quota_id',
        ignoreDuplicates: false
      })
    
    if (error) {
      throw new Error(`Failed to upsert quota: ${error.message}`)
    }
  }
  
  async deleteQuota(quotaId: string): Promise<void> {
    // Check for dependencies before deletion
    const { data: callOffs, error: checkError } = await this.supabase
      .from('call_off')
      .select('call_off_id')
      .eq('quota_id', quotaId)
      .limit(1)
    
    if (checkError) {
      throw new Error(`Failed to check dependencies: ${checkError.message}`)
    }
    
    if (callOffs && callOffs.length > 0) {
      throw new Error(`Cannot delete quota ${quotaId}: has dependent call-offs`)
    }
    
    const { error } = await this.supabase
      .from('quota')
      .delete()
      .eq('quota_id', quotaId)
    
    if (error) {
      throw new Error(`Failed to delete quota: ${error.message}`)
    }
  }
  
  async getQuotaBalance(quotaId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('v_quota_balance')
      .select('*')
      .eq('quota_id', quotaId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new Error(`Failed to get quota balance: ${error.message}`)
    }
    
    return data
  }
}
```

### 4. Event Processing Logic
```typescript
// event-processor.ts
export class QuotaEventProcessor {
  constructor(
    private quotaRepo: QuotaRepository,
    private errorHandler: ErrorHandler
  ) {}
  
  async processEvent(event: TitanQuotaEvent): Promise<void> {
    try {
      // Transform the event
      const quota = QuotaTransformer.transform(event)
      
      // Validate the transformed data
      const validationErrors = QuotaTransformer.validate(quota)
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
      }
      
      // Process based on event type
      switch (event.eventType) {
        case 'INSERT':
        case 'UPDATE':
          await this.quotaRepo.upsertQuota(quota)
          console.log(`Successfully processed ${event.eventType} for quota ${quota.quota_id}`)
          break
          
        case 'DELETE':
          await this.quotaRepo.deleteQuota(quota.quota_id)
          console.log(`Successfully deleted quota ${quota.quota_id}`)
          break
          
        default:
          throw new Error(`Unknown event type: ${event.eventType}`)
      }
      
    } catch (error) {
      await this.errorHandler.handleError(error, event)
      throw error // Re-throw to trigger retry mechanisms
    }
  }
}
```

### 5. Error Handling and Monitoring
```typescript
// error-handler.ts
export class ErrorHandler {
  constructor(private supabase: SupabaseClient) {}
  
  async handleError(error: Error, event: TitanQuotaEvent): Promise<void> {
    // Log the error
    console.error('Quota processing error:', {
      error: error.message,
      quotaId: event.data.quota_id,
      eventType: event.eventType,
      timestamp: new Date().toISOString()
    })
    
    // Store in dead letter queue
    await this.storeInDeadLetterQueue(error, event)
    
    // Send alert for critical errors
    if (this.isCriticalError(error)) {
      await this.sendAlert(error, event)
    }
  }
  
  private async storeInDeadLetterQueue(error: Error, event: TitanQuotaEvent): Promise<void> {
    const { error: dlqError } = await this.supabase
      .from('quota_processing_errors')
      .insert({
        event_data: event,
        error_message: error.message,
        error_stack: error.stack,
        retry_count: 0,
        created_at: new Date().toISOString()
      })
    
    if (dlqError) {
      console.error('Failed to store in dead letter queue:', dlqError)
    }
  }
  
  private isCriticalError(error: Error): boolean {
    return error.message.includes('database') || 
           error.message.includes('connection') ||
           error.message.includes('timeout')
  }
  
  private async sendAlert(error: Error, event: TitanQuotaEvent): Promise<void> {
    // Implementation depends on alerting system (email, Slack, etc.)
    console.error('CRITICAL ERROR:', {
      error: error.message,
      event: event,
      timestamp: new Date().toISOString()
    })
  }
}
```

### 6. Dead Letter Queue Table
```sql
-- Add to migration files
CREATE TABLE quota_processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_data JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INT DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quota_errors_unresolved 
ON quota_processing_errors (created_at) 
WHERE resolved_at IS NULL;
```

## ✅ Acceptance Criteria

- [ ] Edge Function deployed and accessible
- [ ] Kafka event consumption working
- [ ] Data transformation from Titan to CSLA format correct
- [ ] Upsert logic handles both new and updated quotas
- [ ] Delete operations check for dependencies
- [ ] Validation prevents invalid data insertion
- [ ] Error handling captures and logs failures
- [ ] Dead letter queue stores failed events
- [ ] Health check endpoint responds correctly
- [ ] Performance: Processes events within 500ms
- [ ] Monitoring logs provide adequate debugging info

## 🔄 Dependencies

**Requires**:
- Tasks 005-007: Complete database schema
- Titan Kafka cluster access and credentials
- Supabase service role configuration

**Blocks**:
- Call-off creation (depends on quota data)
- Quota balance calculations
- Frontend quota displays

## 📁 Files to Create/Modify

```
supabase/
├── functions/
│   └── import-quota-from-titan/
│       ├── index.ts
│       ├── kafka-client.ts
│       ├── quota-transformer.ts
│       ├── quota-repository.ts
│       ├── event-processor.ts
│       └── error-handler.ts
database/
├── migrations/
│   └── 021_create_error_tracking.sql
└── docs/
    └── quota-integration.md
```

## 🚨 Risks & Considerations

1. **Kafka Connectivity**: Network issues could disrupt data flow
2. **Message Ordering**: Out-of-order events could cause data inconsistencies  
3. **Duplicate Processing**: Idempotency must be ensured
4. **Schema Evolution**: Titan schema changes could break transformation
5. **Performance**: High-volume events could overwhelm the function
6. **Error Recovery**: Failed events must be recoverable

## 🧪 Testing Strategy

1. **Unit Tests**: Transform and validation logic
2. **Integration Tests**: End-to-end event processing
3. **Error Tests**: Various failure scenarios
4. **Performance Tests**: High-volume event simulation
5. **Recovery Tests**: Dead letter queue processing

## 📋 Review Checklist

Before approval, verify:
- [ ] Kafka integration approach is correct
- [ ] Data transformation preserves all required fields
- [ ] Error handling covers all failure modes
- [ ] Performance requirements can be met
- [ ] Security considerations (authentication, authorization)
- [ ] Monitoring and alerting are adequate
- [ ] Recovery procedures are documented

---

**Next Task**: Task 009 - Build Edge Function calloff_crud.ts  
**Review Required**: Yes - Please approve before implementation