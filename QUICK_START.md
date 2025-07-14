# Quick Start Guide - Fix Production Now & Set Up Pipeline

## 🚨 Immediate Fix for Production (5 minutes)

While we set up the proper pipeline, let's get production working:

### Option 1: Use the Migration File
1. Go to: https://supabase.com/dashboard/project/brixbdbunhwlhuwunqxw/sql
2. Copy contents of: `supabase/migrations/20250114120000_sync_production_schema.sql`
3. Paste and run in SQL Editor
4. Your production app should now work!

### Option 2: Temporarily Use Mock Data
1. Go to Vercel Dashboard
2. Set `VITE_DEV_MODE = true` for production
3. Redeploy
4. App will use mock data (no database needed)

## 🎯 Set Up Proper Pipeline (30 minutes)

### Step 1: Install Supabase CLI
```bash
# In Terminal:
brew install supabase/tap/supabase
```

### Step 2: Run Setup Script
```bash
# In your project directory:
./scripts/setup-local-supabase.sh
```

This script will:
- ✅ Check installations
- ✅ Login to Supabase
- ✅ Link to your dev project
- ✅ Pull current schema
- ✅ Create branch structure
- ✅ Start local Supabase

### Step 3: Configure Your Workflow

After setup, your workflow will be:

```
1. Make changes locally → 2. Test with local Supabase → 3. Push to develop → 4. Auto-deploy to dev → 5. PR to main → 6. Auto-deploy to prod
```

### Step 4: First Migration Test

```bash
# Create a test migration
supabase migration new test_pipeline

# Add a simple change to the file
echo "-- Test migration" >> supabase/migrations/*test_pipeline.sql

# Commit and push to develop
git add .
git commit -m "Test pipeline"
git push origin develop

# Watch GitHub Actions deploy it
```

## 📋 Your New Development Workflow

### For Database Changes:
```bash
# 1. Create migration
supabase migration new add_new_table

# 2. Edit the .sql file

# 3. Test locally
supabase db reset

# 4. Push to develop
git push origin develop
```

### For Code Changes:
```bash
# 1. Make changes
# 2. Test locally
npm run dev

# 3. Push to develop
git push origin develop

# 4. Create PR to main when ready
```

## 🔄 Branching Strategy

- **main** → Production (auto-deploys)
- **develop** → Development (auto-deploys)
- **feature/** → Your work branches

## 🛠️ Useful Commands

```bash
# See local Supabase info
supabase status

# Create migration
supabase migration new <name>

# Reset local database
supabase db reset

# See what will deploy
supabase migration list

# Stop local Supabase
supabase stop
```

## ❓ Common Issues

**"Command not found: supabase"**
- Run: `brew install supabase/tap/supabase`

**"Not linked to a project"**
- Run: `supabase link --project-ref pxwtdaqhwzweedflwora`

**"Port already in use"**
- Run: `supabase stop` then `supabase start`

## 🎉 Success Checklist

- [ ] Production app is working
- [ ] Supabase CLI installed
- [ ] Local development environment running
- [ ] First test migration deployed
- [ ] Team knows the new workflow

---

**Need help?** Check `/docs/COMPLETE_CICD_SETUP.md` for detailed instructions.