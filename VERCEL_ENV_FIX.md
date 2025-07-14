# Fix Vercel Environment Variables

## The Problem
Both dev and prod are using the production Supabase URL (brixbdbunhwlhuwunqxw)

## Solution

### 1. Go to Vercel Dashboard
https://vercel.com/[your-username]/[your-project]/settings/environment-variables

### 2. Delete Existing Variables
Remove all VITE_SUPABASE_* variables

### 3. Add Environment-Specific Variables

#### For Production Only (main branch):
Click "Add Variable" and set:
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://brixbdbunhwlhuwunqxw.supabase.co`
- **Environment**: ✅ Production only

- **Key**: `VITE_SUPABASE_ANON_KEY`  
- **Value**: Your production anon key
- **Environment**: ✅ Production only

- **Key**: `VITE_DEV_MODE`
- **Value**: `false`
- **Environment**: ✅ Production only

#### For Preview Only (develop branch):
Click "Add Variable" and set:
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://pxwtdaqhwzweedflwora.supabase.co`
- **Environment**: ✅ Preview only

- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: Your development anon key
- **Environment**: ✅ Preview only  

- **Key**: `VITE_DEV_MODE`
- **Value**: `false`
- **Environment**: ✅ Preview only

### 4. Redeploy Both Branches

After setting variables:
1. Go to Deployments tab
2. Find your develop branch deployment
3. Click "..." → "Redeploy"
4. Do the same for main branch

### 5. Get Your Anon Keys

If you don't have the anon keys:

**Development**: 
```bash
curl https://pxwtdaqhwzweedflwora.supabase.co/rest/v1/ 2>&1 | grep -o 'anon.*'
```

**Production**:
```bash
curl https://brixbdbunhwlhuwunqxw.supabase.co/rest/v1/ 2>&1 | grep -o 'anon.*'
```

Or check your Supabase dashboard:
- Go to Settings → API
- Copy the "anon public" key

### 6. Verify After Deployment

Dev should show:
```
Supabase URL from env: https://pxwtdaqhwzweedflwora.supabase.co
```

Prod should show:
```
Supabase URL from env: https://brixbdbunhwlhuwunqxw.supabase.co
```