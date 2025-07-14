# Git Workflow & Branching Strategy

This document outlines the Git branching strategy and deployment workflow for the Supply Chain Logistics App.

## 🌳 Branch Structure

### Main Branches

#### `main` (Production)
- **Purpose**: Production-ready code
- **Deployment**: Automatically deploys to production Supabase
- **Protection**: Requires pull request reviews
- **Database**: https://brixbdbunhwlhuwunqxw.supabase.co

#### `develop` (Development)
- **Purpose**: Integration branch for features
- **Deployment**: Automatically deploys to development Supabase  
- **Database**: https://pxwtdaqhwzweedflwora.supabase.co
- **Testing**: All features tested here before production

### Supporting Branches

#### `feature/*` (Feature Branches)
- **Purpose**: Individual feature development
- **Naming**: `feature/task-XXX-description`
- **Database**: Use development environment
- **Lifecycle**: Created from `develop`, merged back to `develop`

#### `hotfix/*` (Emergency Fixes)
- **Purpose**: Critical production fixes
- **Naming**: `hotfix/issue-description`
- **Database**: Test in development, deploy to production
- **Lifecycle**: Created from `main`, merged to both `main` and `develop`

## 🔄 Development Workflow

### 1. Daily Development
```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/task-008-row-level-security

# Switch to development environment
./scripts/switch-env.sh development

# Make changes, test, commit
git add .
git commit -m "Implement RLS policies"

# Push feature branch
git push origin feature/task-008-row-level-security
```

### 2. Feature Integration
```bash
# Create pull request: feature/xxx → develop
# After review and approval, merge to develop
git checkout develop
git pull origin develop

# Test integrated features in development environment
./scripts/switch-env.sh development
npm test
```

### 3. Production Deployment
```bash
# Create release pull request: develop → main
# After thorough testing and approval:
git checkout main
git pull origin main

# Switch to production environment  
./scripts/switch-env.sh production

# Deploy to production
npm run build
npm run deploy
```

## 📋 Branch-Environment Mapping

| Git Branch | Supabase Environment | Purpose | Auto-Deploy |
|------------|---------------------|---------|-------------|
| `main` | Production (`brixb...`) | Live application | ✅ On merge |
| `develop` | Development (`pxwtd...`) | Feature integration | ✅ On push |
| `feature/*` | Development (`pxwtd...`) | Feature development | ❌ Manual |
| `hotfix/*` | Development → Production | Emergency fixes | ❌ Manual |

## 🚀 Environment Switching Best Practices

### Match Branch to Environment
```bash
# Working on develop branch? Use development environment
git checkout develop
./scripts/switch-env.sh development

# Working on main branch? Use production environment
git checkout main
./scripts/switch-env.sh production
```

### Feature Development
```bash
# Always start features in development
git checkout develop
git checkout -b feature/new-feature
./scripts/switch-env.sh development
```

### Pre-Deployment Checklist
```bash
# Before merging to main:
1. All tests passing in development
2. Database migrations tested
3. Environment variables updated
4. Documentation updated
5. Team review completed
```

## 🛡️ Protection Rules

### Main Branch Protection
- ✅ Require pull request reviews (minimum 1)
- ✅ Require status checks to pass
- ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require branches to be up to date before merging

### Development Branch
- ✅ Allow direct pushes for team members
- ✅ Automatic deployment to development environment
- ✅ All feature branches merge here first

## 📦 Deployment Pipeline

### Development Deployment (Automatic)
```yaml
# On push to develop:
1. Run tests
2. Build application
3. Deploy to development Supabase
4. Run integration tests
5. Notify team
```

### Production Deployment (Manual)
```yaml
# On merge to main:
1. Create release tag
2. Run full test suite
3. Build production assets
4. Deploy to production Supabase
5. Run smoke tests
6. Monitor for issues
```

## 🔧 Common Commands

### Environment Management
```bash
# Check current environment
./scripts/switch-env.sh status

# Development work
git checkout develop
./scripts/switch-env.sh development

# Production deployment
git checkout main
./scripts/switch-env.sh production
```

### Database Migrations
```bash
# Test migrations in development
./scripts/switch-env.sh development
npx supabase db push

# Apply to production (after testing)
./scripts/switch-env.sh production
npx supabase db push
```

### Feature Development
```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/task-XXX-description
./scripts/switch-env.sh development

# Finish feature
git add .
git commit -m "Complete feature implementation"
git push origin feature/task-XXX-description
# Create PR to develop branch
```

## 🐛 Hotfix Process

### Emergency Production Fix
```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# Test in development first
./scripts/switch-env.sh development
# Make and test fix

# Deploy to production
./scripts/switch-env.sh production
# Apply fix

# Merge to both main and develop
git checkout main
git merge hotfix/critical-issue
git push origin main

git checkout develop  
git merge hotfix/critical-issue
git push origin develop
```

## 📊 Current Setup Status

- ✅ **Main branch**: Connected to production environment
- ✅ **Develop branch**: Connected to development environment
- ✅ **Environment switcher**: Ready for use
- ✅ **Database schemas**: Synced across environments
- ⏳ **CI/CD pipeline**: To be configured
- ⏳ **Branch protection**: To be enabled

---

*Git workflow established: July 12, 2025*