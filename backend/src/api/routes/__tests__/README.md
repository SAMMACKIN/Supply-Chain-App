# Quotas API Tests

## Overview
This test suite provides comprehensive unit tests for the Backend API Routes (Quotas) module using Jest and Supertest.

## Test Coverage

### GET /api/quotas
- ✅ Returns all quotas with balance calculations
- ✅ Filters by direction (BUY/SELL)
- ✅ Filters by metal_code
- ✅ Filters by counterparty_id
- ✅ Filters by business_unit
- ✅ Filters by month
- ✅ Handles multiple filters
- ✅ Handles quotas with no call-offs
- ✅ Validates input (invalid direction, invalid UUID)
- ✅ Handles database errors gracefully

### GET /api/quotas/:id
- ✅ Returns single quota with details
- ✅ Returns 404 for non-existent quota
- ✅ Handles database errors

### GET /api/quotas/filters/counterparties
- ✅ Returns active counterparties with quotas
- ✅ Returns empty array when no data
- ✅ Handles database errors

### Edge Cases
- ✅ Very large quantities
- ✅ Over-allocated quotas (negative availability)
- ✅ Empty result sets

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run only quota tests
npm test -- quotas.test.ts
```

## Mocking Strategy

1. **Prisma Client**: All database calls are mocked to ensure tests are isolated and fast
2. **Auth Middleware**: Mocked to bypass authentication during tests
3. **Error Handling**: Simplified error handler for predictable test responses

## Test Data

The tests use consistent mock data:
- Mock Quota ID: `123e4567-e89b-12d3-a456-426614174000`
- Mock Counterparty ID: `223e4567-e89b-12d3-a456-426614174000`
- Test User ID: `test-user-123`

## Adding New Tests

When adding new tests:
1. Follow the existing pattern of mocking Prisma methods
2. Clear all mocks in `beforeEach`
3. Test both success and error scenarios
4. Include edge cases where applicable
5. Verify both response data and Prisma method calls

## Notes

- Tests use `express-async-errors` for automatic async error handling
- All endpoints require authentication (mocked in tests)
- Zod validation errors return 400 status
- Database errors return 500 status
- The `bundle_qty` field maps to `qty_t` for frontend compatibility