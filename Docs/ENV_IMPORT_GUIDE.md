# Environment Variables Import Guide

## Railway Backend

### Method 1: Bulk Import (Recommended)
1. Go to your Railway project
2. Click on your backend service
3. Go to **Variables** tab
4. Click **"Raw Editor"** button (top right)
5. Copy the entire contents of `backend/.env.railway`
6. Paste and click "Update Variables"
7. Railway will automatically deploy with new variables

### Method 2: Connect with Vercel
1. In Railway, go to your service
2. Click **"Connect"** → **"Vercel"**
3. Authorize Railway to access Vercel
4. Select your Vercel project
5. Railway can now share variables with Vercel

### Important Notes:
- `${{Postgres.DATABASE_URL}}` is Railway's syntax to reference your PostgreSQL service
- Railway will automatically replace this with the actual database URL
- Don't forget to update `FRONTEND_URL` with your actual Vercel preview URL

## Vercel Frontend

### Method 1: Import .env File
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **"Import .env"** button
4. Upload `frontend/.env.vercel`
5. Select which environments to apply to (Preview/Production)
6. Click "Import"

### Method 2: Manual Entry
1. Copy each line from `.env.vercel`
2. Add as individual environment variables
3. Make sure to select the correct environment (Preview for develop branch)

## Getting Your Keys

### Clerk Authentication Keys
1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Go to **API Keys** in dashboard
4. Copy:
   - **Publishable Key** → Use in both Railway and Vercel
   - **Secret Key** → Use only in Railway (backend)

### Supabase Keys (already have these)
- Find in your Supabase project settings
- Or check your current Vercel environment variables

## Debugging Connection Issues

### Backend 502 Error
Usually means missing environment variables. Check:
1. All variables are set in Railway
2. DATABASE_URL is properly referenced
3. Deployment logs for specific errors

### CORS Errors
Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly

### Database Connection Failed
- Ensure `${{Postgres.DATABASE_URL}}` syntax is exact
- Check PostgreSQL service is running in Railway

## Quick Test

After importing variables:

1. **Test Backend**:
```bash
curl https://your-railway-url.up.railway.app/health
```

2. **Test Frontend Connection**:
- Open browser console
- Check for successful API calls
- Look for "Using Railway API" logs if USE_NEW_API is true