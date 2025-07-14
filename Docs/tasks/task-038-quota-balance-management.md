# Task #38 - Quota Balance Management

**Status:** Pending  
**Priority:** Medium  
**Estimated Time:** 2-3 days  
**Dependencies:** Task #14 (E2E Testing), Task #32 (Enhanced UX)  

## Overview

Implement quota balance visibility and management to show users how much quota capacity has been consumed and what remains available. This is critical business functionality that's currently missing from the frontend.

## Business Requirements

### Current Problem
- Users cannot see remaining quota capacity when creating call-offs
- No visibility into how much of a quota has been consumed
- Risk of over-allocating quotas without warnings
- No quota utilization reporting or analytics

### Required Features
- **Real-time Balance Display:** Show remaining capacity during call-off creation
- **Quota Utilization View:** Visual indicators of quota consumption
- **Allocation Warnings:** Prevent or warn about over-allocation
- **Balance History:** Track how quota has been consumed over time

## Technical Implementation

### Backend Enhancements
```sql
-- Add computed balance view
CREATE OR REPLACE VIEW quota_balance AS
SELECT 
  q.quota_id,
  q.qty_t as total_quantity,
  COALESCE(SUM(co.bundle_qty), 0) as allocated_bundles,
  q.qty_t - COALESCE(SUM(co.bundle_qty), 0) as remaining_bundles,
  ROUND((COALESCE(SUM(co.bundle_qty), 0) * 100.0 / q.qty_t), 2) as utilization_pct
FROM quota q
LEFT JOIN call_off co ON q.quota_id = co.quota_id 
  AND co.status NOT IN ('CANCELLED')
GROUP BY q.quota_id, q.qty_t;

-- Add quota balance API endpoint
-- GET /quotas/{id}/balance
-- GET /quotas/{id}/allocations (history of call-offs)
```

### API Enhancements
```typescript
// services/quota-api.ts
export interface QuotaBalance {
  quota_id: string
  total_quantity: number
  allocated_bundles: number
  remaining_bundles: number
  utilization_pct: number
  recent_allocations: CallOffSummary[]
}

export interface CallOffSummary {
  call_off_id: string
  bundle_qty: number
  status: CallOffStatus
  created_at: string
  counterparty_name: string
}

export async function fetchQuotaBalance(quotaId: string): Promise<QuotaBalance>
export async function fetchQuotaAllocations(quotaId: string): Promise<CallOffSummary[]>
```

### React Components

#### QuotaBalanceCard.tsx
```typescript
interface QuotaBalanceCardProps {
  quotaId: string
  showDetails?: boolean
}

// Features:
// - Visual progress bar showing utilization
// - Remaining capacity prominently displayed
// - Warning indicators for high utilization
// - Click to expand allocation history
```

#### QuotaSelector.tsx (Enhanced)
```typescript
interface QuotaSelectorProps {
  counterpartyId: string
  selectedQuotaId?: string
  requestedBundles: number
  onSelect: (quota: Quota) => void
}

// Enhanced features:
// - Show remaining balance for each quota option
// - Highlight quotas with insufficient capacity
// - Sort by remaining capacity or utilization
// - Visual indicators for quota health
```

#### QuotaUtilizationDashboard.tsx
```typescript
interface QuotaUtilizationDashboardProps {
  counterpartyId?: string
  timeRange?: { from: Date; to: Date }
}

// Features:
// - Grid view of all quotas with balance info
// - Filtering by counterparty, metal, utilization level
// - Export functionality for reporting
// - Drill-down to allocation details
```

## User Interface Design

### Call-Off Creation Enhancement
```
┌─ Step 2: Choose Quota ─────────────────────────┐
│                                                │
│ ▼ Available Quotas for Acme Corp              │
│                                                │
│ ┌─ Copper 99.99% - Jan 2025 ──────────────────┐│
│ │ 📊 ████████░░ 80% utilized                  ││
│ │ 🔢 50/250 bundles remaining                 ││
│ │ ⚠️  Your request: 75 bundles                 ││
│ │ ❌ Exceeds remaining capacity!              ││
│ └─────────────────────────────────────────────┘│
│                                                │
│ ┌─ Copper 99.97% - Jan 2025 ──────────────────┐│
│ │ 📊 ███░░░░░░ 30% utilized                   ││
│ │ 🔢 175/250 bundles remaining                ││
│ │ ✅ Your request: 25 bundles                 ││
│ │ 📈 After allocation: 55% utilized          ││
│ └─────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### Quota Dashboard
```
┌─ Quota Utilization Dashboard ─────────────────┐
│ Filter: [All Counterparties▼] [All Metals▼]   │
│                                                │
│ ┌─ High Utilization (>80%) ──────────────────┐ │
│ │ 🔴 Acme Corp - Copper Jan: 95% (12 left)  │ │
│ │ 🟠 Beta Ltd - Silver Feb: 85% (37 left)   │ │
│ └──────────────────────────────────────────────┘ │
│                                                │
│ ┌─ Medium Utilization (50-80%) ──────────────┐ │
│ │ 🟡 Gamma Inc - Gold Mar: 65% (87 left)    │ │
│ │ 🟡 Delta Co - Platinum Apr: 72% (28 left) │ │
│ └──────────────────────────────────────────────┘ │
│                                                │
│ ┌─ Low Utilization (<50%) ────────────────────┐ │
│ │ 🟢 Echo Corp - Copper Feb: 25% (187 left) │ │
│ │ 🟢 Foxtrot Ltd - Silver Mar: 15% (212 left)│ │
│ └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## Business Logic & Validation

### Balance Calculation Rules
- Include all non-cancelled call-offs in utilization
- Real-time calculation during call-off creation
- Handle concurrent access with optimistic locking
- Account for pending call-offs (NEW, CONFIRMED)

### Allocation Warnings
```typescript
enum AllocationWarning {
  NONE = 'none',              // < 80% utilization
  HIGH_UTILIZATION = 'high',   // 80-95% utilization  
  NEAR_LIMIT = 'near',        // 95-100% utilization
  EXCEEDS_QUOTA = 'exceeds'   // > 100% utilization
}
```

### User Permissions
- All users can view quota balances
- Only authorized users can override quota limits
- Audit trail for quota overrides
- Business unit isolation (RLS)

## Integration Points

### Call-Off Creation Workflow
- Enhanced quota selection with balance display
- Real-time validation against available capacity
- Warning dialogs for high utilization
- Option to proceed with manager approval

### Existing Quota Management
- Add balance column to quota list views
- Color-coded status indicators
- Filter quotas by utilization level
- Export quota utilization reports

### Future Analytics Integration
- Quota utilization trending
- Forecast capacity requirements
- Alert system for low quota levels
- Integration with procurement planning

## Acceptance Criteria

### ✅ Core Functionality
- [ ] Display real-time quota balance during call-off creation
- [ ] Show quota utilization in quota list views
- [ ] Validate call-off requests against available capacity
- [ ] Provide allocation history for each quota

### ✅ Business Rules
- [ ] Accurate balance calculations excluding cancelled call-offs
- [ ] Warning system for high utilization quotas
- [ ] Prevention of over-allocation (configurable)
- [ ] Audit trail for quota balance changes

### ✅ User Experience
- [ ] Clear visual indicators for quota health
- [ ] Intuitive progress bars and utilization displays
- [ ] Helpful error messages for capacity issues
- [ ] Mobile-responsive balance displays

### ✅ Performance
- [ ] Fast balance calculations (<500ms)
- [ ] Efficient database queries with proper indexing
- [ ] Cached balance data where appropriate
- [ ] Real-time updates when call-offs change

## Files to Create/Modify

### New Components
1. `src/components/Quota/QuotaBalanceCard.tsx`
2. `src/components/Quota/QuotaUtilizationDashboard.tsx`
3. `src/components/Quota/QuotaBalanceIndicator.tsx`
4. `src/components/CallOff/QuotaCapacityWarning.tsx`

### Enhanced Components
1. `src/components/CallOff/CreateCallOffWizard.tsx` (add balance checking)
2. `src/pages/MuiQuotas.tsx` (add balance column)
3. `src/components/CallOff/QuotaSelector.tsx` (show remaining capacity)

### New Services
1. `src/services/quota-balance-api.ts`
2. `src/hooks/useQuotaBalance.ts`

### Database
1. `supabase/migrations/034_quota_balance_view.sql`
2. Update `supabase/functions/calloff-crud/index.ts` (add balance validation)

## Future Enhancements

### Advanced Features
- **Quota Forecasting:** Predict when quotas will be fully utilized
- **Auto-allocation:** Suggest optimal quota selection based on capacity
- **Threshold Alerts:** Email notifications for low quota levels
- **Capacity Planning:** Integration with procurement planning systems

### Reporting & Analytics
- **Utilization Reports:** Historical quota usage analysis
- **Counterparty Analysis:** Usage patterns by trading partner
- **Metal-specific Trends:** Utilization by product type
- **Executive Dashboard:** High-level quota health overview

## Testing Strategy

### Unit Tests
- Balance calculation accuracy
- Warning threshold logic
- Component rendering with various utilization levels

### Integration Tests
- Real-time balance updates
- Concurrent call-off creation scenarios
- Database view performance

### E2E Tests (Addition to Task #14)
- Create call-off with sufficient quota capacity
- Attempt to exceed quota limits
- View quota utilization dashboard

---

**Previous Task:** #37 - Performance Optimization  
**Dependencies:** #14 (E2E Testing), #32 (Enhanced UX)  
**Enables:** Better call-off workflow, quota management, business intelligence