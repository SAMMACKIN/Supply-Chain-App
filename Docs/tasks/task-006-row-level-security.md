# Task 006: Database Schema Setup - Implement Row-Level Security Policies

**Status**: 🔴 Pending Approval  
**Priority**: High  
**Estimated Effort**: 2-3 hours  
**Prerequisites**: Task 005 (Core schema) completed

## 📋 Objective

Implement comprehensive Row-Level Security (RLS) policies for all tables to ensure multi-tenant data isolation, role-based access control, and compliance with business rules as specified in the documentation.

## 🎯 Scope

### Security Requirements:
1. **Multi-tenant isolation** by Business Unit (BU)
2. **Role-based access control** (OPS, TRADE, PLANNER)
3. **Quota table protection** (read-only for UI, write-only for Titan import)
4. **Call-off workflow restrictions** based on status and user role
5. **Shipment line access** tied to parent call-off permissions
6. **3PL warehouse isolation** for inventory data

### Tables Requiring RLS:
- `quota` - Read-only for users, service-role write
- `call_off` - BU-scoped with role restrictions  
- `call_off_shipment_line` - Inherits call-off permissions
- `transport_order` - OPS role with BU scope
- `inventory_lot` - Supplier and BU scoped
- `inventory_bundle` - Warehouse and BU scoped

## 📝 Detailed Implementation Plan

### 1. Enable RLS on All Tables
```sql
ALTER TABLE quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bundle ENABLE ROW LEVEL SECURITY;
```

### 2. Create User Profile and Role Management
```sql
-- User profiles table for storing BU and role information
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  business_unit_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OPS', 'TRADE', 'PLANNER')),
  warehouse_ids UUID[] DEFAULT '{}', -- For 3PL users
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. RLS Policies by Table

#### `quota` Table Policies
- **READ**: All authenticated users can read quotas for their BU
- **WRITE**: Only service role (Titan import) can insert/update
- **DELETE**: Restricted to service role

#### `call_off` Table Policies  
- **SELECT**: Users with OPS or TRADE role in same BU
- **INSERT**: Users with OPS or TRADE role for their BU quotas
- **UPDATE**: Only if status = 'NEW' and user has appropriate role
- **DELETE**: Only OPS role and status = 'NEW'

#### `call_off_shipment_line` Table Policies
- **Access**: Based on parent call_off permissions
- **UPDATE**: Only if parent call_off status allows modifications

#### `transport_order` Table Policies
- **Access**: OPS role users within same BU
- **Carriers**: Restricted view via service role for their assigned TOs

#### Inventory Table Policies
- **inventory_lot**: Supplier and BU scoped access
- **inventory_bundle**: Warehouse-level isolation for 3PL users

### 4. Helper Functions
```sql
-- Get current user's profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS user_profiles AS $$
  SELECT * FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = required_role
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user's business unit
CREATE OR REPLACE FUNCTION get_user_bu()
RETURNS UUID AS $$
  SELECT business_unit_id FROM user_profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

### 5. Sample Policy Implementations

#### Quota Policies
```sql
-- Quota SELECT: Users can read quotas for their BU
CREATE POLICY "Users can read quotas for their BU" ON quota
  FOR SELECT USING (
    counterparty_id IN (
      SELECT bu.counterparty_id FROM business_units bu 
      WHERE bu.id = get_user_bu()
    )
  );

-- Quota INSERT/UPDATE: Service role only
CREATE POLICY "Service role can write quotas" ON quota
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

#### Call-off Policies
```sql
-- Call-off SELECT: OPS/TRADE roles in same BU
CREATE POLICY "Users can read call_offs in their BU" ON call_off
  FOR SELECT USING (
    has_role('OPS') OR has_role('TRADE')
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.counterparty_id IN (
        SELECT bu.counterparty_id FROM business_units bu 
        WHERE bu.id = get_user_bu()
      )
    )
  );

-- Call-off INSERT: OPS/TRADE can create for their BU
CREATE POLICY "Users can create call_offs for their BU" ON call_off
  FOR INSERT WITH CHECK (
    (has_role('OPS') OR has_role('TRADE'))
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.counterparty_id IN (
        SELECT bu.counterparty_id FROM business_units bu 
        WHERE bu.id = get_user_bu()
      )
    )
  );

-- Call-off UPDATE: Only NEW status and appropriate role
CREATE POLICY "Users can update NEW call_offs" ON call_off
  FOR UPDATE USING (
    status = 'NEW' 
    AND (has_role('OPS') OR has_role('TRADE'))
    AND EXISTS (
      SELECT 1 FROM quota q 
      WHERE q.quota_id = call_off.quota_id 
      AND q.counterparty_id IN (
        SELECT bu.counterparty_id FROM business_units bu 
        WHERE bu.id = get_user_bu()
      )
    )
  );
```

## ✅ Acceptance Criteria

- [ ] RLS enabled on all tables
- [ ] User profiles table created with proper constraints
- [ ] Helper functions implemented and tested
- [ ] All policy categories implemented:
  - [ ] Multi-tenant BU isolation working
  - [ ] Role-based access control enforced
  - [ ] Quota table properly protected
  - [ ] Call-off workflow restrictions active
  - [ ] Shipment line access controlled
  - [ ] Inventory warehouse isolation working
- [ ] Service role can bypass RLS for system operations
- [ ] Unauthorized access attempts properly blocked
- [ ] Performance impact assessed and acceptable

## 🔄 Dependencies

**Requires**:
- Task 005: Core database schema completed
- User authentication system configured
- Business unit and counterparty data model

**Blocks**:
- All backend Edge Function development
- Frontend user interface development
- Data import and integration tasks

## 📁 Files to Create/Modify

```
database/
├── migrations/
│   ├── 008_enable_rls.sql
│   ├── 009_create_user_profiles.sql
│   ├── 010_create_rls_functions.sql
│   ├── 011_quota_policies.sql
│   ├── 012_call_off_policies.sql
│   ├── 013_shipment_line_policies.sql
│   ├── 014_transport_order_policies.sql
│   ├── 015_inventory_policies.sql
│   └── 016_test_rls_policies.sql
└── docs/
    └── security-model.md
```

## 🚨 Risks & Considerations

1. **Performance Impact**: RLS can impact query performance - monitor and optimize
2. **Service Role Access**: Ensure system operations aren't blocked
3. **Policy Complexity**: Complex policies can be hard to debug and maintain
4. **User Profile Sync**: Ensure user profiles stay in sync with auth system
5. **Emergency Access**: Plan for admin override capabilities
6. **Testing Coverage**: Comprehensive testing of all permission scenarios

## 🧪 Testing Strategy

1. **Unit Tests**: Each policy tested individually
2. **Integration Tests**: Cross-table access patterns
3. **Role-Based Tests**: Each role's access patterns verified
4. **Negative Tests**: Unauthorized access attempts blocked
5. **Performance Tests**: Query performance with RLS enabled

## 📋 Review Checklist

Before approval, verify:
- [ ] All business rules from documentation are implemented
- [ ] Multi-tenant isolation is complete and tested
- [ ] Role-based access follows specification
- [ ] Service operations can function with RLS enabled
- [ ] Emergency access procedures are documented
- [ ] Performance impact is acceptable
- [ ] Security model documentation is complete

---

**Next Task**: Task 007 - Create database indexes and constraints  
**Review Required**: Yes - Please approve before implementation