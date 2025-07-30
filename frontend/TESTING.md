# Supply Chain App Testing Documentation

## Overview

The Supply Chain app implements a comprehensive testing strategy across both frontend and backend components. This document provides a complete guide to the test suite structure, coverage metrics, running tests, and maintaining the test infrastructure.

## Current Test Implementation Status

### Frontend Testing
- **Framework**: Vitest with React Testing Library
- **Status**: ✅ All unit tests passing (28/28)
- **Coverage**: Component and service tests implemented
- **E2E Tests**: Cypress tests exist but failing due to migration

### Backend Testing
- **Framework**: Jest with TypeScript
- **Status**: ⚠️ Partial implementation
- **Coverage**: 45.91% statement coverage
- **Implemented**: Quotas API routes fully tested (21/21 tests passing)
- **Pending**: CallOffs, ShipmentLines, and other API routes need tests

## Test Suite Structure

```
supply-chain-app/
├── frontend/
│   ├── src/
│   │   ├── components/__tests__/      # Component unit tests
│   │   ├── hooks/__tests__/           # Custom hook tests
│   │   ├── services/__tests__/        # API service tests
│   │   └── test/                      # Test setup and utilities
│   ├── cypress/
│   │   ├── e2e/                       # E2E test specs
│   │   ├── support/                   # Cypress commands and setup
│   │   └── screenshots/               # Failed test screenshots
│   └── vitest.config.ts               # Vitest configuration
│
└── backend/
    ├── src/
    │   ├── api/routes/__tests__/       # API route tests
    │   └── test/                       # Test setup
    ├── coverage/                        # Coverage reports
    └── jest.config.js                  # Jest configuration
```

## Running Tests

### Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run tests with verbose output
npm test -- --run --reporter=verbose

# Run specific test file
npm test -- src/services/__tests__/calloff-api.test.ts
```

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- --testPathPattern=quotas.test.ts

# Run tests with verbose output
npm test -- --verbose
```

### E2E Tests (Cypress)

```bash
# Navigate to frontend directory
cd frontend

# Open Cypress Test Runner (interactive)
npx cypress open

# Run Cypress tests headlessly
npx cypress run

# Run specific test file
npx cypress run --spec cypress/e2e/smoke-tests.cy.ts
```

## Test Coverage Reports

### Viewing Coverage Reports

#### Frontend Coverage
```bash
cd frontend
npm test -- --coverage
# HTML report will be generated in coverage/lcov-report/index.html
```

#### Backend Coverage
```bash
cd backend
npm test -- --coverage
# HTML report will be generated in coverage/lcov-report/index.html
```

### Current Coverage Metrics

#### Backend Coverage (as of last run)
- **Statements**: 45.91% (146/318)
- **Branches**: 39.53% (34/86)
- **Functions**: 48.57% (17/35)
- **Lines**: 45.77% (141/308)

#### Frontend Coverage
- Unit tests: 100% passing
- Component coverage: Partial
- Service coverage: Comprehensive

## Testing Patterns and Conventions

### Frontend Testing Patterns

#### Component Testing
```typescript
// Example: Testing a React component
import { render, screen, fireEvent } from '@testing-library/react'
import { CreateCallOffForm } from '../CreateCallOffForm'

describe('CreateCallOffForm', () => {
  it('should render form fields', () => {
    render(<CreateCallOffForm />)
    expect(screen.getByLabelText('Counterparty')).toBeInTheDocument()
  })
})
```

#### Service Testing
```typescript
// Example: Testing API services with mocked fetch
import { vi } from 'vitest'
import { fetchCallOffs } from '../calloff-api'

describe('calloff-api', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should fetch call-offs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockCallOffs })
    })
    
    const result = await fetchCallOffs()
    expect(result).toEqual(mockCallOffs)
  })
})
```

### Backend Testing Patterns

#### API Route Testing
```typescript
// Example: Testing Express routes with supertest
import request from 'supertest'
import { app } from '../../server'
import { prisma } from '../../db/client'

jest.mock('../../db/client')

describe('GET /api/quotas', () => {
  it('should return quotas', async () => {
    prisma.quota.findMany.mockResolvedValue(mockQuotas)
    
    const response = await request(app)
      .get('/api/quotas')
      .expect(200)
    
    expect(response.body.data).toEqual(mockQuotas)
  })
})
```

#### Mocking Strategy
- Mock Prisma client for database isolation
- Mock authentication middleware for protected routes
- Use `express-async-errors` for proper error handling
- Handle date serialization (Date to ISO string)

## Known Issues

### Frontend E2E Tests (3 Failing)
1. **Application loads without errors** - Fails due to missing API connection
2. **Navigation and URL changes** - Fails due to auth redirect
3. **Create call-off wizard** - Fails due to missing backend

**Root Cause**: Tests were written for Supabase integration, need updating for Railway backend.

### Backend Test Gaps
1. Missing tests for:
   - CallOffs API routes
   - ShipmentLines API routes
   - Authentication middleware
   - Error handling middleware
   - Counterparties routes

2. Low coverage on:
   - Error scenarios
   - Edge cases
   - Integration tests

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --run

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --bail --findRelatedTests"
    }
  }
}
```

## Next Steps for Test Coverage

### Immediate Priority (Backend)

1. **Complete API Route Tests**
   ```bash
   # Create test files
   touch backend/src/api/routes/__tests__/calloffs.test.ts
   touch backend/src/api/routes/__tests__/shipment-lines.test.ts
   touch backend/src/api/routes/__tests__/counterparties.test.ts
   ```

2. **Add Integration Tests**
   - Test complete API workflows
   - Test database transactions
   - Test error rollbacks

3. **Increase Coverage to 80%**
   - Add edge case tests
   - Test error scenarios
   - Test validation failures

### Frontend Improvements

1. **Fix E2E Tests**
   - Update to use Railway backend
   - Remove Supabase dependencies
   - Add proper test data setup

2. **Add Component Tests**
   - Test form validation
   - Test error states
   - Test loading states

3. **Performance Tests**
   - Test large data sets
   - Test pagination
   - Test search functionality

## Testing Best Practices

### Do's
- ✅ Write tests before fixing bugs
- ✅ Test both happy and error paths
- ✅ Mock external dependencies
- ✅ Use descriptive test names
- ✅ Keep tests isolated and independent
- ✅ Test user behavior, not implementation

### Don'ts
- ❌ Don't test implementation details
- ❌ Don't use real API calls in unit tests
- ❌ Don't skip error scenarios
- ❌ Don't write brittle tests
- ❌ Don't ignore flaky tests

## Maintenance Guidelines

### Regular Tasks
1. **Weekly**: Review and fix any flaky tests
2. **Monthly**: Update test dependencies
3. **Quarterly**: Review coverage metrics and set new targets
4. **Per Feature**: Add tests for all new features

### Test Data Management
```typescript
// Use factories for consistent test data
const createMockCallOff = (overrides = {}) => ({
  id: 'test-id',
  callOffNumber: 'CO-2025-001',
  status: 'draft',
  ...overrides
})

// Use builders for complex objects
const callOffBuilder = {
  withShipmentLines: (count) => {...},
  withStatus: (status) => {...},
  build: () => {...}
}
```

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Cypress Documentation](https://docs.cypress.io/)

### Testing Tools
- **Coverage Viewer**: Open `coverage/lcov-report/index.html` in browser
- **Test Reporter**: Use `--reporter=verbose` for detailed output
- **Debug Mode**: Use `--inspect` flag with Node.js

### Debugging Failed Tests
```bash
# Frontend debugging
npm test -- --reporter=verbose --no-coverage

# Backend debugging
npm test -- --detectOpenHandles --forceExit

# Cypress debugging
npx cypress open --config video=true
```

## Conclusion

The Supply Chain app's testing infrastructure provides a solid foundation but requires completion of backend tests and E2E test updates. Following this guide and the established patterns will help maintain high code quality and reliability as the application evolves.

For questions or issues with tests, refer to the test files in `__tests__` directories or the example patterns provided in this documentation.