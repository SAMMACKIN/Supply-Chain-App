# Fix Vercel Deployment for Develop Branch

## Quick Fix

1. Go to your Vercel project dashboard
2. Go to Settings → Git
3. Make sure both branches are configured:
   - **Production Branch**: `main`
   - **Preview Branches**: Include `develop`

## Environment Variables

Make sure these are set in Vercel for both Production and Preview environments:

### Production (main branch):
```
VITE_SUPABASE_URL=https://brixbdbunhwlhuwunqxw.supabase.co
VITE_SUPABASE_ANON_KEY=[your-prod-anon-key]
VITE_DEV_MODE=false
```

### Preview (develop branch):
```
VITE_SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co
VITE_SUPABASE_ANON_KEY=[your-dev-anon-key]
VITE_DEV_MODE=false
```

## Root Directory Setting

In Vercel project settings:
1. Go to Settings → General
2. Set **Root Directory** to: `frontend`
3. Keep **Framework Preset** as: Vite

## Manual Trigger

If deployment doesn't trigger automatically:
1. Go to Vercel dashboard
2. Click "Redeploy"
3. Select the branch you want to deploy

## Vercel CLI (Optional)

You can also deploy manually:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy develop branch
vercel --prod=false

# Deploy main branch
vercel --prod
```