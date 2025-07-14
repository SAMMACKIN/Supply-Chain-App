# Debug Deployment Issues

## Check the Specific Error

1. Go to: https://github.com/SAMMACKIN/Supply-Chain-App/actions
2. Click on the failed "Supabase Cloud Pipeline (Dev → Prod)" workflow
3. Click on "deploy-to-prod (push)"
4. Look for the specific error message in the logs

## Common Issues and Solutions

### 1. "Error: Access token is required"
- The secret `SUPABASE_ACCESS_TOKEN` is missing or invalid
- Solution: Add/update the secret in GitHub settings

### 2. "Error linking to project"
- The project reference is wrong or the access token doesn't have permission
- Check: `SUPABASE_PROJECT_REF` = `brixbdbunhwlhuwunqxw`

### 3. "Database password is incorrect"
- The database password is wrong
- Check: `SUPABASE_DB_PASSWORD` = `8TG8DYmSWNf88bGh`

### 4. "Migration already applied"
- This is OK - migrations are idempotent
- The deployment can continue

### 5. "Function deployment failed"
- Check if the Edge Function has syntax errors
- Verify the function exists in `supabase/functions/calloff-crud/`

## Quick Test

Try running manually from Actions tab:
1. Go to "Actions" → "Supabase Cloud Pipeline (Dev → Prod)"
2. Click "Run workflow"
3. Keep default branch (main)
4. Click "Run workflow"

## Share the Error

Please share the specific error message from the logs so I can provide a targeted fix.