# Task 005: Database Schema Setup - Create Supabase Migrations for Core Entities

**Status**: 🔴 Pending Approval  
**Priority**: High  
**Estimated Effort**: 1-2 hours  
**Prerequisites**: Supabase project linked locally

## 📋 Objective

Create the foundational database schema for Drop 1 (Call-Off Domain) including all core entities with proper data types, constraints, and relationships as specified in the data model documentation.

## 🎯 Scope

### Tables to Create:
1. **`quota`** - Import-only table for Titan CDC data
2. **`call_off`** - Core business entity with workflow states
3. **`call_off_shipment_line`** - Shipment planning details
4. **`transport_order`** - Stub table for future expansion
5. **`inventory_lot`** - 25t manufacturer lots
6. **`inventory_bundle`** - 1t bundle units (25 per lot)

### Key Features:
- UUID primary keys with proper generation
- ENUM types for status fields and workflow states
- Foreign key relationships with proper cascade rules
- Timestamp fields with timezone support
- Numeric precision for weights and quantities
- Text fields with appropriate length constraints

## 📝 Detailed Implementation Plan

### 1. Create Migration Files
```sql
-- 001_create_enums.sql
-- 002_create_quota_table.sql  
-- 003_create_call_off_table.sql
-- 004_create_call_off_shipment_line_table.sql
-- 005_create_transport_order_table.sql
-- 006_create_inventory_lot_table.sql
-- 007_create_inventory_bundle_table.sql
```

### 2. Schema Specifications

#### `quota` Table
- `quota_id` UUID PRIMARY KEY (matches Titan ID)
- `counterparty_id` UUID NOT NULL
- `direction` ENUM('BUY','SELL') NOT NULL
- `period_month` DATE NOT NULL (YYYY-MM-01 format)
- `qty_t` NUMERIC(12,3) NOT NULL
- `tolerance_pct` NUMERIC(4,2)
- `incoterm_code` CHAR(3)
- `metal_code` VARCHAR(12) NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()

#### `call_off` Table
- `call_off_id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `quota_id` UUID NOT NULL REFERENCES quota(quota_id)
- `call_off_number` TEXT UNIQUE NOT NULL
- `status` ENUM('NEW','CONFIRMED','FULFILLED','CANCELLED') DEFAULT 'NEW'
- `bundle_qty` INT NOT NULL CHECK (bundle_qty > 0)
- `requested_delivery_date` DATE
- `counterparty_id` UUID NOT NULL
- `direction` ENUM('BUY','SELL') NOT NULL
- `incoterm_code` CHAR(3)
- `created_by` UUID NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()

#### `call_off_shipment_line` Table
- `shipment_line_id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `call_off_id` UUID NOT NULL REFERENCES call_off(call_off_id) ON DELETE CASCADE
- `bundle_qty` INT NOT NULL CHECK (bundle_qty > 0)
- `metal_code` VARCHAR(12) NOT NULL
- `destination_party_id` UUID
- `expected_ship_date` DATE
- `transport_order_id` UUID REFERENCES transport_order(transport_order_id)

#### Additional Tables (Stubs for now)
- `transport_order` - Basic structure for FK references
- `inventory_lot` - 25t lot tracking
- `inventory_bundle` - 1t bundle tracking with status

### 3. Data Integrity Rules
- Call-off number generation pattern: 'CO-YYYY-NNNN'
- Bundle quantities must be positive integers
- Dates must be reasonable (not in distant past/future)
- Status transitions follow defined state machine
- Foreign keys properly cascade on updates/deletes

## ✅ Acceptance Criteria

- [ ] All migration files created and properly sequenced
- [ ] Tables created with correct column types and constraints
- [ ] Foreign key relationships established
- [ ] ENUM types defined for all status fields
- [ ] Default values and auto-generation working (UUIDs, timestamps)
- [ ] Sample data can be inserted successfully
- [ ] Migration can be rolled back cleanly
- [ ] No SQL syntax errors or warnings

## 🔄 Dependencies

**Requires**:
- Supabase CLI installed and authenticated
- Project linked to local development environment
- Database access credentials configured

**Blocks**:
- Task 006: Row-Level Security policies
- Task 007: Database indexes and constraints
- All backend and frontend development tasks

## 📁 Files to Create/Modify

```
database/
├── migrations/
│   ├── 001_create_enums.sql
│   ├── 002_create_quota_table.sql
│   ├── 003_create_call_off_table.sql
│   ├── 004_create_call_off_shipment_line_table.sql
│   ├── 005_create_transport_order_table.sql
│   ├── 006_create_inventory_lot_table.sql
│   └── 007_create_inventory_bundle_table.sql
└── README.md
```

## 🚨 Risks & Considerations

1. **Data Type Precision**: Ensure NUMERIC types have sufficient precision for weights and financial calculations
2. **ENUM Extensibility**: Consider future expansion of status values
3. **UUID Performance**: Verify UUID generation doesn't impact performance
4. **Migration Rollback**: Ensure clean rollback procedures for production safety
5. **Naming Conventions**: Follow PostgreSQL and Supabase best practices

## 📋 Review Checklist

Before approval, verify:
- [ ] All table specifications match the data model documentation
- [ ] Foreign key relationships are correct and properly constrained  
- [ ] ENUM values match the state machines in business requirements
- [ ] Numeric precision is appropriate for business needs
- [ ] Default values and constraints prevent invalid data
- [ ] Migration files follow proper naming and sequencing
- [ ] Rollback procedures are documented and tested

---

**Next Task**: Task 006 - Implement Row-Level Security policies  
**Review Required**: Yes - Please approve before implementation