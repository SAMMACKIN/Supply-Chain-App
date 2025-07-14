# GitHub Actions Deployment Troubleshooting Guide

## Why the Deployments Failed

Both dev and prod deployments failed because GitHub Actions doesn't have the required secrets configured.

## Required GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

### Common Secret (used by both environments):
- `SUPABASE_ACCESS_TOKEN`: `sbp_5a1f7de7fceb5aa749a5f047c56ff91adb0329d4`

### Production Secrets:
- `SUPABASE_PROJECT_REF`: `brixbdbunhwlhuwunqxw`
- `SUPABASE_DB_PASSWORD`: `8TG8DYmSWNf88bGh`

### Development Secrets:
- `SUPABASE_DEV_PROJECT_REF`: `pxwtdaqhwzweedflwora`
- `SUPABASE_DEV_DB_PASSWORD`: `dP9hFIx5hE9r7HrD`

## How to Add GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the exact name and value listed above

## Testing the Deployment

### Local Testing (Recommended First)

1. Install Supabase CLI:
   ```bash
   # On macOS
   brew install supabase/tap/supabase
   
   # On other systems, see: https://supabase.com/docs/guides/cli
   ```

2. Run the setup script:
   ```bash
   ./setup-local-dev.sh
   ```

3. Test deployment locally:
   ```bash
   ./test-deployment.sh
   ```

### GitHub Actions Testing

After adding all secrets:

1. Go to the "Actions" tab in your GitHub repository
2. Find the failed workflow runs
3. Click "Re-run all jobs" to retry with the new secrets

## Common Issues and Solutions

### Issue: "Error linking to project"
**Solution**: Verify `SUPABASE_ACCESS_TOKEN` is correct and has access to both projects

### Issue: "Database password incorrect"
**Solution**: Double-check the `SUPABASE_DB_PASSWORD` or `SUPABASE_DEV_DB_PASSWORD` values

### Issue: "Project not found"
**Solution**: Verify the project reference IDs are correct:
- Dev: `pxwtdaqhwzweedflwora`
- Prod: `brixbdbunhwlhuwunqxw`

### Issue: "Edge Function deployment failed"
**Solution**: The Edge Functions use Deno imports, which should work automatically. If it fails:
1. Check the function logs in Supabase dashboard
2. Verify all TypeScript files compile without errors

## Manual Deployment Alternative

If GitHub Actions continues to fail, you can deploy manually:

```bash
# For development
export SUPABASE_ACCESS_TOKEN=sbp_5a1f7de7fceb5aa749a5f047c56ff91adb0329d4
supabase link --project-ref pxwtdaqhwzweedflwora
supabase db push --password dP9hFIx5hE9r7HrD
supabase functions deploy calloff-crud --project-ref pxwtdaqhwzweedflwora

# For production
supabase link --project-ref brixbdbunhwlhuwunqxw
supabase db push --password 8TG8DYmSWNf88bGh
supabase functions deploy calloff-crud --project-ref brixbdbunhwlhuwunqxw
```

## Verifying Deployment Success

After successful deployment:

1. Check Supabase Dashboard:
   - Go to your project dashboard
   - Check "Database" → "Migrations" to see applied migrations
   - Check "Edge Functions" to see deployed functions

2. Test the Edge Function:
   ```bash
   # Get quotas (should return data)
   curl https://[PROJECT_REF].supabase.co/functions/v1/calloff-crud/quotas \
     -H "Authorization: Bearer [YOUR_ANON_KEY]"
   ```

## Getting Help

If you continue to experience issues:
1. Check the GitHub Actions logs for specific error messages
2. Check Supabase dashboard logs
3. Verify all environment variables and secrets are correctly set