# Task #35 - Transport Order Basics

**Status:** Pending  
**Priority:** Medium  
**Estimated Time:** 6-7 days  
**Dependencies:** Task #33 (Shipment Line Management)  

## Overview

Implement basic transport order creation and management, linking transport orders to call-off shipment lines. This provides foundation for future Transporeon integration and milestone tracking.

## Business Requirements

### Transport Order Definition
- **Purpose:** Group shipment lines for transport planning and execution
- **Relationship:** Many shipment lines can be assigned to one transport order
- **Carrier Management:** Basic carrier information and booking references
- **Status Tracking:** Simple workflow from planning to delivery

### Key Attributes
- `transport_order_id`: Unique identifier
- `carrier_id`: Reference to carrier/transport provider
- `booking_reference`: Carrier's booking/job number
- `equipment_type`: Truck, container, etc.
- `gross_weight_kg`: Total weight including packaging
- `planned_pickup_date`: When transport should begin
- `planned_delivery_date`: When transport should complete
- `status`: NEW → BOOKED → IN_TRANSIT → DELIVERED → CANCELLED

## Technical Implementation

### Database Schema
```sql
-- Transport Order table
CREATE TABLE transport_order (
  transport_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(100),
  carrier_id UUID REFERENCES carrier(carrier_id),
  equipment_type transport_equipment DEFAULT 'TRUCK_25T',
  gross_weight_kg DECIMAL(10,2),
  planned_pickup_date DATE,
  planned_delivery_date DATE,
  status transport_order_status DEFAULT 'NEW',
  
  -- Additional fields
  pickup_location VARCHAR(200),
  delivery_location VARCHAR(200),
  notes TEXT,
  
  -- Business unit and user tracking
  business_unit_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carrier master data table
CREATE TABLE carrier (
  carrier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_name VARCHAR(200) NOT NULL,
  carrier_code VARCHAR(50) UNIQUE NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  is_transporeon_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment and status enums
CREATE TYPE transport_equipment AS ENUM (
  'TRUCK_25T', 'TRUCK_40T', 'CONTAINER_20FT', 'CONTAINER_40FT'
);

CREATE TYPE transport_order_status AS ENUM (
  'NEW', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
);

-- Update shipment line to reference transport order
ALTER TABLE call_off_shipment_line 
ADD COLUMN transport_order_id UUID REFERENCES transport_order(transport_order_id);

-- Indexes
CREATE INDEX idx_transport_order_status ON transport_order(status);
CREATE INDEX idx_transport_order_carrier ON transport_order(carrier_id);
CREATE INDEX idx_transport_order_planned_pickup ON transport_order(planned_pickup_date);
CREATE INDEX idx_shipment_line_transport_order ON call_off_shipment_line(transport_order_id);
```

### API Endpoints
```typescript
// Edge Function: transport-order-crud
POST /transport-orders                    // Create new transport order
GET /transport-orders                     // List transport orders
GET /transport-orders/{id}                // Get specific transport order
PATCH /transport-orders/{id}              // Update transport order
DELETE /transport-orders/{id}             // Cancel transport order

POST /transport-orders/{id}/assign-lines  // Assign shipment lines
POST /transport-orders/{id}/book          // Book with carrier (future)
POST /transport-orders/{id}/cancel        // Cancel booking

GET /carriers                             // List available carriers
```

### Core Services
```typescript
// services/transport-order-api.ts
export interface CreateTransportOrderRequest {
  carrier_id: string
  equipment_type: TransportEquipment
  planned_pickup_date: string
  planned_delivery_date: string
  pickup_location?: string
  delivery_location?: string
  notes?: string
  shipment_line_ids: string[]
}

export interface TransportOrder {
  transport_order_id: string
  booking_reference?: string
  carrier: Carrier
  equipment_type: TransportEquipment
  gross_weight_kg: number
  planned_pickup_date: string
  planned_delivery_date: string
  status: TransportOrderStatus
  shipment_lines: ShipmentLine[]
  // ... other fields
}
```

## React Components

### TransportOrderList.tsx
```typescript
interface TransportOrderListProps {
  status?: TransportOrderStatus
  carrierId?: string
  dateRange?: { from: Date; to: Date }
}

// Features:
// - Filterable/sortable table
// - Status chips and indicators
// - Quick actions (book, cancel, view)
// - Bulk operations
```

### CreateTransportOrderDialog.tsx
```typescript
interface CreateTransportOrderDialogProps {
  open: boolean
  onClose: () => void
  initialShipmentLines?: ShipmentLine[]
}

// Features:
// - Carrier selection
// - Equipment type selection
// - Date planning
// - Shipment line assignment
// - Weight calculation
```

### TransportOrderDetailView.tsx
```typescript
interface TransportOrderDetailViewProps {
  transportOrderId: string
}

// Features:
// - Complete transport order information
// - Assigned shipment lines
// - Status timeline (future)
// - Edit capabilities based on status
```

## User Interface Design

### Transport Order Dashboard
- **Active Orders:** Cards showing in-progress transport orders
- **Planning Queue:** Orders ready for carrier assignment
- **Status Filters:** Filter by status, carrier, date range
- **Quick Create:** Fast creation from selected shipment lines

### Create/Edit Form
- **Carrier Selection:** Dropdown with carrier master data
- **Equipment Planning:** Select appropriate equipment type
- **Date Planning:** Pickup and delivery date selection
- **Line Assignment:** Multi-select shipment lines
- **Weight Calculation:** Auto-calculate from assigned lines

### List View
- **Sortable Columns:** Reference, carrier, dates, status
- **Status Indicators:** Clear visual status progression
- **Action Buttons:** Context-sensitive actions
- **Batch Operations:** Select multiple for bulk actions

## Business Logic & Validation

### Transport Order Creation Rules
- Must have at least one assigned shipment line
- Pickup date cannot be in the past
- Delivery date must be after pickup date
- Total weight must not exceed equipment capacity
- All shipment lines must belong to same business unit

### Status Transition Rules
```
NEW → BOOKED:         Requires carrier assignment and booking reference
BOOKED → IN_TRANSIT:  Can be automatic or manual trigger
IN_TRANSIT → DELIVERED: Requires milestone completion (future)
NEW/BOOKED → CANCELLED: Manual cancellation with reason
```

### Weight Calculations
- Gross weight = sum of (shipment line bundle_qty * 1000kg) + packaging
- Equipment capacity validation
- Overweight warnings and restrictions

## Integration Points

### Shipment Line Integration
- Assign/unassign shipment lines to transport orders
- Update shipment line status when transport status changes
- Prevent deletion of assigned shipment lines

### Future Integrations
- **Transporeon:** Booking API and milestone webhooks
- **Carrier Systems:** Direct booking and tracking
- **WMS Integration:** Pickup confirmation and documentation

## Acceptance Criteria

### ✅ Core Functionality
- [ ] Create transport orders with basic information
- [ ] Assign/unassign shipment lines to transport orders
- [ ] Update transport order status and details
- [ ] List and filter transport orders
- [ ] View detailed transport order information

### ✅ Business Rules
- [ ] Weight validation against equipment capacity
- [ ] Date validation (pickup < delivery, no past dates)
- [ ] Status transition validation
- [ ] Business unit isolation (RLS)

### ✅ User Experience
- [ ] Intuitive creation and editing forms
- [ ] Clear status indicators and progression
- [ ] Efficient shipment line assignment
- [ ] Responsive design for mobile use

### ✅ Data Integrity
- [ ] Proper foreign key relationships
- [ ] Audit trail for status changes
- [ ] Data validation at API level
- [ ] Concurrent access handling

## Files to Create

### Database Migration
1. `supabase/migrations/032_create_transport_order.sql`

### Backend
1. `supabase/functions/transport-order-crud/index.ts`
2. `supabase/functions/transport-order-crud/transport-service.ts`
3. `supabase/functions/transport-order-crud/carrier-service.ts`

### Frontend Components
1. `src/components/TransportOrder/TransportOrderList.tsx`
2. `src/components/TransportOrder/CreateTransportOrderDialog.tsx`
3. `src/components/TransportOrder/TransportOrderDetailView.tsx`
4. `src/components/TransportOrder/TransportOrderCard.tsx`
5. `src/pages/TransportOrders.tsx`

### Types & Services
1. `src/types/transport-order.ts`
2. `src/services/transport-order-api.ts`
3. `src/services/carrier-api.ts`

### Modified Files
1. `src/App.tsx` (routing)
2. `src/components/layout/MuiSidebar.tsx` (navigation)
3. `src/components/CallOff/CallOffDetailView.tsx` (show transport assignments)

## Future Enhancements

### Advanced Features
- **Route Optimization:** Calculate optimal pickup/delivery sequence
- **Cost Management:** Rate calculations and carrier comparison
- **Document Management:** BOL, POD, and other transport documents
- **Real-time Tracking:** GPS tracking and milestone updates

### Integration Capabilities
- **Transporeon API:** Full booking and tracking integration
- **EDI Integration:** For direct carrier communication
- **Mobile Apps:** Driver apps for milestone updates
- **Analytics:** Transport performance and cost analysis

## Performance Considerations

- Efficient querying with proper indexes
- Pagination for large transport order lists
- Optimistic updates for better UX
- Real-time updates for status changes

---

**Previous Task:** #34 - Email Integration Foundation  
**Next Task:** #36 - Inventory Lot Foundation