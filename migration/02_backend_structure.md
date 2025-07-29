# Backend API Structure

## Create a new backend directory structure:

```
supply-chain-backend/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── config/
│   │   ├── database.ts        # Database configuration
│   │   └── environment.ts     # Environment variables
│   ├── api/
│   │   ├── routes/
│   │   │   ├── quotas.ts      # Quota endpoints
│   │   │   ├── calloffs.ts    # Call-off endpoints
│   │   │   ├── shipment-lines.ts
│   │   │   └── auth.ts        # Auth endpoints
│   │   └── middleware/
│   │       ├── auth.ts        # Authentication middleware
│   │       ├── cors.ts        # CORS configuration
│   │       └── error.ts       # Error handling
│   ├── services/
│   │   ├── quota.service.ts
│   │   ├── calloff.service.ts
│   │   └── shipment.service.ts
│   ├── db/
│   │   ├── client.ts          # Prisma client
│   │   └── migrations/        # Database migrations
│   └── types/
│       └── index.ts           # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── tests/
├── package.json
├── tsconfig.json
└── .env.example
```

## Initial package.json:

```json
{
  "name": "supply-chain-backend",
  "version": "1.0.0",
  "description": "Supply Chain Management API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "test": "jest"
  },
  "dependencies": {
    "@prisma/client": "^5.19.0",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.2.0",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8",
    "@clerk/backend": "^1.13.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.10",
    "typescript": "^5.5.3",
    "tsx": "^4.16.2",
    "prisma": "^5.19.0",
    "@types/cors": "^2.8.17",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.12"
  }
}
```

## Environment Variables (.env.example):

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname"

# Server
PORT=3001
NODE_ENV=development

# Authentication (Clerk)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# API Keys
API_SECRET_KEY=
```

## TypeScript Configuration (tsconfig.json):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowJs": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Next Steps:
1. Create the backend directory
2. Initialize the project with these files
3. Set up Prisma schema based on exported database
4. Implement core API endpoints