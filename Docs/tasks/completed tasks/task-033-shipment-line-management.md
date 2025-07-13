# Task #33 - Shipment Line Management

**Status:** ✅ COMPLETED  
**Priority:** High  
**Estimated Time:** 4-5 days  
**Dependencies:** Task #32 (Enhanced UX)  

## Overview

Implement shipment line creation and management within call-offs. Each call-off can have multiple shipment lines representing different delivery requirements or bundle allocations.

## Business Requirements

### Shipment Line Definition
- **Purpose:** Break down call-offs into deliverable chunks
- **Relationship:** Many shipment lines per call-off
- **Bundle Tracking:** Each line specifies bundle quantity and requirements
- **Delivery Planning:** Lines can have different delivery dates/locations

### Key Attributes
- `bundle_qty`: Number of 1-tonne bundles in this shipment
- `requested_delivery_date`: When this shipment should arrive
- `delivery_location`: Warehouse or customer location
- `weight_tonnes`: Calculated from bundle_qty (bundle_qty * 1.0)
- `status`: PLANNED → READY → PICKED → SHIPPED → DELIVERED
- `notes`: Additional delivery instructions

## Technical Implementation

### Database Schema Updates
```sql
-- Add shipment line fields to existing call_off_shipment_line table
ALTER TABLE call_off_shipment_line ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(100);
ALTER TABLE call_off_shipment_line ADD COLUMN IF NOT EXISTS requested_delivery_date DATE;
ALTER TABLE call_off_shipment_line ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE call_off_shipment_line ADD COLUMN IF NOT EXISTS status shipment_line_status DEFAULT 'PLANNED';

-- Create status enum if not exists
CREATE TYPE shipment_line_status AS ENUM ('PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED');
```

### API Endpoints (Edge Function Updates)
```typescript
// Add to calloff-crud/index.ts
POST /call-offs/{id}/shipment-lines
PATCH /call-offs/{id}/shipment-lines/{line_id}
DELETE /call-offs/{id}/shipment-lines/{line_id}
GET /call-offs/{id}/shipment-lines
```

### React Components

#### CreateShipmentLineDialog.tsx
```typescript
interface CreateShipmentLineDialogProps {
  open: boolean
  callOffId: string
  maxBundles: number // Remaining quota capacity
  onClose: () => void
  onSuccess: () => void
}

interface ShipmentLineFormData {
  bundle_qty: number
  requested_delivery_date?: string
  delivery_location?: string
  notes?: string
}
```

#### ShipmentLineList.tsx
```typescript
interface ShipmentLineListProps {
  callOffId: string
  readonly?: boolean
}

// Features:
// - Editable list of shipment lines
// - Add/Edit/Delete functionality
// - Status chips and progress indicators
// - Total bundle quantity validation
```

## UI/UX Design

### Call-Off Detail View Integration
- **Shipment Lines Section:** Dedicated section in call-off detail view
- **Add Line Button:** Primary action to create new shipment lines
- **Inline Editing:** Quick edit functionality for basic fields
- **Status Indicators:** Clear visual status for each line

### Form Design
- **Bundle Quantity:** Number input with validation against remaining quota
- **Delivery Date:** Date picker with business day validation
- **Location:** Dropdown of available warehouses/locations
- **Notes:** Text area for special instructions

### Validation Rules
- Total bundle quantity across all lines cannot exceed call-off total
- Delivery dates must be realistic (not in the past, business days)
- At least one shipment line required for call-off confirmation
- Location must be valid delivery point

## Acceptance Criteria

### ✅ Core Functionality
- [x] Users can create shipment lines for any call-off
- [x] Edit existing shipment lines (when status allows)
- [x] Delete shipment lines with confirmation
- [x] View list of all shipment lines for a call-off

### ✅ Business Rules
- [x] Total bundle quantity validation against call-off total
- [x] Status transitions follow state machine rules
- [x] Delivery date validation (no past dates)
- [x] Location validation against master data

### ✅ User Experience
- [x] Intuitive add/edit dialog interface
- [x] Clear status indicators and progress tracking
- [x] Responsive design for mobile and desktop
- [x] Error handling and confirmation dialogs

### ✅ Integration
- [x] Shipment lines appear in call-off detail view
- [x] Real-time updates when lines are modified
- [x] Proper permissions based on user role
- [x] Data persistence and retrieval

## Database Migration

```sql
-- Migration: Add shipment line enhancements
-- File: supabase/migrations/030_enhance_shipment_lines.sql

-- Create status enum
CREATE TYPE IF NOT EXISTS shipment_line_status AS ENUM (
  'PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED'
);

-- Add new columns to existing table
ALTER TABLE call_off_shipment_line 
ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS status shipment_line_status DEFAULT 'PLANNED';

-- Add constraints
ALTER TABLE call_off_shipment_line 
ADD CONSTRAINT chk_positive_bundle_qty CHECK (bundle_qty > 0);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_shipment_line_call_off_status 
ON call_off_shipment_line(call_off_id, status);
```

## Files to Create/Modify

### New Files
1. `src/components/CallOff/CreateShipmentLineDialog.tsx`
2. `src/components/CallOff/ShipmentLineList.tsx`
3. `src/components/CallOff/ShipmentLineItem.tsx`
4. `src/types/shipment-line.ts`
5. `src/services/shipment-line-api.ts`

### Modified Files
1. `src/components/CallOff/CallOffDetailView.tsx`
2. `src/pages/MuiCallOffs.tsx`
3. `src/types/calloff.ts` (extend interfaces)
4. `supabase/functions/calloff-crud/index.ts`

### Database Files
1. `supabase/migrations/030_enhance_shipment_lines.sql`

## Testing Strategy

### Unit Tests
- Form validation logic
- Business rule enforcement
- Component rendering and interactions

### Integration Tests
- API endpoint functionality
- Database constraint validation
- Real-time updates

### E2E Tests (Cypress)
- Complete shipment line workflow
- Error scenarios and edge cases
- Multi-user concurrent editing

## Performance Considerations

- Efficient queries for shipment line lists
- Optimistic updates for better UX
- Pagination for call-offs with many lines
- Real-time subscription management

---

**Previous Task:** #32 - Enhanced UX & Error Handling  
**Next Task:** #34 - Email Integration Foundation