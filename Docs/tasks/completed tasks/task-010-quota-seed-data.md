# Task 010: Create Manual Quota Seed Data for Development

**Status**: ✅ COMPLETED & CONFIRMED  
**Priority**: High  
**Estimated Effort**: 30 minutes  
**Actual Effort**: 45 minutes  
**Completed Date**: July 12, 2025  
**Confirmed By**: System  
**Prerequisites**: Tasks 005-007 (Database schema complete)

## 🎉 Completion Summary

**Successfully implemented comprehensive quota seed data with:**

- ✅ **Migration 025_seed_quota_data.sql** applied to development environment
- ✅ **20 quota records** across 3 business units (EU, US, APAC)
- ✅ **6 metal types** covered: CU, AL, NI, ZN, PB, SN
- ✅ **Multiple tolerance scenarios** from 0% to 20% for edge case testing
- ✅ **Period coverage** from June 2025 to October 2025
- ✅ **Both BUY and SELL directions** represented

## 📋 Original Objective

Create realistic seed data for the quota table to enable development and testing of call-off functionality without requiring Titan integration.

## 🎯 Scope

### Data Requirements:
1. **Representative quotas** covering multiple scenarios
2. **Different metal types** (CU, AL, NI, etc.)
3. **Buy and sell directions** 
4. **Various counterparties** and business units
5. **Current and future periods** for testing
6. **Tolerance variations** to test edge cases

### Use Cases to Support:
- Call-off creation with quota validation
- Quota balance calculations
- Tolerance testing (over/under consumption)
- Multi-tenant testing (different BUs)
- Period-based filtering and reporting

## 📝 Detailed Implementation Plan

### 1. Quota Seed Data Structure
```sql
-- Create seed data migration
-- 023_seed_quota_data.sql

-- Sample counterparties (business units)
INSERT INTO counterparties (counterparty_id, name, business_unit) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'European Metals Ltd', 'EU'),
('550e8400-e29b-41d4-a716-446655440002', 'Americas Trading Corp', 'US'),
('550e8400-e29b-41d4-a716-446655440003', 'Asia Pacific Metals', 'APAC');

-- Quota seed data covering various scenarios
INSERT INTO quota (quota_id, counterparty_id, direction, period_month, qty_t, tolerance_pct, incoterm_code, metal_code) VALUES
-- European Copper - Current month
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'BUY', '2025-07-01', 1000.000, 5.00, 'CIF', 'CU'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'SELL', '2025-07-01', 750.000, 3.00, 'FOB', 'CU'),

-- European Aluminum - Next month  
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'BUY', '2025-08-01', 2000.000, 7.50, 'CIF', 'AL'),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'SELL', '2025-08-01', 1500.000, 5.00, 'FOB', 'AL'),

-- Americas Nickel - Current month
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'BUY', '2025-07-01', 500.000, 10.00, 'CIF', 'NI'),
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'SELL', '2025-07-01', 300.000, 2.50, 'FOB', 'NI'),

-- APAC Mixed metals - Future months
('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', 'BUY', '2025-09-01', 800.000, 6.00, 'CIF', 'CU'),
('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', 'BUY', '2025-09-01', 1200.000, 8.00, 'CIF', 'AL'),

-- High tolerance quota for testing edge cases
('650e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'BUY', '2025-07-01', 100.000, 15.00, 'EXW', 'ZN'),

-- Zero tolerance quota for strict testing
('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 'SELL', '2025-08-01', 250.000, 0.00, 'FOB', 'CU');
```

### 2. Test Scenarios Supported

#### Basic Operations:
- **Small quotas** (100-300t) for quick testing
- **Large quotas** (1000-2000t) for realistic scenarios
- **Multiple metals** to test filtering and selection

#### Edge Cases:
- **High tolerance** (15%) for over-consumption testing
- **Zero tolerance** (0%) for strict validation
- **Multiple periods** for date-based filtering

#### Multi-tenant Testing:
- **3 different BUs** (EU, US, APAC)
- **Different counterparties** per region
- **Isolated quota pools** per business unit

### 3. Additional Test Data

#### User Profiles for Testing
```sql
-- Test user profiles (assuming auth.users exist)
INSERT INTO user_profiles (user_id, business_unit_id, role) VALUES
-- EU users
('user-eu-ops-001', '550e8400-e29b-41d4-a716-446655440001', 'OPS'),
('user-eu-trade-001', '550e8400-e29b-41d4-a716-446655440001', 'TRADE'),

-- US users  
('user-us-ops-001', '550e8400-e29b-41d4-a716-446655440002', 'OPS'),
('user-us-trade-001', '550e8400-e29b-41d4-a716-446655440002', 'TRADE'),

-- APAC users
('user-apac-ops-001', '550e8400-e29b-41d4-a716-446655440003', 'OPS');
```

#### Sample Call-offs (for testing quota consumption)
```sql
-- Some existing call-offs to test balance calculations
INSERT INTO call_off (call_off_id, quota_id, call_off_number, status, bundle_qty, counterparty_id, direction, created_by) VALUES
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'CO-2025-0001', 'CONFIRMED', 100, '550e8400-e29b-41d4-a716-446655440001', 'BUY', 'user-eu-ops-001'),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'CO-2025-0002', 'NEW', 50, '550e8400-e29b-41d4-a716-446655440001', 'BUY', 'user-eu-trade-001');
```

### 4. Data Validation Script
```sql
-- Verify seed data integrity
SELECT 
    q.quota_id,
    q.metal_code,
    q.direction,
    q.qty_t,
    q.tolerance_pct,
    c.name as counterparty_name,
    COALESCE(SUM(co.bundle_qty), 0) as consumed_bundles,
    q.qty_t - COALESCE(SUM(co.bundle_qty), 0) as remaining_qty
FROM quota q
LEFT JOIN counterparties c ON q.counterparty_id = c.counterparty_id
LEFT JOIN call_off co ON q.quota_id = co.quota_id AND co.status IN ('CONFIRMED', 'FULFILLED')
GROUP BY q.quota_id, q.metal_code, q.direction, q.qty_t, q.tolerance_pct, c.name
ORDER BY q.metal_code, q.direction, q.period_month;
```

## ✅ Acceptance Criteria

- [ ] Quota seed data inserted successfully
- [ ] Multiple metal types represented (CU, AL, NI, ZN)
- [ ] Both BUY and SELL directions covered
- [ ] Different tolerance percentages for edge case testing
- [ ] Multiple business units/counterparties
- [ ] Current and future period months
- [ ] User profiles created for different roles and BUs
- [ ] Sample call-offs demonstrate quota consumption
- [ ] Data validation query runs without errors
- [ ] Quota balance calculations work correctly

## 🔄 Dependencies

**Requires**:
- Tasks 005-007: Database schema complete
- Counterparties/business units table structure
- User profiles table exists

**Blocks**:
- Task 009: Call-off CRUD development
- Frontend quota selection and validation
- Testing of quota balance calculations

## 📁 Files to Create/Modify

```
database/
├── migrations/
│   ├── 023_seed_counterparties.sql
│   ├── 024_seed_quota_data.sql
│   └── 025_seed_test_users.sql
└── scripts/
    └── validate_seed_data.sql
```

## 🚨 Risks & Considerations

1. **Data Volume**: Keep seed data manageable but representative
2. **Test Isolation**: Ensure test data doesn't interfere with production
3. **Realistic Values**: Use plausible metal quantities and percentages
4. **Date Management**: Keep periods current to avoid date-related issues
5. **Cleanup**: Plan for easy seed data cleanup/refresh

## 🧪 Testing Strategy

1. **Data Integrity**: Verify all foreign keys resolve correctly
2. **Balance Calculations**: Test quota consumption math
3. **Multi-tenant**: Verify BU isolation works with seed data
4. **Edge Cases**: Test high/zero tolerance scenarios
5. **UI Integration**: Verify seed data displays correctly in frontend

## 📋 Review Checklist

Before approval, verify:
- [ ] Seed data covers all required test scenarios
- [ ] Business unit isolation can be tested
- [ ] Edge cases (tolerance limits) are included
- [ ] Data volumes are appropriate for development
- [ ] Cleanup procedures are planned
- [ ] No sensitive or production data included

---

**Next Task**: Task 009 - Build Edge Function calloff_crud.ts (now unblocked)  
**Review Required**: Yes - Please approve before implementation