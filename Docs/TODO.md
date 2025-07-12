# Supply Chain Logistics App (CSLA) - Implementation TODO

*Generated July 12 2025 - Based on Data model.md, Claude.MD, Call Off Build.md, Transport Order Build.md, and Inventory Lot Build.md*

---

## 🚀 Implementation Overview

This TODO tracks the complete implementation of the Custom Supply & Logistics App (CSLA) to replace the E2open stack. The system manages refined-metal supply chains with 75+ metals, ~300 inbound lots/month, and ~600 customer deliveries via Supabase + React architecture.

**Target Timeline:** Q2-2026 cutover from E2open

---

## 📋 Priority Tasks by Development Drop

### 🔴 DROP 1 - Call-Off Domain (Foundation)

#### Database Schema Setup
- [ ] **Create Supabase migrations for core entities**
  - `quota` table with Titan CDC integration
  - `call_off` table with workflow state machine
  - `call_off_shipment_line` for transport planning
  - `inventory_lot` (25t manufacturer lots)
  - `inventory_bundle` (1t units with fixed 25:1 ratio)
  - `transport_order` stub for Drop 1

- [ ] **Implement Row-Level Security (RLS) policies**
  - Multi-tenant access by business unit
  - Role-based permissions (OPS, TRADE, PLANNER)
  - Quota read-only for UI, write-only for Titan import
  - Call-off CRUD based on user BU and project role

- [ ] **Create indexes and constraints**
  - `idx_calloff_quota_status (quota_id, status)` for fast filtering
  - `idx_line_to (transport_order_id)` for aggregate queries
  - `idx_bundle_wh_status (wh_id, status)` for ATP lookups
  - Foreign key constraints and unique indexes

#### Backend Development - Drop 1
- [ ] **Build Edge Function: import_quota_from_titan.ts**
  - Kafka consumer for `titan.quota` CDC topic
  - Upsert logic with conflict resolution
  - Real-time quota balance calculations
  - Error handling and dead letter queue

- [ ] **Build Edge Function: calloff_crud.ts**
  - POST /call-offs with quota validation
  - PATCH /call-offs for mutable fields (NEW status only)
  - POST /call-offs/{id}/confirm state transition
  - GET /quotas/{id}/remaining-balance calculation
  - State machine enforcement (NEW → CONFIRMED → FULFILLED/CANCELLED)

#### Frontend Development - Drop 1
- [ ] **Create React form: 'Create Call-Off'**
  - Quota selection dropdown with remaining balance
  - Bundle quantity input with validation
  - Requested delivery date picker
  - Real-time balance checking
  - Form validation and error handling

- [ ] **Build React view: 'Call-Off List & Status'**
  - Filterable/sortable data grid
  - Status chip components (NEW/CONFIRMED/FULFILLED/CANCELLED)
  - Action buttons based on status and user role
  - Real-time updates via Supabase subscriptions

#### Security & Authentication
- [ ] **Implement Supabase Auth with role management**
  - User registration and login flows
  - Role assignment (OPS, TRADE, PLANNER)
  - Business unit mapping
  - Session management and JWT validation

#### Testing & Quality - Drop 1
- [ ] **Cypress E2E tests for call-off workflow**
  - Create call-off → validate quota consumption
  - Confirm call-off → status transition
  - Cancel call-off → release quota capacity
  - Error scenarios and validation

#### DevOps Foundation
- [ ] **Supabase project configuration**
  - Database setup and schema management
  - Environment configuration (dev/staging/prod)
  - Edge Functions deployment
  - Real-time subscriptions setup

---

### 🟡 DROP 2 - Transport Order Domain (9 dev days)

#### Database Schema - Transport
- [ ] **Create transport_order, transport_stop, transport_milestone tables**
  - `transport_order` with carrier_id, booking_reference, status workflow
  - `transport_stop` with sequence_no, party_id, location_code, planned/actual times
  - `transport_milestone` with event_code (DEP/ARR/POD/EXC), event_dt, payload_json
  - State machine: NEW → BOOKED → IN_TRANSIT → DELIVERED/CANCELLED

#### Backend Development - Transport
- [ ] **Build Edge Function: create_transport_order.ts**
  - POST /transport-orders with stops and shipment_line_ids
  - PATCH /transport-orders/{id} for mutable fields (NEW status only)
  - RLS enforcement for OPS role and same BU

- [ ] **Build Edge Function: book_transporeon.ts**
  - POST /transport-orders/{id}/book for Transporeon REST v2 integration
  - Status transition NEW → BOOKED on successful booking
  - Error handling and retry logic

- [ ] **Build WebSocket listener: transporeon_ws.ts**
  - Real-time milestone ingestion from Transporeon WebSocket
  - Event mapping: DEP/ARR/POD events → status updates
  - JSONB payload storage for audit trail

#### Frontend Development - Transport
- [ ] **Build React TO Workbench**
  - Transport Order list view with filtering and sorting
  - Detail view with stops timeline and milestone tracking
  - Action buttons for booking and cancellation

- [ ] **Build React milestone timeline component**
  - Visual timeline for transport milestones
  - Real-time updates via Supabase subscriptions
  - Exception handling and alert displays

#### Testing - Transport
- [ ] **Cypress E2E tests for transport workflow**
  - Create transport order → book → track milestones → deliver
  - Error scenarios and cancellation flows
  - Integration testing with mock Transporeon responses

#### DevOps - Transport
- [ ] **Configure Transporeon integration**
  - Sandbox credentials and API key management
  - Secrets rotation setup
  - WebSocket connection monitoring

---

### 🟢 DROP 3 - Inventory & Lot Domain (6 dev days)

#### Database Schema - Inventory
- [ ] **Create inventory_lot, inventory_bundle, inventory_adjustment tables**
  - `inventory_lot` with supplier_id, metal_code, purity_pct, certificate_url
  - `inventory_bundle` (25 per lot) with weight_kg, warehouse_id, bin_location
  - `inventory_adjustment` for weight variances and corrections
  - Lot status: INBOUND → ON_HAND → CLOSED
  - Bundle status: RECEIPTED → ON_HAND → RESERVED → PICKED → SHIPPED → DELIVERED

#### Backend Development - Inventory
- [ ] **Build Edge Function: asn_ingest.ts**
  - POST /lots/asn to create lot + 25 bundles from supplier ASN
  - Automatic barcode generation for bundles
  - Certificate file upload and linking

- [ ] **Build Edge Function: bundle_adjust.ts**
  - POST /bundles/{id}/adjust-weight for weigh-bridge variances
  - Weight tolerance handling (±0.5%)
  - Adjustment audit trail

- [ ] **Build Edge Function: bundle_status.ts**
  - PUT status transitions following state machine rules
  - Event publishing for inventory changes
  - 3PL WMS webhook endpoint integration

#### Frontend Development - Inventory
- [ ] **Build React Lot & Bundle Explorer**
  - Hierarchical view: Lots containing 25 Bundles
  - Status filtering and search capabilities
  - Certificate viewing and download

- [ ] **Build React Weight Adjustment dialog**
  - Weight variance input with reason codes
  - Tolerance validation and approval workflow
  - Adjustment history display

#### Testing - Inventory
- [ ] **Cypress flows for inventory lifecycle**
  - ASN ingestion → bundle receipting → status transitions → delivery
  - Weight adjustment scenarios
  - Multi-warehouse RLS testing

- [ ] **Postman collection for inventory APIs**
  - Full CRUD operations for lots and bundles
  - Status transition validation
  - Error scenario testing

---

### 🔵 MEDIUM PRIORITY - Integration & Extended Features

#### Backend Development - Extended
- [ ] **Implement gRPC client for Titan integration**
  - Real-time call-off creation sync
  - Inventory actuals streaming
  - Transport milestone updates
  - Bidirectional event reconciliation

#### Frontend Development - Extended
- [ ] **Quota management screens**
  - Quota list view with filtering
  - Remaining balance dashboard
  - Tolerance and period management
  - Metal code and counterparty lookup

#### Integration Layer
- [ ] **3PL WMS REST endpoints (extended)**
  - Advanced bundle scanning workflows
  - Multi-warehouse synchronization
  - Automated putaway and picking
  - Real-time inventory synchronization

- [ ] **Kafka/Redpanda event streaming**
  - Event schema design (Avro/JSON)
  - Producer/consumer infrastructure
  - Topic management (lot.created, bundle.located, etc.)
  - Dead letter queues and replay

#### Testing & Quality - Extended
- [ ] **API contract validation**
  - Postman collection for all endpoints
  - Spectral OpenAPI linting
  - Contract testing with Pact
  - Performance benchmarking

- [ ] **Performance testing**
  - Load testing to 200 tx/s baseline
  - UI latency measurement (<2s p95)
  - Database query optimization
  - Auto-scaling validation

#### Security & Compliance
- [ ] **mTLS setup for 3PL integrations**
  - Certificate management
  - Mutual authentication
  - API gateway configuration
  - Security monitoring

#### DevOps - Production Ready
- [ ] **CI/CD pipeline setup**
  - Automated testing in pipeline
  - Database migration deployment
  - Edge Function deployment
  - Blue-green deployment strategy

---

### 🔵 LOW PRIORITY - Advanced Features & Migration

#### Integration - Supplier Systems
- [ ] **Supplier EDI processing (EDI 850/856)**
  - EDI parser for purchase orders
  - ASN processing for lot/bundle data
  - Chemistry certificate linking
  - Supplier portal alternative

#### Migration & Cutover
- [ ] **Dual-write strategy for E2open transition**
  - Change data capture setup
  - Conflict resolution logic
  - Rollback mechanisms
  - Data consistency monitoring

- [ ] **Legacy system migration scripts**
  - E2open data export utilities
  - Azure Blob storage integration
  - Titan historical data import
  - Data validation and reconciliation

---

## 📊 Key Metrics & Targets

| Metric | Target | Current Status |
|--------|--------|----------------|
| DB Throughput | 200 tx/s baseline | TBD |
| UI Latency | p95 < 2s | TBD |
| Availability | 99.5%+ | TBD |
| Test Coverage | >90% | TBD |

---

## 🏗️ Technical Architecture

```
React Frontend → Supabase Edge Functions → Postgres (RLS)
                           ↓
                    Kafka/Redpanda Events
                           ↓
              Titan (gRPC) + Transporeon (API) + 3PL WMS (REST)
```

**Hosting:** Supabase Cloud or self-hosted on AKS/OpenShift
**Security:** RLS + mTLS + Azure AD SSO

---

## 🎯 Acceptance Criteria by Drop

### Drop 1 - Call-Off Domain
- [ ] Quota import from Titan CDC working end-to-end
- [ ] Call-off creation, confirmation, and cancellation workflow complete
- [ ] React UI deployed with authentication and role-based access
- [ ] All E2E tests passing for core workflows
- [ ] Performance targets met for Drop 1 scope
- [ ] Demo completed with ops users and sign-off received

### Drop 2 - Transport Order Domain
- [ ] TO can be created, booked, and linked to ≥1 shipment line
- [ ] Transporeon booking returns reference; status flips to BOOKED
- [ ] WebSocket events DEP/ARR/POD move status and timestamps correctly
- [ ] Cancellation only allowed in NEW/BOOKED states
- [ ] All CRUD & events enforce RLS policies
- [ ] E2E tests for create→book→deliver path passing

### Drop 3 - Inventory & Lot Domain
- [ ] ASN for 25-bundle lot creates one lot + 25 bundles in DB
- [ ] Bundle status transitions follow exact state machine (error on illegal jump)
- [ ] Weight adjustment raises event `inv.bundle.adjusted` into event bus
- [ ] RLS: 3PL user can only see bundles at their warehouse
- [ ] Certificate upload and linking working end-to-end

---

## 📝 Open Decisions

### General Decisions
| ID | Decision Point | Option A (Default) | Option B | Status |
|----|---------------|-------------------|----------|---------|
| A | Purity & SKU modeling | Separate SKU per purity grade | Attribute-only | Open |
| B | Certificate storage | Supabase Storage blob | External object store | Open |
| C | Weight tolerance | Block shipment >±0.5% | Configurable per customer | Open |
| D | Billing unit | Full-tonne rounded | Actual weigh-bridge kg | Open |

### Transport Order Decisions (Drop 2)
| ID | Decision Point | Option A (Default) | Option B | Status |
|----|---------------|-------------------|----------|---------|
| E | Multiple Equipment support | Future requirement for split loads | Current scope single equipment | Open |
| F | Cost capture method | Rate card pricing | Auction-based pricing | Open |
| G | Exception codes | Standard subset of Transporeon codes | Full 50+ exception code set | Open |
| H | Direct EDI carriers | VAN connectivity | Direct API integration | Open |

### Inventory Decisions (Drop 3)
| ID | Decision Point | Option A (Default) | Option B | Status |
|----|---------------|-------------------|----------|---------|
| I | Tolerance handling | Auto-close adjustment within ±0.5% | Manual approval required | Open |
| J | Purity degradation | Re-test required if >90 days | Time-based auto-expiry | Open |
| K | Multi-org stock | Support consignment lots | Single org ownership only | Open |

---

*This TODO will be updated as development progresses. Priority and status should be reviewed weekly.*