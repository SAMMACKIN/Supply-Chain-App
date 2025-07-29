# Refactoring Tasks

## Overview
This document contains refactoring tasks identified through automated code analysis. Tasks are prioritized by impact and effort.

---

## TASK-R001: Consolidate Multiple API Client Implementations

**Status**: ready  
**Type**: refactor  
**Priority**: high  
**Estimate**: M (2-3 days)  

### Problem
The codebase has 3 different API client implementations causing confusion and duplication:
- `/frontend/src/lib/api.ts` - Uses `RAILWAY_API` environment variable
- `/frontend/src/services/calloff-api.ts` - Uses `API_URL` environment variable  
- `/frontend/src/services/api-client.ts` - Uses `API_BASE_URL` environment variable

### Impact
- Code duplication across 3 files
- Inconsistent error handling patterns
- Configuration confusion (3 different env vars for same purpose)
- Maintenance overhead

### Solution
Create a single, unified API client with:
- Consistent configuration using one environment variable
- Centralized error handling with proper typing
- Request/response interceptors for auth and logging
- Retry logic for failed requests

### Acceptance Criteria
- [ ] Single API client module exists at `/frontend/src/lib/api-client.ts`
- [ ] All components use the unified client
- [ ] Old API client files are removed
- [ ] Uses single `VITE_API_URL` environment variable
- [ ] Error handling is consistent across all API calls
- [ ] All existing tests pass
- [ ] New unit tests for API client functionality

### Dependencies
- None

### Risk Notes
- May affect all components making API calls
- Need to update environment variable references

---

## TASK-R002: Fix Duplicate Enum Definitions in Prisma Schema

**Status**: ready  
**Type**: refactor  
**Priority**: high  
**Estimate**: XS (< 30 min)  

### Problem
Prisma schema contains duplicate enum definitions:
- `CallOffStatus` and `CallOffStatusEnum` with identical values
- `ShipmentLineStatus` and `ShipmentLineStatusEnum` with identical values

### Impact
- Type confusion in generated Prisma client
- Potential runtime errors from enum mismatches
- Increased bundle size

### Solution
1. Remove duplicate enums (keep the ones without "Enum" suffix)
2. Update all references in models
3. Regenerate Prisma client
4. Update TypeScript imports

### Acceptance Criteria
- [ ] Only one enum definition per status type
- [ ] All model references updated
- [ ] Prisma client regenerated
- [ ] TypeScript compilation succeeds
- [ ] No runtime errors

### Dependencies
- None

### Risk Notes
- Low risk - compile-time type checking will catch issues

---

## TASK-R003: Create Centralized Mock Data Service

**Status**: ready  
**Type**: refactor  
**Priority**: high  
**Estimate**: S (1-2 days)  

### Problem
Mock data is scattered throughout the codebase:
- Hardcoded in `/frontend/src/services/calloff-api.ts`
- Mock endpoints in backend `/backend/src/server.ts`
- Inline mock data in various components

### Impact
- Difficult to maintain consistent test data
- Duplication of mock objects
- Hard to update when schema changes

### Solution
Create a centralized mock data factory:
1. `/frontend/src/test/mock-data/factories.ts` - Factory functions
2. `/frontend/src/test/mock-data/fixtures.ts` - Static fixtures
3. Remove all hardcoded mock data
4. Update components to use factory

### Acceptance Criteria
- [ ] Mock data factory created with builder pattern
- [ ] All hardcoded mock data removed
- [ ] Components use centralized mock data
- [ ] Mock data matches current schema exactly
- [ ] Easy to generate varied test scenarios

### Dependencies
- TASK-R002 (for correct enum types)

### Risk Notes
- Need to ensure mock data matches production schema

---

## TASK-R004: Consolidate Authentication Providers

**Status**: ready  
**Type**: refactor  
**Priority**: high  
**Estimate**: L (3-4 days)  

### Problem
Multiple authentication provider implementations exist:
- `AuthContext.tsx`
- `DevAuthProvider.tsx`
- `MockAuthProvider.tsx`
- `SimpleAuthProvider.tsx`
- Plus backup files

### Impact
- Confusion about which provider to use
- Dead code accumulation
- Inconsistent auth behavior
- Security risks from mixed implementations

### Solution
Create a single, configurable auth provider:
1. Environment-based provider selection
2. Clear interfaces for auth operations
3. Remove all duplicate providers
4. Document auth flow clearly

### Acceptance Criteria
- [ ] Single AuthProvider component
- [ ] Environment-based configuration (dev/staging/prod)
- [ ] All auth operations work correctly
- [ ] Old providers removed
- [ ] Clear documentation of auth flow
- [ ] Unit tests for all auth scenarios

### Dependencies
- None

### Risk Notes
- High risk - affects all authenticated operations
- Need thorough testing of all auth scenarios

---

## TASK-R005: Standardize Component Naming Convention

**Status**: ready  
**Type**: refactor  
**Priority**: medium  
**Estimate**: S (1 day)  

### Problem
Inconsistent page component naming:
- `MuiQuotas` vs `Quotas`
- `SimpleCallOffs` vs `CallOffs` vs `MuiCallOffs`
- Multiple versions of same functionality

### Impact
- Confusing navigation structure
- Duplicate code for same features
- Unclear which component to use

### Solution
1. Adopt consistent naming: `[Feature]Page.tsx`
2. Remove duplicate components
3. Update all imports and routes
4. Clean up unused components

### Acceptance Criteria
- [ ] All page components follow `[Feature]Page.tsx` pattern
- [ ] No duplicate page components
- [ ] Router updated with new names
- [ ] All imports updated
- [ ] Unused components removed

### Dependencies
- None

### Risk Notes
- May affect bookmarked URLs if routes change

---

## TASK-R006: Extract Business Logic from Large Components

**Status**: ready  
**Type**: refactor  
**Priority**: medium  
**Estimate**: M (2-3 days per component)  

### Problem
Large components like `CreateCallOffWizard.tsx` mix multiple concerns:
- Form validation logic
- API calls
- Complex state management
- UI rendering

### Impact
- Difficult to unit test
- Hard to maintain and modify
- Poor separation of concerns
- Performance issues from unnecessary re-renders

### Solution
Extract into smaller, focused units:
1. Custom hooks for business logic
2. Separate validation schemas
3. Service layer for API calls
4. Pure UI components

### Acceptance Criteria
- [ ] Business logic in custom hooks
- [ ] Validation schemas extracted
- [ ] API calls in service layer
- [ ] Components under 200 lines
- [ ] Unit tests for each extracted piece
- [ ] No change in functionality

### Dependencies
- TASK-R001 (for consistent API calls)

### Risk Notes
- Medium risk - need careful testing of wizard flow

---

## TASK-R007: Remove All Commented Code

**Status**: ready  
**Type**: refactor  
**Priority**: medium  
**Estimate**: XS (< 30 min)  

### Problem
Many files contain commented-out code:
- Old Supabase references
- Commented fields like `delivery_location`
- Disabled functionality

### Impact
- Code clutter reducing readability
- Confusion about active vs inactive code
- Increased file sizes

### Solution
1. Remove all commented code
- Git history preserves old code
2. Add TODO comments for planned features
3. Clean up imports

### Acceptance Criteria
- [ ] No commented code blocks remain
- [ ] Important notes converted to proper comments
- [ ] All files pass linting
- [ ] Git commit message references this task

### Dependencies
- None

### Risk Notes
- Very low risk - only removing comments

---

## TASK-R008: Implement Centralized Error Handling

**Status**: ready  
**Type**: refactor  
**Priority**: medium  
**Estimate**: M (2 days)  

### Problem
Inconsistent error handling patterns:
- Some components use try/catch
- Others use Promise.catch()
- React Query components use onError
- No global error boundary

### Impact
- Poor user experience with unhandled errors
- Inconsistent error messages
- Difficult to track errors in production

### Solution
Implement comprehensive error handling:
1. Global error boundary component
2. Consistent error types and messages
3. Toast notifications for user feedback
4. Error logging service integration

### Acceptance Criteria
- [ ] Error boundary catches all React errors
- [ ] Consistent error message format
- [ ] User-friendly error notifications
- [ ] Errors logged with context
- [ ] Recovery mechanisms where appropriate
- [ ] Error handling guide documented

### Dependencies
- None

### Risk Notes
- Need to test error scenarios thoroughly

---

## TASK-R009: Clean Up Database Schema and Migrations

**Status**: ready  
**Type**: refactor  
**Priority**: medium  
**Estimate**: L (3-4 days)  

### Problem
Database schema has inconsistencies:
- References to non-existent fields
- Multiple migration files in various states
- Commented fields that may be needed

### Impact
- Database integrity issues
- Deployment failures
- Confusion about actual schema

### Solution
1. Audit current database state
2. Create clean baseline migration
3. Remove old migration files
4. Document schema decisions

### Acceptance Criteria
- [ ] Single source of truth for schema
- [ ] Clean migration history
- [ ] All references valid
- [ ] Schema documentation updated
- [ ] Successful deployment to fresh database

### Dependencies
- TASK-R002 (enum cleanup)

### Risk Notes
- High risk - affects data integrity
- Need backup before changes

---

## TASK-R010: Implement Type Safety Between Backend and Frontend

**Status**: ready  
**Type**: refactor  
**Priority**: low  
**Estimate**: L (3-4 days)  

### Problem
Types defined separately in frontend and backend:
- Potential mismatches
- Manual synchronization needed
- No compile-time safety across boundary

### Impact
- Runtime type errors
- Extra maintenance burden
- API contract violations

### Solution
Options:
1. Generate TypeScript types from Prisma schema
2. Shared types package
3. OpenAPI spec with code generation

### Acceptance Criteria
- [ ] Single source of truth for types
- [ ] Automatic type generation
- [ ] Frontend and backend share types
- [ ] Type mismatches caught at compile time
- [ ] Documentation of type system

### Dependencies
- TASK-R009 (clean schema first)

### Risk Notes
- May require build process changes

---

## TASK-R011: Standardize Import Patterns

**Status**: ready  
**Type**: refactor  
**Priority**: low  
**Estimate**: S (1 day)  

### Problem
Mix of import styles:
- Relative imports: `../../../components`
- Absolute imports: `src/components`
- Inconsistent usage

### Impact
- Difficult refactoring
- Import errors when moving files
- Poor readability

### Solution
1. Configure path aliases in tsconfig
2. Update all imports to use aliases
3. ESLint rule to enforce pattern

### Acceptance Criteria
- [ ] Path aliases configured
- [ ] All imports use aliases
- [ ] ESLint rule prevents relative imports
- [ ] Build succeeds with new imports
- [ ] Documentation of import conventions

### Dependencies
- None

### Risk Notes
- Low risk - build will fail if imports wrong

---

## TASK-R012: Implement Consistent Loading States

**Status**: ready  
**Type**: refactor  
**Priority**: low  
**Estimate**: M (2 days)  

### Problem
Inconsistent loading state handling:
- Some components show spinners
- Others show nothing
- No skeleton screens
- Race conditions possible

### Impact
- Poor user experience
- Layout shifts
- Perceived performance issues

### Solution
1. Create loading component library
2. Implement skeleton screens
3. Consistent loading patterns
4. Prevent race conditions

### Acceptance Criteria
- [ ] Loading component library created
- [ ] All async operations show loading state
- [ ] Skeleton screens for major components
- [ ] No layout shifts during loading
- [ ] Consistent animation patterns

### Dependencies
- None

### Risk Notes
- Low risk - purely visual changes

---

## Micro-Refactoring Opportunities (Can be done immediately)

1. **Fix import statements** in `/frontend/src/components/CallOff/CallOffDetailView.tsx` - unused imports
2. **Remove console.log statements** throughout codebase
3. **Fix inconsistent indentation** in several files
4. **Update deprecated React lifecycle methods** if any
5. **Remove unused CSS classes** in style files

## Metrics to Track

- **Code Coverage**: Current vs after refactoring
- **Bundle Size**: Track reduction from removing duplicates
- **Type Coverage**: Percentage of typed code
- **Complexity Metrics**: Cyclomatic complexity per function
- **Performance**: Page load times before/after

## Success Criteria

- All high-priority tasks completed within 2 weeks
- No regression in functionality
- Improved developer experience metrics
- Reduced bundle size by at least 20%
- 90%+ type coverage achieved