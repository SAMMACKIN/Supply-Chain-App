# Supply Chain Logistics App (CSLA)

Modern supply chain management system for refined metals logistics, handling quotas, call-offs, and shipment planning.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite → Deployed on Vercel
- **Backend**: Express + TypeScript + Prisma → Deployed on Railway
- **Database**: PostgreSQL → Hosted on Railway
- **Auth**: Mock Authentication (Clerk integration pending)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/SAMMACKIN/Supply-Chain-App.git
cd Supply-Chain-App

# Backend setup
cd backend
npm install
cp .env.example .env
# Add DATABASE_URL from Railway
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001
npm run dev
```

Frontend runs at http://localhost:5173
Backend runs at http://localhost:3001

## 📋 Features

### ✅ Implemented
- View quotas with available quantities
- Create call-offs from quotas
- Manage shipment lines
- Track quota balances and allocations

### 🚧 In Progress
- Clerk authentication integration
- Production deployment setup

### 📅 Planned
- Transport order management
- Inventory lot tracking
- Real-time milestone updates
- Certificate management

## 🌐 Deployment

The app auto-deploys from the `develop` branch:
- **Backend**: Railway → https://supply-chain-app-development.up.railway.app
- **Frontend**: Vercel → https://supply-chain-app.vercel.app

## 📁 Project Structure

```
├── backend/          # Express API server
├── frontend/         # React SPA
├── Docs/            # Business documentation
├── CLAUDE.md        # Development guide
└── PROJECT_STRUCTURE.md  # Detailed structure
```

## 🔧 Development

### Database Migrations
```bash
cd backend
npx prisma migrate dev --name your-migration
```

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 🤝 Contributing

1. Create feature branch from `develop`
2. Make changes following existing patterns
3. Test thoroughly
4. Push and create PR to `develop`

## 📝 Documentation

- [Development Guide](CLAUDE.md) - Quick commands and sub-agents
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed file organization
- [Business Docs](Docs/) - Process documentation

---

*Supply Chain Technology Team - July 2025*