# Vercel Environment Variables Setup

The production app is failing because Vercel needs the environment variables set in its dashboard, not just in .env files.

## Steps to Fix:

1. **Go to Vercel Dashboard**: https://vercel.com/sammy-mackins-projects/supply-chain-app-frontend/settings/environment-variables

2. **Add these environment variables**:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://brixbdbunhwlhuwunqxw.supabase.co` | Production |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyaXhiZGJ1bmh3bGh1d3VucXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMTgzNjUsImV4cCI6MjA2Nzg5NDM2NX0.8zZcFLt_Y7QJGWepRmccDLD01Ib0owlbBMigVZFMCpQ` | Production |
   | `VITE_DEV_MODE` | `false` | Production |

3. **For Development/Preview deployments**, also add:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://pxwtdaqhwzweedflwora.supabase.co` | Preview & Development |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM` | Preview & Development |
   | `VITE_DEV_MODE` | `true` | Preview & Development |

4. **After adding the variables**, you need to:
   - Click "Save"
   - Redeploy the application (Vercel will prompt you)

## Why .env files don't work in Vercel:

- Vercel ignores `.env.production` files for security reasons
- Environment variables must be set through the Vercel dashboard
- This prevents accidental exposure of secrets in your repository

## Alternative: Use Vercel CLI

If you have Vercel CLI installed:
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_DEV_MODE production
```