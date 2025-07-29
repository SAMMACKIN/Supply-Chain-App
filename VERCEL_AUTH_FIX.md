# Fixing Authentication on Vercel

## Current Issue
The Supabase project appears to be down or deleted, causing authentication to fail with DNS errors.

## Temporary Solution: Enable Dev Mode

### 1. Add/Update these environment variables in Vercel:

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add or update these for **Preview** environment:

```
VITE_DEV_MODE=true
VITE_API_URL=https://supply-chain-app-development.up.railway.app/api
```

### 2. What this does:
- Enables the MockAuthProvider which bypasses Supabase
- Accepts any email/password combination
- Creates a mock admin user for testing
- Points API calls to your Railway backend

### 3. To test:
1. Trigger a new deployment (push any change or redeploy from Vercel dashboard)
2. Go to your Vercel preview URL
3. Login with any email/password (e.g., test@example.com / password123)
4. You should be logged in as a development user

## Permanent Solution (Later)
Once ready to implement real authentication:
1. Set up Clerk authentication (already installed in backend)
2. Remove VITE_DEV_MODE or set it to false
3. Update AuthProvider to use Clerk instead of Supabase

## Note
This is a temporary solution to unblock development while migrating away from Supabase.