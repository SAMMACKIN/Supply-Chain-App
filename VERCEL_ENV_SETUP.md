# Vercel Environment Variables Setup

## Quick Setup

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variable for Preview environment:

```
VITE_API_URL=https://supply-chain-app-development.up.railway.app/api
```

## Keep Existing Variables

Make sure these existing variables remain configured:
- `VITE_SUPABASE_URL` (for hybrid mode during migration)
- `VITE_SUPABASE_ANON_KEY` (for hybrid mode during migration)

## After Adding Variables

1. Trigger a redeploy from Vercel dashboard
2. Or push any change to the develop branch

## Testing

Once deployed, the frontend will automatically use the Railway backend when `VITE_API_URL` is set.
The `lib/api.ts` file handles the routing between Supabase and Railway.