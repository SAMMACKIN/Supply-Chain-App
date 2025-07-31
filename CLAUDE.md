# Supply Chain App - Development Guide

## Current Architecture
- **Frontend**: React/Vite → Vercel
- **Backend**: Express/TypeScript → Railway  
- **Database**: PostgreSQL → Railway
- **Auth**: MockAuth (transitioning to Clerk)

## Quick Commands
```bash
# Backend development
cd backend && npm run dev

# Frontend development  
cd frontend && npm run dev

# Database migrations
cd backend && npx prisma migrate dev

# Push changes
git add -A && git commit -m "message" && git push origin develop

# Test backend health
curl https://supply-chain-app-development.up.railway.app/health
```

## Environment Variables
### Railway Backend
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - development/production
- `FRONTEND_URL` - CORS origin for frontend

### Vercel Frontend
- `VITE_API_URL` - Backend API URL (https://supply-chain-app-development.up.railway.app)

## Database Schema Overview
The app tracks refined metals through the supply chain:
- **Quotas**: Monthly metal allocations from suppliers/customers
- **Call-offs**: Orders against quotas (status: NEW → CONFIRMED → FULFILLED/CANCELLED)
- **Shipment Lines**: Individual deliveries within a call-off
- **Counterparties**: Trading partners (suppliers/customers)

Key relationships:
- Quotas → Call-offs (one-to-many)
- Call-offs → Shipment Lines (one-to-many)
- All entities track quantities in metric tonnes

## API Endpoints
### Core Resources
- `GET /health` - Health check
- `GET /api/quotas` - List quotas with balances
- `GET /api/quotas/:id` - Get single quota
- `GET /api/quotas/:id/balance` - Get quota balance details
- `GET /api/call-offs` - List call-offs
- `GET /api/call-offs/:id` - Get call-off details
- `POST /api/call-offs` - Create call-off
- `PATCH /api/call-offs/:id` - Update call-off
- `POST /api/call-offs/:id/confirm` - Confirm call-off
- `POST /api/call-offs/:id/cancel` - Cancel call-off
- `GET /api/call-offs/:id/shipment-lines` - List shipment lines
- `POST /api/call-offs/:id/shipment-lines` - Create shipment line
- `GET /api/counterparties` - List counterparties

### Request/Response Examples
```javascript
// Create Call-off
POST /api/call-offs
{
  "quota_id": "uuid",
  "quantity": 100,
  "delivery_date": "2025-08-15",
  "notes": "Urgent delivery"
}

// Response includes quota details
{
  "id": "uuid",
  "call_off_number": "CO-2025-1234",
  "status": "NEW",
  "quota": { /* full quota object */ }
}
```

## Development Workflow

### 1. Local Setup
```bash
# Clone and install
git clone <repo>
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Update with actual values

# Start both services
npm run dev (in both directories)
```

### 2. Making Changes
- Backend changes auto-reload with nodemon
- Frontend uses Vite HMR for instant updates
- Database changes require new migration

### 3. Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# E2E tests (when implemented)
npm run test:e2e
```

### 4. Deployment
- Push to `develop` branch
- Railway auto-deploys backend
- Vercel auto-deploys frontend
- Check deployment status in respective dashboards

## Common Development Tasks

### Add New API Endpoint
1. Add route in `backend/src/api/routes/`
2. Add service logic in `backend/src/services/`
3. Update TypeScript types in `backend/src/models/`
4. Test with curl or Postman
5. Update frontend API client

### Add Database Field
1. Update Prisma schema
2. Create migration: `npx prisma migrate dev`
3. Update TypeScript interfaces
4. Update API validation
5. Test data flow end-to-end

### Debug Production Issues
1. Check Railway logs: `railway logs`
2. Check Vercel function logs
3. Test API directly: `curl https://supply-chain-app-development.up.railway.app/api/...`
4. Check browser console for frontend errors

## Next Priority: Clerk Authentication
1. Create Clerk account and project
2. Install packages:
   ```bash
   cd backend && npm install @clerk/clerk-sdk-node
   cd frontend && npm install @clerk/react
   ```
3. Replace MockAuth with ClerkProvider
4. Update middleware to validate Clerk sessions
5. Sync Clerk users to user_profiles table
6. Map roles: OPS, TRADE, PLANNER

## Known Issues & Workarounds
1. **Mock Authentication**: All actions use dev user (00000000-0000-0000-0000-000000000000)
   - Workaround: Acceptable for development, must fix before production

2. **Over-allocated Quotas**: Some test data has negative availability
   - Example: "Global Metals Ltd - AL" shows -3504 available
   - Workaround: Use quotas with positive availability for testing

3. **Call-off Numbers**: Using random 4-digit suffix
   - Format: CO-YYYY-NNNN (e.g., CO-2025-1234)
   - TODO: Implement sequential numbering for production

4. **CORS in Development**: Frontend on :5173, backend on :3001
   - Handled by CORS middleware, no action needed

## Performance Considerations
- Database queries use Prisma's query optimization
- Frontend uses React Query for caching (when implemented)
- Consider pagination for large datasets
- Monitor Railway metrics for scaling needs

## Security Notes
- All endpoints require authentication (currently mocked)
- Implement rate limiting before production
- Validate all inputs with Zod schemas
- Use parameterized queries (Prisma handles this)
- Store secrets in environment variables only

---

# Claude Code Sub-Agent System

## The Six Agents
1. **Project Manager (PM)** - Orchestrates tasks and coordination
2. **Architect** - Designs technical solutions
3. **File System Manager** - Maintains project organization  
4. **Implementation** - Writes production code
5. **Quality Assurance (QA)** - Reviews code and tracks debt
6. **Documentation** - Keeps docs current

## Quick Agent Commands

### Starting a Feature
```
@PM analyze this requirement: "Add user authentication"
@Architect design the authentication system
@Implementation implement the login endpoint
@QA review the implementation
@Documentation update the API docs
```

### Daily Operations
```
@PM status update on current tasks
@QA perform code health check
@FileSystemManager verify project structure
```

## Key Principles
- **No Shortcuts** - Every change follows the process
- **Clear Ownership** - Each agent owns their domain
- **Quality Gates** - QA must approve all code
- **Track Everything** - All work visible in TASKS.md

## Agent Workflow
1. PM creates tasks from requirements
2. Architect designs the solution
3. Implementation writes the code
4. QA reviews and approves
5. Documentation updates guides

Remember: The PM is your coordinator. When in doubt, ask them.

---

## Additional Resources
- [Business Blueprint](Docs/Claude.MD) - Original implementation blueprint
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed file organization
- [Business Process Docs](Docs/) - Call-off, inventory, and transport specifications