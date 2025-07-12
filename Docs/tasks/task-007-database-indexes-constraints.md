# Task 007: Database Schema Setup - Create Indexes and Constraints

**Status**: 🔴 Pending Approval  
**Priority**: High  
**Estimated Effort**: 1-2 hours  
**Prerequisites**: Tasks 005-006 (Schema + RLS) completed

## 📋 Objective

Create optimized database indexes and additional constraints to ensure query performance, data integrity, and support for the application's access patterns as specified in the data model documentation.

## 🎯 Scope

### Performance Indexes:
1. **`idx_calloff_quota_status`** - Fast listing by quota & state
2. **`idx_line_to`** - Resolve Transport Order aggregates  
3. **`idx_bundle_wh_status`** - ATP (Available-to-Promise) lookups
4. **Additional composite indexes** for common query patterns

### Data Integrity Constraints:
- Custom check constraints for business rules
- Unique constraints for business identifiers
- Trigger-based validations for complex rules
- Performance monitoring setup

## 📝 Detailed Implementation Plan

### 1. Core Performance Indexes

#### Call-Off Domain Indexes
```sql
-- Fast filtering by quota and status (primary use case)
CREATE INDEX idx_calloff_quota_status 
ON call_off (quota_id, status);

-- Call-off number lookups (human-readable IDs)
CREATE UNIQUE INDEX idx_calloff_number 
ON call_off (call_off_number);

-- Created by user for audit queries
CREATE INDEX idx_calloff_created_by 
ON call_off (created_by, created_at DESC);

-- Date range queries for reporting
CREATE INDEX idx_calloff_delivery_date 
ON call_off (requested_delivery_date) 
WHERE requested_delivery_date IS NOT NULL;
```

#### Shipment Line Indexes
```sql
-- Transport Order aggregation queries
CREATE INDEX idx_line_to 
ON call_off_shipment_line (transport_order_id) 
WHERE transport_order_id IS NOT NULL;

-- Call-off to shipment line lookups
CREATE INDEX idx_line_calloff 
ON call_off_shipment_line (call_off_id);

-- Expected ship date planning queries
CREATE INDEX idx_line_ship_date 
ON call_off_shipment_line (expected_ship_date, metal_code);
```

#### Quota Indexes
```sql
-- Counterparty and period lookups (common filter pattern)
CREATE INDEX idx_quota_counterparty_period 
ON quota (counterparty_id, period_month, direction);

-- Metal code filtering
CREATE INDEX idx_quota_metal 
ON quota (metal_code, period_month);

-- Remaining balance calculations
CREATE INDEX idx_quota_active 
ON quota (quota_id, period_month) 
WHERE period_month >= CURRENT_DATE - INTERVAL '12 months';
```

### 2. Inventory Performance Indexes

#### Lot Tracking Indexes
```sql
-- Supplier and metal lookups
CREATE INDEX idx_lot_supplier_metal 
ON inventory_lot (supplier_id, metal_code, status);

-- Manufacturing date for FIFO/aging queries
CREATE INDEX idx_lot_manufactured 
ON inventory_lot (manufactured_on, metal_code);

-- Certificate lookup optimization
CREATE INDEX idx_lot_certificate 
ON inventory_lot (certificate_url) 
WHERE certificate_url IS NOT NULL;
```

#### Bundle ATP Indexes
```sql
-- Available-to-Promise lookups (critical performance)
CREATE INDEX idx_bundle_wh_status 
ON inventory_bundle (warehouse_id, status, lot_id);

-- Location-based queries for picking
CREATE INDEX idx_bundle_location 
ON inventory_bundle (warehouse_id, bin_location, status) 
WHERE status IN ('ON_HAND', 'RESERVED');

-- Weight variance monitoring
CREATE INDEX idx_bundle_weight 
ON inventory_bundle (weight_kg) 
WHERE ABS(weight_kg - 1000) > 5; -- Flag significant variances
```

### 3. Business Logic Constraints

#### Call-Off Business Rules
```sql
-- Call-off number pattern validation
ALTER TABLE call_off ADD CONSTRAINT chk_calloff_number_pattern
CHECK (call_off_number ~ '^CO-[0-9]{4}-[0-9]{4}$');

-- Bundle quantity must be positive
ALTER TABLE call_off ADD CONSTRAINT chk_calloff_bundle_qty_positive
CHECK (bundle_qty > 0 AND bundle_qty <= 10000);

-- Delivery date cannot be in the past
ALTER TABLE call_off ADD CONSTRAINT chk_calloff_delivery_future
CHECK (requested_delivery_date >= CURRENT_DATE OR requested_delivery_date IS NULL);
```

#### Inventory Business Rules
```sql
-- Bundle weight tolerance (±5% of 1000kg standard)
ALTER TABLE inventory_bundle ADD CONSTRAINT chk_bundle_weight_tolerance
CHECK (weight_kg BETWEEN 950 AND 1050);

-- Lot must have valid purity percentage
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_purity_range
CHECK (purity_pct BETWEEN 80.00 AND 99.99);

-- Manufacturing date reasonable range
ALTER TABLE inventory_lot ADD CONSTRAINT chk_lot_manufactured_date
CHECK (manufactured_on BETWEEN '2020-01-01' AND CURRENT_DATE + INTERVAL '30 days');
```

### 4. Audit and Timestamp Triggers

#### Updated_at Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_inventory_bundle_updated_at 
    BEFORE UPDATE ON inventory_bundle 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Call-off Number Generation
```sql
CREATE OR REPLACE FUNCTION generate_calloff_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_num INT;
    new_number TEXT;
BEGIN
    -- Extract year from current date
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(SUBSTRING(call_off_number, 9, 4)::INT), 0) + 1
    INTO sequence_num
    FROM call_off 
    WHERE call_off_number LIKE 'CO-' || year_part || '-%';
    
    -- Generate new call-off number
    new_number := 'CO-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.call_off_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_calloff_number_trigger
    BEFORE INSERT ON call_off 
    FOR EACH ROW 
    WHEN (NEW.call_off_number IS NULL)
    EXECUTE FUNCTION generate_calloff_number();
```

### 5. Query Performance Views

#### Call-off Summary View
```sql
CREATE VIEW v_calloff_summary AS
SELECT 
    co.call_off_id,
    co.call_off_number,
    co.status,
    co.bundle_qty,
    co.requested_delivery_date,
    q.metal_code,
    q.direction,
    q.counterparty_id,
    COUNT(csl.shipment_line_id) as shipment_line_count,
    SUM(csl.bundle_qty) as planned_bundle_qty
FROM call_off co
JOIN quota q ON co.quota_id = q.quota_id
LEFT JOIN call_off_shipment_line csl ON co.call_off_id = csl.call_off_id
GROUP BY co.call_off_id, q.metal_code, q.direction, q.counterparty_id;
```

#### Quota Balance View
```sql
CREATE VIEW v_quota_balance AS
SELECT 
    q.quota_id,
    q.counterparty_id,
    q.period_month,
    q.metal_code,
    q.qty_t as quota_qty,
    q.tolerance_pct,
    COALESCE(SUM(co.bundle_qty), 0) as consumed_bundles,
    q.qty_t - COALESCE(SUM(co.bundle_qty), 0) as remaining_qty
FROM quota q
LEFT JOIN call_off co ON q.quota_id = co.quota_id 
    AND co.status IN ('CONFIRMED', 'FULFILLED')
GROUP BY q.quota_id, q.counterparty_id, q.period_month, q.metal_code, q.qty_t, q.tolerance_pct;
```

## ✅ Acceptance Criteria

- [ ] All specified indexes created and optimized
- [ ] Query performance improved for common access patterns:
  - [ ] Call-off listing by quota/status < 100ms
  - [ ] ATP bundle lookups < 50ms  
  - [ ] Quota balance calculations < 200ms
- [ ] Business rule constraints enforced:
  - [ ] Call-off number pattern validation
  - [ ] Bundle quantity limits
  - [ ] Weight tolerances
  - [ ] Date validations
- [ ] Triggers working correctly:
  - [ ] Auto-generated call-off numbers
  - [ ] Updated_at timestamp maintenance
- [ ] Performance views providing fast access to aggregated data
- [ ] Index usage confirmed via EXPLAIN ANALYZE
- [ ] No constraint violations in test data

## 🔄 Dependencies

**Requires**:
- Task 005: Core schema tables created
- Task 006: RLS policies implemented  
- Test data for performance validation

**Blocks**:
- Backend API development (performance dependent)
- Frontend data loading (query speed critical)
- Reporting and analytics features

## 📁 Files to Create/Modify

```
database/
├── migrations/
│   ├── 017_create_performance_indexes.sql
│   ├── 018_create_business_constraints.sql
│   ├── 019_create_triggers.sql
│   └── 020_create_performance_views.sql
├── performance/
│   ├── query-benchmarks.sql
│   └── index-usage-analysis.sql
└── docs/
    └── performance-optimization.md
```

## 🚨 Risks & Considerations

1. **Index Maintenance Overhead**: Too many indexes can slow down writes
2. **Constraint Conflicts**: Overly restrictive constraints may block valid operations
3. **Trigger Performance**: Complex triggers can impact transaction speed
4. **View Performance**: Materialized views may be needed for complex aggregations
5. **Storage Growth**: Indexes consume additional disk space

## 📊 Performance Monitoring Setup

```sql
-- Index usage monitoring
CREATE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Query performance tracking
CREATE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking >100ms on average
ORDER BY mean_time DESC;
```

## 📋 Review Checklist

Before approval, verify:
- [ ] All indexes align with documented access patterns
- [ ] Business constraints match requirements specification
- [ ] Trigger logic is correct and efficient
- [ ] Performance views return expected results
- [ ] Index selectivity is appropriate (not too broad/narrow)
- [ ] Constraint error messages are user-friendly
- [ ] Performance impact assessed with representative data volume

---

**Next Task**: Task 008 - Build Edge Function import_quota_from_titan.ts  
**Review Required**: Yes - Please approve before implementation