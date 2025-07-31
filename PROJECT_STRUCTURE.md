# Supply Chain App - Project Structure

## Overview
Clean, production-ready monorepo structure with Railway backend and Vercel frontend.

## Directory Structure

```
supply-chain-app/
├── backend/                    # Express/TypeScript API (Railway)
│   ├── src/
│   │   ├── api/               # API endpoints
│   │   │   ├── middleware/    # Auth, error handling
│   │   │   └── routes/        # REST endpoints
│   │   ├── config/            # App configuration
│   │   ├── models/            # TypeScript interfaces
│   │   ├── services/          # Business logic
│   │   └── utils/             # Shared utilities
│   ├── prisma/                # Database ORM
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Schema migrations
│   ├── package.json           # Backend dependencies
│   └── tsconfig.json          # TypeScript config
│
├── frontend/                   # React/Vite SPA (Vercel)
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── CallOff/       # Call-off management
│   │   │   ├── Quota/         # Quota views
│   │   │   └── Layout/        # App layout
│   │   ├── auth/              # Authentication (MockAuth → Clerk)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # External libraries
│   │   ├── services/          # API client services
│   │   ├── stores/            # State management
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Frontend utilities
│   ├── public/                # Static assets
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Vite configuration
│
├── Docs/                       # Business documentation
│   ├── Call Off Build.md      # Business process docs
│   ├── Data model.md          # Data relationships
│   ├── Inventory lot build.md # Inventory management
│   └── Transport Order Build.md # Transport planning
│
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── CLAUDE.md                  # Development guide & sub-agents
├── README.md                  # Project overview
└── PROJECT_STRUCTURE.md       # This file
```

## Key Technologies

### Backend (Railway)
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Mock (transitioning to Clerk)
- **Deployment**: Railway (auto-deploy from develop branch)

### Frontend (Vercel)
- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand stores
- **Deployment**: Vercel (auto-deploy from develop branch)

## Environment Variables

### Backend (Railway)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - CORS origin for frontend

### Frontend (Vercel)
- `VITE_API_URL` - Backend API URL

## Development Workflow

1. **Local Development**
   ```bash
   # Backend
   cd backend
   npm install
   npm run dev

   # Frontend
   cd frontend
   npm install
   npm run dev
   ```

2. **Database Changes**
   ```bash
   cd backend
   npx prisma migrate dev --name your-migration-name
   ```

3. **Deployment**
   - Push to `develop` branch
   - Railway auto-deploys backend
   - Vercel auto-deploys frontend

## API Structure

### Core Endpoints
- `/api/quotas` - Quota management
- `/api/call-offs` - Call-off orders
- `/api/shipment-lines` - Shipment planning
- `/api/counterparties` - Business partners

### Health & Status
- `/health` - Backend health check
- `/api/status` - API status

## Next Steps
1. Implement Clerk authentication
2. Add Redis caching for performance
3. Set up monitoring (Sentry)
4. Configure production environment