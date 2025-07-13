# Task #36 - Inventory Lot Foundation

**Status:** Pending  
**Priority:** Medium  
**Estimated Time:** 7-8 days  
**Dependencies:** Task #35 (Transport Order Basics)  

## Overview

Implement basic inventory lot and bundle management with the 25:1 relationship (25-tonne lots containing 25 × 1-tonne bundles). This provides foundation for tracking physical inventory from supplier receipt to customer delivery.

## Business Requirements

### Inventory Hierarchy
- **Lots:** 25-tonne units from suppliers (indivisible for accounting)
- **Bundles:** 1-tonne units for customer delivery (25 bundles per lot)
- **Traceability:** Full chain of custody from supplier to customer
- **Status Tracking:** Detailed status through warehouse operations

### Key Business Rules
- **25:1 Ratio:** Every lot contains exactly 25 bundles (fixed)
- **No Partial Lots:** Lots cannot be split across different shipments
- **Bundle Independence:** Individual bundle status tracking
- **Weight Tolerance:** ±0.5% variance allowed at weigh-bridge
- **Certificate Linking:** Chemistry certificates at lot level

## Technical Implementation

### Database Schema
```sql
-- Inventory Lot table
CREATE TABLE inventory_lot (
  lot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_lot_id VARCHAR(100) NOT NULL, -- Supplier's reference
  supplier_id UUID REFERENCES supplier(supplier_id),
  metal_code VARCHAR(20) NOT NULL,
  purity_pct DECIMAL(5,3) NOT NULL, -- e.g., 99.97%
  nominal_weight_kg DECIMAL(10,2) DEFAULT 25000, -- Nominal 25t
  actual_weight_kg DECIMAL(10,2), -- Actual weighed amount
  
  -- Certificates and documentation
  certificate_url VARCHAR(500),
  certificate_date DATE,
  
  -- Location and status
  warehouse_id UUID REFERENCES warehouse(warehouse_id),
  location_code VARCHAR(50), -- Bin/rack location
  status lot_status DEFAULT 'INBOUND',
  
  -- Purchase order link
  purchase_order_id UUID REFERENCES purchase_order(purchase_order_id),
  purchase_order_line_id UUID,
  
  -- Business unit and audit
  business_unit_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  received_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Bundle table (25 per lot)
CREATE TABLE inventory_bundle (
  bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES inventory_lot(lot_id) ON DELETE CASCADE,
  bundle_sequence INTEGER NOT NULL, -- 1-25 within lot
  barcode VARCHAR(100) UNIQUE NOT NULL,
  
  -- Weight tracking
  nominal_weight_kg DECIMAL(8,2) DEFAULT 1000, -- Nominal 1t
  actual_weight_kg DECIMAL(8,2), -- Actual weighed amount
  weight_variance_pct DECIMAL(5,2), -- Calculated variance
  
  -- Location and status
  warehouse_id UUID REFERENCES warehouse(warehouse_id),
  bin_location VARCHAR(50),
  status bundle_status DEFAULT 'RECEIPTED',
  
  -- Allocation tracking
  allocated_to_so_line_id UUID, -- Sales order line allocation
  reserved_at TIMESTAMP WITH TIME ZONE,
  
  -- Shipping tracking
  call_off_shipment_line_id UUID REFERENCES call_off_shipment_line(shipment_line_id),
  transport_order_id UUID REFERENCES transport_order(transport_order_id),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT uq_lot_bundle_sequence UNIQUE(lot_id, bundle_sequence),
  CONSTRAINT chk_bundle_sequence CHECK (bundle_sequence BETWEEN 1 AND 25),
  CONSTRAINT chk_weight_variance CHECK (weight_variance_pct BETWEEN -0.5 AND 0.5)
);

-- Supporting tables
CREATE TABLE warehouse (
  warehouse_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code VARCHAR(20) UNIQUE NOT NULL,
  warehouse_name VARCHAR(100) NOT NULL,
  address TEXT,
  is_3pl BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE supplier (
  supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

-- Status enums
CREATE TYPE lot_status AS ENUM (
  'INBOUND',     -- ASN received, lot created
  'ON_HAND',     -- Physically received and verified
  'ALLOCATED',   -- Reserved for customer orders
  'SHIPPED',     -- All bundles shipped
  'CLOSED'       -- Lot accounting closed
);

CREATE TYPE bundle_status AS ENUM (
  'RECEIPTED',   -- Created from ASN
  'ON_HAND',     -- Physically verified
  'RESERVED',    -- Allocated to sales order
  'PICKED',      -- Selected for shipment
  'SHIPPED',     -- Left warehouse
  'DELIVERED'    -- Confirmed at customer
);

-- Indexes for performance
CREATE INDEX idx_lot_supplier ON inventory_lot(supplier_id);
CREATE INDEX idx_lot_metal_status ON inventory_lot(metal_code, status);
CREATE INDEX idx_lot_warehouse ON inventory_lot(warehouse_id);
CREATE INDEX idx_bundle_lot ON inventory_bundle(lot_id);
CREATE INDEX idx_bundle_status ON inventory_bundle(status);
CREATE INDEX idx_bundle_barcode ON inventory_bundle(barcode);
CREATE INDEX idx_bundle_allocation ON inventory_bundle(allocated_to_so_line_id);
```

### API Endpoints
```typescript
// Edge Function: inventory-crud
GET /lots                           // List lots with filtering
POST /lots                          // Create lot (from ASN)
GET /lots/{id}                      // Get lot with bundles
PATCH /lots/{id}                    // Update lot details
POST /lots/{id}/generate-bundles    // Create 25 bundles for lot

GET /bundles                        // List bundles with filtering
GET /bundles/{id}                   // Get bundle details
PATCH /bundles/{id}                 // Update bundle (weight, location)
POST /bundles/{id}/adjust-weight    // Record weight adjustment

GET /warehouses                     // List warehouses
GET /suppliers                      // List suppliers
```

### Core Services
```typescript
// services/inventory-api.ts
export interface CreateLotRequest {
  supplier_lot_id: string
  supplier_id: string
  metal_code: string
  purity_pct: number
  nominal_weight_kg?: number
  warehouse_id: string
  purchase_order_id?: string
  certificate_url?: string
}

export interface InventoryLot {
  lot_id: string
  supplier_lot_id: string
  supplier: Supplier
  metal_code: string
  purity_pct: number
  actual_weight_kg?: number
  status: LotStatus
  bundles: InventoryBundle[]
  certificate_url?: string
  // ... other fields
}

export interface WeightAdjustmentRequest {
  bundle_id: string
  actual_weight_kg: number
  reason_code: string
  notes?: string
}
```

## React Components

### LotBundleExplorer.tsx
```typescript
interface LotBundleExplorerProps {
  warehouseId?: string
  metalCode?: string
  status?: LotStatus | BundleStatus
}

// Features:
// - Hierarchical view: Lots → Bundles
// - Expandable lot cards showing 25 bundles
// - Status filtering and search
// - Bulk operations on bundles
```

### CreateLotDialog.tsx
```typescript
interface CreateLotDialogProps {
  open: boolean
  onClose: () => void
  asnData?: ASNData // From supplier advance shipment notice
}

// Features:
// - Supplier and metal selection
// - Weight and purity input
// - Certificate upload
// - Auto-generate 25 bundles
```

### WeightAdjustmentDialog.tsx
```typescript
interface WeightAdjustmentDialogProps {
  bundleId: string
  currentWeight: number
  open: boolean
  onClose: () => void
}

// Features:
// - Current vs new weight display
// - Variance calculation and validation
// - Reason code selection
// - Approval workflow for large variances
```

### BundleStatusTracker.tsx
```typescript
interface BundleStatusTrackerProps {
  bundleId: string
  showHistory?: boolean
}

// Features:
// - Visual status progression
// - Timestamp tracking
// - Location history
// - Event audit trail
```

## User Interface Design

### Lot Management Dashboard
- **Lot Cards:** Visual representation of 25t lots
- **Bundle Grid:** Expandable view of 25 bundles per lot
- **Status Indicators:** Clear visual status progression
- **Quick Filters:** By warehouse, supplier, metal, status

### Bundle Detail View
- **Weight Information:** Nominal vs actual with variance
- **Status Timeline:** Visual progression through workflow
- **Location Tracking:** Current and historical locations
- **Allocation Status:** Reserved/shipped/delivered information

### Weight Adjustment Interface
- **Variance Calculator:** Real-time calculation of weight variance
- **Tolerance Warnings:** Visual indicators for variance limits
- **Approval Workflow:** Escalation for out-of-tolerance adjustments
- **Audit Trail:** Complete history of weight changes

## Business Logic & Validation

### Lot Creation Rules
- Must specify supplier and metal code
- Purity percentage must be realistic (95-99.99%)
- Automatic generation of 25 bundles with sequential barcodes
- Weight validation against supplier specifications

### Bundle Weight Management
- Variance tolerance of ±0.5% from nominal 1000kg
- Automatic approval for variances within tolerance
- Manual approval required for larger variances
- Complete audit trail for all weight adjustments

### Status Transition Rules
```
Lot Status Flow:
INBOUND → ON_HAND → ALLOCATED → SHIPPED → CLOSED

Bundle Status Flow:
RECEIPTED → ON_HAND → RESERVED → PICKED → SHIPPED → DELIVERED
```

### Allocation Logic
- Bundles can only be allocated if lot is ON_HAND or ALLOCATED
- FIFO allocation by default (oldest lots first)
- Metal code and purity matching for sales orders
- Prevent allocation of shipped or delivered bundles

## Integration Points

### Call-Off Integration
- Link bundles to call-off shipment lines
- Update bundle status when shipments are created
- Track bundle delivery against call-off requirements

### Transport Order Integration
- Assign bundles to transport orders
- Calculate total weight for transport planning
- Update status during transport execution

### Future ASN Integration
- Automatic lot creation from supplier notifications
- EDI 856 processing for bulk lot creation
- Supplier portal for self-service ASN submission

## Acceptance Criteria

### ✅ Core Functionality
- [ ] Create lots with automatic bundle generation (25 per lot)
- [ ] Update lot and bundle status through workflow
- [ ] Record and validate weight adjustments
- [ ] Track bundle allocation and shipping
- [ ] View hierarchical lot/bundle relationships

### ✅ Business Rules
- [ ] Enforce 25:1 lot-to-bundle ratio
- [ ] Validate weight variance within tolerance
- [ ] Prevent invalid status transitions
- [ ] Maintain complete audit trail

### ✅ User Experience
- [ ] Intuitive hierarchical view of inventory
- [ ] Efficient weight adjustment workflow
- [ ] Clear status indicators and progression
- [ ] Mobile-responsive for warehouse use

### ✅ Data Integrity
- [ ] Proper foreign key relationships
- [ ] Cascade deletion of bundles when lot deleted
- [ ] Concurrent access handling
- [ ] Data validation at all levels

## Files to Create

### Database Migration
1. `supabase/migrations/033_create_inventory_tables.sql`

### Backend
1. `supabase/functions/inventory-crud/index.ts`
2. `supabase/functions/inventory-crud/lot-service.ts`
3. `supabase/functions/inventory-crud/bundle-service.ts`
4. `supabase/functions/inventory-crud/weight-service.ts`

### Frontend Components
1. `src/components/Inventory/LotBundleExplorer.tsx`
2. `src/components/Inventory/CreateLotDialog.tsx`
3. `src/components/Inventory/LotCard.tsx`
4. `src/components/Inventory/BundleGrid.tsx`
5. `src/components/Inventory/WeightAdjustmentDialog.tsx`
6. `src/components/Inventory/BundleStatusTracker.tsx`
7. `src/pages/Inventory.tsx`

### Types & Services
1. `src/types/inventory.ts`
2. `src/services/inventory-api.ts`
3. `src/services/weight-adjustment-api.ts`

### Modified Files
1. `src/App.tsx` (routing)
2. `src/components/layout/MuiSidebar.tsx` (navigation)
3. `src/types/calloff.ts` (add inventory references)

## Performance & Scaling Considerations

### Database Optimization
- Proper indexing for common query patterns
- Partitioning by date for historical data
- Efficient joins between lots and bundles

### UI Performance
- Virtual scrolling for large bundle lists
- Lazy loading of bundle details
- Optimistic updates for better UX

### Business Scaling
- Support for multiple warehouses
- Bulk operations for large shipments
- Integration with 3PL WMS systems

## Future Enhancements

### Advanced Features
- **Mobile Scanning:** Barcode scanning for warehouse operations
- **Analytics:** Inventory turnover and aging reports
- **Alerts:** Low stock and expiry notifications
- **Integration:** 3PL WMS and ERP system connections

### Compliance & Traceability
- **Chain of Custody:** Complete audit trail from supplier to customer
- **Certificate Management:** Digital certificate storage and verification
- **Regulatory Reporting:** Compliance with industry standards
- **Quality Control:** Test results and quality metrics tracking

---

**Previous Task:** #35 - Transport Order Basics  
**Next Task:** #37 - Performance Optimization