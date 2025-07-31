# Technical Debt Registry

*Last Updated: July 31, 2025*

## 🔴 Critical Issues (Fix Immediately)

### CRITICAL-001: Security Vulnerabilities
- **Files**: package.json (both frontend/backend)
- **Issue**: form-data vulnerability (frontend), cookie vulnerability (backend)
- **Fix**: `npm audit fix` in both directories
- **Effort**: 5 minutes
- **Owner**: Any developer

### CRITICAL-002: TypeScript 'any' Usage
- **Files**: 
  - `frontend/src/services/api-client.ts`
  - `frontend/src/components/CallOff/EditShipmentLineDialog.tsx`
  - `backend/src/api/middleware/error.ts`
- **Issue**: 20+ instances of `any` type
- **Fix**: Define proper interfaces and types
- **Effort**: 2-3 days
- **Owner**: Implementation team

## 🟡 High Priority Refactoring

### REFACTOR-001: Authentication Provider Duplication
- **Files**:
  - `frontend/src/auth/MockAuthProvider.tsx`
  - `frontend/src/auth/DevAuthProvider.tsx`
  - `frontend/src/auth/SimpleAuthProvider.tsx`
- **Issue**: 80% duplicate code across three providers
- **Solution**: Create base AuthProvider with strategy pattern
- **Effort**: 1 week
- **Business Impact**: Maintenance burden, inconsistent behavior

### REFACTOR-002: Shipment Line Dialog Duplication
- **Files**:
  - `frontend/src/components/CallOff/CreateShipmentLineDialog.tsx` (492 lines)
  - `frontend/src/components/CallOff/EditShipmentLineDialog.tsx` (681 lines)
- **Issue**: 70% identical code
- **Solution**: Extract shared ShipmentLineForm component
- **Effort**: 4-5 days
- **Business Impact**: Bug duplication, maintenance nightmare

### REFACTOR-003: Console.log Cleanup
- **Files**: 21 files across codebase
- **Issue**: Development logs in production code
- **Solution**: Remove or replace with proper logging
- **Effort**: 1 day
- **Business Impact**: Performance, security

## 🟢 Medium Priority Issues

### REFACTOR-004: API Error Handling
- **Location**: `backend/src/api/routes/*`
- **Issue**: Inconsistent error response formats
- **Solution**: Standardize error middleware
- **Effort**: 2-3 days

### REFACTOR-005: Validation Logic Duplication
- **Location**: Multiple dialog components
- **Issue**: Similar validation repeated
- **Solution**: Centralized validation hooks
- **Effort**: 3-4 days

### REFACTOR-006: Status Transition Logic
- **Location**: Scattered across services
- **Issue**: Business rules hard to maintain
- **Solution**: Status machine service
- **Effort**: 2-3 days

## 📊 Code Quality Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Backend Test Coverage | 87.72% | 80%+ ✅ |
| Frontend Test Coverage | ~30% | 80% ❌ |
| TypeScript Strict | Partial | Full ❌ |
| Security Vulnerabilities | 3 | 0 ❌ |
| Max Component Size | 681 lines | <300 ❌ |

## 🎯 Refactoring Roadmap

### Sprint 1 (Current)
- [ ] Fix security vulnerabilities
- [ ] Remove console.logs
- [ ] Start auth provider consolidation

### Sprint 2
- [ ] Complete auth provider refactoring
- [ ] Begin shipment dialog consolidation

### Sprint 3
- [ ] Complete shipment dialog refactoring
- [ ] Fix TypeScript any usage

### Sprint 4
- [ ] Standardize API error handling
- [ ] Centralize validation logic

## 📝 Notes

- Clerk authentication integration will obsolete current auth providers
- Consider migrating to strict TypeScript incrementally
- Frontend testing framework needs setup before adding tests
- Performance monitoring should be added before optimization