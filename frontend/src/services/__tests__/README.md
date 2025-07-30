# Call-Off API Service Tests

This directory contains unit tests for the call-off API service (`calloff-api.ts`).

## Test Coverage

The test suite covers:

### API Communication
- ✅ Successful API responses with data wrapper
- ✅ API error responses
- ✅ API responses without data wrapper
- ✅ Network error handling
- ✅ Timeout handling
- ✅ Concurrent request handling

### Service Functions
- ✅ `fetchCounterpartyAddresses` - Returns mock addresses
- ✅ `fetchCounterparties` - API and mock fallback
- ✅ `fetchQuotasByCounterparty` - Filtered results
- ✅ `fetchAvailableQuotas` - Mock endpoint fallback
- ✅ `fetchQuotaBalance` - Balance calculations
- ✅ `fetchCallOffs` - List all call-offs
- ✅ `fetchCallOff` - Get single call-off
- ✅ `createCallOff` - Create new call-off
- ✅ `updateCallOff` - Update existing call-off
- ✅ `deleteCallOff` - Delete call-off
- ✅ `fetchShipmentLines` - Get shipment lines
- ✅ `createShipmentLine` - Create shipment line
- ✅ `updateShipmentLine` - Update shipment line
- ✅ `deleteShipmentLine` - Delete shipment line

### Status Update Helpers
- ✅ `confirmCallOff` - Update status to CONFIRMED
- ✅ `cancelCallOff` - Update status to CANCELLED
- ✅ `fulfillCallOff` - Update status to FULFILLED

### Type Safety
- ✅ Quota object type validation
- ✅ CallOff status enum validation
- ✅ CreateCallOffRequest required fields

### Edge Cases
- ✅ Malformed API responses
- ✅ Empty API responses
- ✅ Mock data fallback when API unavailable
- ✅ Mock data mode (no API URL configured)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are organized by functionality:
- `apiCall helper` - Tests the core API communication function
- `fetch*` functions - Tests for each data fetching function
- `CRUD operations` - Tests for Create, Read, Update, Delete operations
- `Status update helpers` - Tests for status transition functions
- `Type safety tests` - TypeScript type validation
- `Edge cases` - Error handling and edge case scenarios

## Mocking Strategy

The tests use:
- `vi.fn()` to mock the global `fetch` function
- `vi.hoisted()` to mock environment variables before module import
- Mock data that mirrors the actual API response structure
- Fallback behavior testing when API is unavailable

## Notes

- Tests are configured to use `happy-dom` for DOM simulation
- Custom matcher `toBeOneOf` is added for enum validation
- Console warnings from the API service are expected for fallback scenarios
- Mock data is consistent with the actual database schema