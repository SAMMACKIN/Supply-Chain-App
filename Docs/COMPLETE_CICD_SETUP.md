# Complete CI/CD Pipeline Setup for Supabase

This guide will help you set up a professional development workflow where:
- All database changes are version controlled
- Changes are tested in development before production
- Deployments are automatic and reliable
- You can easily rollback if needed

## Prerequisites

1. Homebrew installed (for macOS)
2. Node.js installed
3. Git repository (already done ✓)

## Step 1: Install Supabase CLI

Open Terminal and run:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

## Step 2: Initialize Supabase Locally

In your project directory:

```bash
cd "/Users/sammackin/Desktop/Claude Code Apps/Supply Chain app"

# Login to Supabase
supabase login

# Link to your development project
supabase link --project-ref pxwtdaqhwzweedflwora

# Pull the current development schema
supabase db pull

# This creates a migration file with your current schema
```

## Step 3: Set Up Database Migrations

```bash
# Create a baseline migration from current dev schema
supabase migration new initial_schema

# This creates a file like: supabase/migrations/20250114120000_initial_schema.sql
```

## Step 4: Configure Git Branching

```bash
# Create development branch
git checkout -b develop

# This will be your main working branch
```

## Step 5: Update GitHub Actions Workflow

The workflow is already created, but let's enhance it for the full pipeline.

## Step 6: Local Development Workflow

### Starting Local Development:

```bash
# Start local Supabase
supabase start

# This gives you:
# - Local PostgreSQL database
# - Local Auth server
# - Local Storage
# - Local Edge Functions
```

### Making Database Changes:

```bash
# 1. Create a new migration
supabase migration new add_new_feature

# 2. Edit the migration file in supabase/migrations/

# 3. Apply migration locally
supabase db reset

# 4. Test your changes
```

### Deploying to Development:

```bash
# Push to development branch
git add .
git commit -m "Add new feature"
git push origin develop

# GitHub Actions will deploy to dev Supabase
```

### Deploying to Production:

```bash
# Create pull request
git checkout main
git pull origin main
git merge develop
git push origin main

# GitHub Actions will deploy to production
```

## Step 7: Environment Configuration

### Local Development (.env.local):
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=[local-anon-key-from-supabase-start]
VITE_DEV_MODE=false
```

### Development (.env.development):
```
VITE_SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co
VITE_SUPABASE_ANON_KEY=[dev-anon-key]
VITE_DEV_MODE=false
```

### Production (.env.production):
```
VITE_SUPABASE_URL=https://brixbdbunhwlhuwunqxw.supabase.co
VITE_SUPABASE_ANON_KEY=[prod-anon-key]
VITE_DEV_MODE=false
```

## Step 8: Migration Best Practices

### DO:
- Always create migrations for schema changes
- Test migrations locally first
- Use descriptive migration names
- Make migrations idempotent (safe to run multiple times)
- Review migrations in pull requests

### DON'T:
- Never edit existing migrations
- Don't make manual changes to production
- Don't skip the development environment

## Step 9: Rollback Strategy

If something goes wrong:

```bash
# Create a rollback migration
supabase migration new rollback_feature_x

# Write the inverse of your changes
# Deploy through normal pipeline
```

## Step 10: Team Workflow

1. **Developer creates feature branch**:
   ```bash
   git checkout -b feature/new-inventory-tracking
   ```

2. **Make changes and create migrations**:
   ```bash
   supabase migration new add_inventory_tables
   ```

3. **Test locally**:
   ```bash
   supabase db reset
   npm run dev
   ```

4. **Push to feature branch**:
   ```bash
   git push origin feature/new-inventory-tracking
   ```

5. **Create PR to develop branch**
   - Review changes
   - Check migration files
   - Approve and merge

6. **Auto-deploy to development**
   - Test in development environment

7. **Create PR to main branch**
   - Final review
   - Merge to deploy to production

## Common Commands Reference

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Create new migration
supabase migration new <name>

# Apply migrations locally
supabase db reset

# See migration status
supabase migration list

# Push to remote
supabase db push

# Pull from remote
supabase db pull

# See diff between local and remote
supabase db diff
```

## Troubleshooting

### "Migration already exists"
- Migrations are tracked in the database
- Use `supabase migration repair` if needed

### "Permission denied"
- Check your access token
- Ensure you're linked to the right project

### "Conflicts with remote"
- Pull latest changes first
- Resolve conflicts in migration files

## Next Steps

1. Install Supabase CLI
2. Run initial setup commands
3. Test the workflow with a small change
4. Document any project-specific steps