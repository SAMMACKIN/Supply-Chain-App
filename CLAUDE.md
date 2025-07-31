# Supply Chain App Migration Status

## Current Situation (July 2025)
Successfully migrated from Supabase to Railway + Vercel. The app is now running in development with Railway backend and Vercel frontend.

## Architecture
- **Frontend**: React/Vite → Vercel ✅
- **Backend**: Express/TypeScript → Railway ✅ 
- **Database**: PostgreSQL → Railway ✅
- **Auth**: Temporarily disabled (MockAuth) - Next: Clerk

## Completed ✅
1. Database exported from Supabase dev (20 quotas, 10 counterparties)
2. Database imported to Railway PostgreSQL
3. Backend API created with Express/Prisma matching all Edge Functions
4. Railway project deployed successfully
5. Environment variables configured (VITE_API_URL)
6. All Supabase dependencies removed from frontend
7. Fixed all database schema mismatches:
   - Enum type mappings (Direction, CallOffStatus, ShipmentLineStatus)
   - Field name differences (qty_t vs bundle_qty, period_month vs month)
   - Removed non-existent fields (delivery_location, fulfillment_location)
8. Added quota balance endpoint for frontend compatibility
9. Fixed route ordering issues
10. Call-off creation working with proper validation

## Current Status ✅
**Task 039: Supabase to Railway Migration - COMPLETE**
- Railway backend deployed and running
- Vercel frontend connected to Railway API
- All core functionality working:
  - View quotas with available quantities
  - Create call-offs from quotas with capacity
  - View call-off details with quota information
  - Create shipment lines

## Next Steps (Priority Order)

### Phase 1 - Authentication (High Priority)
1. **Set up Clerk Authentication**
   - Create Clerk account and project
   - Install @clerk/clerk-sdk-node and @clerk/react
   - Configure Clerk environment variables
   - Replace MockAuth with ClerkProvider
   - Update backend auth middleware
   - Create user profile sync logic

2. **User Profile Management**
   - Sync Clerk users to user_profiles table
   - Map Clerk metadata to UserRole enum (OPS, TRADE, PLANNER)
   - Set up role-based permissions

### Phase 2 - Data Integrity (Medium Priority)
3. **Set up Prisma Migrations**
   - Initialize Prisma migrations from current schema
   - Create migration for any pending schema changes
   - Document migration process

4. **Data Validation & Constraints**
   - Add proper foreign key constraints
   - Validate business rules (quota limits, date ranges)
   - Add database triggers for audit trails

### Phase 3 - Production Ready (Lower Priority)
5. **Production Environment Setup**
   - Set up Railway production environment
   - Configure production database
   - Set up monitoring (Sentry, LogRocket)
   - Configure backup strategy

6. **Performance Optimization**
   - Add Redis for caching quota balances
   - Implement database query optimization
   - Add API rate limiting
   - Set up CDN for static assets

7. **Clean Up & Documentation**
   - Delete old migration files and unused code
   - Document API endpoints
   - Create deployment guide
   - Set up CI/CD pipeline

## Quick Commands
```bash
# Test backend health
curl https://supply-chain-app-development.up.railway.app/health

# Push changes
git add -A && git commit -m "message" && git push origin develop

# Database connection
postgresql://postgres:osmmuWpxZTqxWPlTXREBLQarlhinzybq@centerbeam.proxy.rlwy.net:18946/railway
```

## Environment Variables Status
- ✅ Railway: Has DATABASE_URL, NODE_ENV, PORT, FRONTEND_URL
- ✅ Vercel: Has VITE_API_URL configured

## Known Issues & Workarounds
1. **Over-allocated Quotas**: Some test quotas have more allocated than available
   - Example: "Global Metals Ltd - AL" has -3504 available
   - Workaround: Use quotas with positive availability
   
2. **Call-off Number Format**: Database constraint expects CO-YYYY-NNNN (4 digits)
   - Current: Random 4-digit number (1000-9999)
   - Consider: Sequential numbering for production

3. **Mock Authentication**: Using UUID 00000000-0000-0000-0000-000000000000
   - All actions attributed to this "dev user"
   - Needs proper user tracking after Clerk integration

## Success Metrics
- [x] Backend health check returns ok
- [x] Quotas load from Railway API
- [x] Can create new call-offs
- [x] Can view/edit call-offs
- [x] All components migrated
- [x] Supabase removed

## API Endpoints
- `GET /health` - Health check
- `GET /api/quotas` - List quotas with balances
- `GET /api/quotas/:id` - Get single quota
- `GET /api/quotas/:id/balance` - Get quota balance details
- `GET /api/quotas/filters/counterparties` - List counterparties with quotas
- `GET /api/call-offs` - List call-offs
- `GET /api/call-offs/:id` - Get call-off details
- `POST /api/call-offs` - Create call-off
- `PATCH /api/call-offs/:id` - Update call-off
- `POST /api/call-offs/:id/confirm` - Confirm call-off
- `POST /api/call-offs/:id/cancel` - Cancel call-off
- `POST /api/call-offs/:id/fulfill` - Fulfill call-off
- `GET /api/call-offs/:id/shipment-lines` - List shipment lines
- `POST /api/call-offs/:id/shipment-lines` - Create shipment line
- `PATCH /api/shipment-lines/:id` - Update shipment line
- `DELETE /api/shipment-lines/:id` - Delete shipment line
- `GET /api/counterparties` - List counterparties

# Claude Code Sub-Agent System Documentation

## Overview
This document outlines the sub-agent system for managing software development projects in Claude Code. The system uses six specialized agents working together to ensure clean code, proper organization, and systematic project execution.

## The Six Agents

1. **Project Manager (PM)** - Orchestrates the entire process
2. **Architect** - Designs technical solutions
3. **File System Manager** - Maintains project organization
4. **Implementation** - Writes the code
5. **Quality Assurance (QA)** - Reviews and tracks technical debt
6. **Documentation** - Keeps all docs current

## 🚀 Starting a New Feature

### Step 1: Requirement Analysis
```
@PM analyze this requirement: "Add user authentication with email/password"
```
The PM will:
- Ask clarifying questions
- Break down into specific tasks
- Create TASKS.md with all work items
- Define acceptance criteria

### Step 2: Architecture Design
```
@Architect please complete ARCH-001: Design authentication architecture
```
The Architect will:
- Choose appropriate patterns and technologies
- Define API contracts
- Create system design
- Document decisions in ADRs (Architecture Decision Records)

### Step 3: File Structure Setup
```
@FileSystemManager review the architecture and ensure our file structure supports it
```
File System Manager will:
- Create necessary directories
- Update PROJECT_STRUCTURE.md
- Define where each component belongs

### Step 4: Implementation
```
@Implementation please implement IMPL-001: Create user registration endpoint
```
Implementation will:
- Write code following the architecture
- Create unit tests
- Follow established patterns
- Request file locations from File System Manager if unclear

### Step 5: Quality Review
```
@QA please review IMPL-001 for completion
```
QA will:
- Run code locally
- Check against acceptance criteria
- Test edge cases
- Review code quality
- Update TECH_DEBT.md if issues found
- Either approve or request changes

### Step 6: Documentation
```
@Documentation please complete DOC-001: Document authentication API
```
Documentation will:
- Update README.md
- Document API endpoints
- Update any affected guides
- Ensure code comments are clear

## 📋 Task Management Process

### Task Format
Every task follows this structure:
```
IMPL-001: Create user registration endpoint
Assigned to: Implementation
Dependencies: ARCH-001
Status: In Progress
Acceptance Criteria:
- [ ] POST /api/auth/register implemented
- [ ] Input validation working
- [ ] Returns appropriate status codes
```

### Task Lifecycle
1. **Not Started** → PM creates task
2. **In Progress** → Agent actively working
3. **In Review** → QA reviewing
4. **Blocked** → Waiting on dependency
5. **Complete** → QA approved, criteria met

### Daily Workflow
```
@PM what's the status of all in-progress tasks?
```
PM will review TASKS.md and coordinate next steps.

## 🔄 Handling Changes and Iterations

### When QA Requests Changes
```
QA: "IMPL-001 needs changes: missing rate limiting"
PM: "@Implementation please address QA feedback on IMPL-001"
```

### When Requirements Change
```
@PM the authentication now needs to support OAuth too
```
PM will:
- Create new tasks
- Update dependencies
- Communicate impact

## 🛠️ Refactoring Process

### Regular Health Checks
```
@QA please perform weekly codebase health check
```
QA maintains TECH_DEBT.md and identifies issues.

### Scheduling Refactoring
```
@PM can we prioritize REFACTOR-001 next sprint?
```
PM balances feature work with technical debt reduction.

### Refactoring Workflow
1. QA identifies and documents need
2. PM creates refactoring task
3. Architect designs approach (if structural)
4. Implementation executes
5. QA verifies improvement

## 📁 Key Files Maintained

### TASKS.md
Maintained by PM - tracks all work items
```markdown
## In Progress
- [IMPL-001] Create user registration endpoint

## Completed
- [ARCH-001] Design authentication architecture ✓
```

### PROJECT_STRUCTURE.md
Maintained by File System Manager
```markdown
/src
  /features
    /auth         # Authentication feature
      /services   # Business logic
      /api        # Endpoints
```

### TECH_DEBT.md
Maintained by QA - tracks refactoring needs
```markdown
## High Priority
- [REFACTOR-001] Extract auth logic from controller
```

## 🎯 Best Practices

### Clear Communication
Always reference task IDs:
- ❌ "Can you implement the login?"
- ✅ "@Implementation please implement IMPL-002: Create login endpoint"

### Wait for Dependencies
Don't skip ahead:
- ❌ Starting IMPL-002 before ARCH-001 is complete
- ✅ "@PM is ARCH-001 complete so we can start IMPL-002?"

### Complete Review Cycles
Every implementation needs QA approval:
```
Implementation: "IMPL-001 complete"
You: "@QA please review IMPL-001"
QA: "Approved with minor suggestions"
You: "@PM IMPL-001 is complete, moving to documentation"
```

### Track Everything
No work happens outside the task system:
- ❌ "Quick fix" without a task
- ✅ "@PM need to fix login bug, should I create FIX-001?"

## 🚨 Common Scenarios

### Blocked Task
```
Implementation: "Can't complete IMPL-003, need API keys"
You: "@PM IMPL-003 is blocked on configuration"
PM: "Creating CONFIG-001: Setup API keys. @Architect please define approach"
```

### Finding Bugs During QA
```
QA: "Found bug in IMPL-001: passwords not hashed"
You: "@PM QA found critical issue in IMPL-001"
PM: "Marked as blocked. @Implementation please fix before proceeding"
```

### Scope Creep
```
You: "Client wants to add social login too"
@PM: "That's new scope. Creating ARCH-004: Design social login. This will impact timeline."
```

## 💡 Quick Reference

### Starting Fresh
```
@PM analyze requirement: [description]
@PM what tasks were created?
@Architect please start ARCH-001
```

### Checking Progress
```
@PM status update on current sprint
@QA any blockers in review?
@PM show me TASKS.md
```

### Code Quality
```
@QA review the ErrorHandler implementation
@QA what's our current tech debt priority?
@FileSystemManager is our structure still clean?
```

### Finishing Features
```
@QA please review all tasks for [feature]
@Documentation ensure all docs updated
@PM can we mark [feature] complete?
```

## 🔑 Key Principles

1. **No Shortcuts** - Every change goes through the process
2. **Clear Ownership** - Each agent owns their domain
3. **Quality Gates** - QA must approve all code
4. **Documentation First** - Update docs with code
5. **Track Everything** - All work visible in TASKS.md
6. **Proactive Refactoring** - Address debt before it compounds

## Remember

- The PM is your main coordinator - when in doubt, ask them
- QA has final say on code quality
- Architect decisions guide everyone else
- File System Manager keeps things organized
- Documentation happens continuously, not at the end

This system ensures high-quality, maintainable software through clear processes and specialized expertise. Trust the process and let each agent excel in their domain.