# Manual Deployment Instructions

Since the workflow only triggers on changes to `supabase/**` files, you need to manually trigger it:

## Option 1: GitHub Actions UI (Recommended)
1. Go to: https://github.com/SAMMACKIN/Supply-Chain-App/actions
2. Click on "Deploy Supabase Changes" workflow
3. Click "Run workflow" button
4. Select:
   - Branch: `main` for production or `develop` for development
   - Environment: Choose the matching environment
5. Click "Run workflow"

## Option 2: Make a Small Change
Create a small change in a supabase file to trigger the workflow:

```bash
# For development deployment (from develop branch)
echo "# Trigger deployment" >> supabase/functions/calloff-crud/README.md
git add supabase/functions/calloff-crud/README.md
git commit -m "Trigger deployment"
git push origin develop

# For production deployment (from main branch)
git checkout main
git pull origin main
echo "# Trigger deployment" >> supabase/functions/calloff-crud/README.md
git add supabase/functions/calloff-crud/README.md
git commit -m "Trigger deployment"
git push origin main
```

## What Could Be Wrong If It Still Fails:

1. **Secret Names**: Verify the secret names match exactly (case-sensitive):
   - SUPABASE_ACCESS_TOKEN
   - SUPABASE_PROJECT_REF
   - SUPABASE_DB_PASSWORD
   - SUPABASE_DEV_PROJECT_REF
   - SUPABASE_DEV_DB_PASSWORD

2. **Access Token**: The Supabase access token might be expired or invalid
   - Get a new one from: https://app.supabase.com/account/tokens

3. **Project References**: Verify the project IDs are correct:
   - Production: brixbdbunhwlhuwunqxw
   - Development: pxwtdaqhwzweedflwora

4. **Check Logs**: Look at the specific error in the GitHub Actions log to see what's failing