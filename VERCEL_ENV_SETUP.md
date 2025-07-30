# Vercel Environment Variables Setup

## Quick Setup

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables for all environments (Production, Preview, Development):

```
VITE_API_URL=https://supply-chain-app-development.up.railway.app/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bGVhZGluZy1kb2ctNTYuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_DEV_MODE=true
```

## Important: Clerk Authentication

The `VITE_CLERK_PUBLISHABLE_KEY` is **required** for the app to load. Without it, you'll see:
```
Uncaught Error: Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env file.
```

## After Adding Variables

1. Trigger a redeploy from Vercel dashboard
2. Or push any change to the develop branch

## Testing

Once deployed, the frontend will automatically use the Railway backend when `VITE_API_URL` is set.
The `lib/api.ts` file handles the routing between Supabase and Railway.