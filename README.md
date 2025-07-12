# Supply Chain Logistics App (CSLA)

A comprehensive supply chain management application for refined metals logistics, replacing the existing E2open stack with a modern, Titan-centric solution.

## 🚀 Overview

CSLA manages the complete supply chain for 75+ refined metals, handling ~300 inbound lot releases and ~600 customer deliveries per month (~6,000 trucks). The system tracks 25-tonne manufacturer lots broken down into 1-tonne bundles with full traceability and no partial splitting.

## 🏗️ Architecture

```
React Frontend → Supabase Edge Functions → Postgres (RLS)
                           ↓
                    Kafka/Redpanda Events
                           ↓
              Titan (gRPC) + Transporeon (API) + 3PL WMS (REST)
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Supabase Edge Functions (Deno/TS)
- **Database**: Supabase Postgres with Row-Level Security
- **Events**: Kafka/Redpanda for real-time streaming
- **Integration**: gRPC (Titan), REST (Transporeon, 3PL WMS)
- **Hosting**: Supabase Cloud or self-hosted on AKS/OpenShift

## 📋 Development Drops

### Drop 1 - Call-Off Domain (Foundation)
- Quota import from Titan CDC
- Call-off creation, confirmation, cancellation workflow
- React UI with authentication and role-based access
- **Status**: 🔄 In Development

### Drop 2 - Transport Order Domain (9 dev days)
- Transport order management with Transporeon integration
- WebSocket milestone tracking (DEP/ARR/POD/EXC)
- React TO Workbench and timeline components
- **Status**: 📋 Planned

### Drop 3 - Inventory & Lot Domain (6 dev days)
- ASN ingestion for lot and bundle creation
- Weight variance handling and status transitions
- Certificate upload and traceability
- **Status**: 📋 Planned

## 🎯 Business Capabilities

| Capability | Description | Status |
|------------|-------------|---------|
| **Bulk Purchase** | PO lines in bundles (1t); lot references (25t) | 📋 Planned |
| **Customer Sales** | Bundle-to-lot allocation with traceability | 📋 Planned |
| **Logistics Planning** | 25t/50t truck and container load planning | 📋 Planned |
| **Inbound Visibility** | ASN with lot ID, bundle serials, net weight | 📋 Planned |
| **Outbound Visibility** | Whole bundles only, POD per bundle | 📋 Planned |
| **Transport Orders** | Bundle enumeration with gross weight | 📋 Planned |
| **Transport Execution** | Weigh-bridge variance <±0.5% | 📋 Planned |
| **Granular Inventory** | Lot (25t) → 25 × Bundle (1t) hierarchy | 📋 Planned |
| **Transporeon Integration** | Slot booking and webhook milestones | 📋 Planned |
| **Supplier/3PL Integration** | EDI 850/856 or REST with certificates | 📋 Planned |

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|---------|
| UI Latency | p95 < 2s | 🎯 Target |
| DB Throughput | 200 tx/s baseline | 🎯 Target |
| Availability | 99.5%+ | 🎯 Target |
| Test Coverage | >90% | 🎯 Target |

## 🗂️ Project Structure

```
├── docs/                 # Business requirements and specifications
├── database/            # Supabase migrations and schemas
├── backend/             # Edge Functions and API logic
├── frontend/            # React application
├── tests/               # E2E and integration tests
└── infrastructure/      # DevOps and deployment configs
```

## 🔗 Project Links

- **GitHub**: https://github.com/SAMMACKIN/Supply-Chain-App
- **Supabase**: https://supabase.com/dashboard/project/brixbdbunhwlhuwunqxw
- **Timeline**: Q2-2026 cutover from E2open

## 📝 Documentation

Detailed implementation documentation is available in the `/docs` folder:

- [Data Model](docs/Data%20model.md) - Core entity-relationship design
- [Implementation Blueprint](docs/Claude.MD) - Technical architecture overview
- [Call Off Build](docs/Call%20Off%20Build.md) - Drop 1 specifications
- [Transport Order Build](docs/Transport%20Order%20Build.md) - Drop 2 specifications
- [Inventory Lot Build](docs/Inventory%20lot%20build.md) - Drop 3 specifications
- [TODO](docs/TODO.md) - Complete implementation roadmap

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Git
- Supabase CLI
- Docker (for local development)

### Development Setup
```bash
# Clone the repository
git clone https://github.com/SAMMACKIN/Supply-Chain-App.git
cd Supply-Chain-App

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Database Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref brixbdbunhwlhuwunqxw

# Run migrations
supabase db push
```

## 🤝 Contributing

1. Create a feature branch from `main`
2. Implement changes following the coding standards
3. Write tests for new functionality
4. Submit a pull request for review

## 📄 License

This project is proprietary and confidential.

---

*Prepared July 12 2025 - Supply Chain Technology Team*