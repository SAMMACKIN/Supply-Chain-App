# Check GitHub Secrets for Development

Go to: https://github.com/SAMMACKIN/Supply-Chain-App/settings/secrets/actions

Verify these secrets exist and are correct:

## For Development (develop branch):
- `SUPABASE_ACCESS_TOKEN`: Your personal access token from https://app.supabase.com/account/tokens
- `SUPABASE_DEV_PROJECT_REF`: `pxwtdaqhwzweedflwora`
- `SUPABASE_DEV_DB_PASSWORD`: `dP9hFIx5hE9r7HrD`

## For Production (main branch):
- `SUPABASE_PROJECT_REF`: `brixbdbunhwlhuwunqxw`
- `SUPABASE_DB_PASSWORD`: `8TG8DYmSWNf88bGh`

## Test Manually

If you want to test the deployment locally:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Set environment variables
export SUPABASE_ACCESS_TOKEN="your-token-here"

# Test development deployment
supabase link --project-ref pxwtdaqhwzweedflwora
supabase db push --password dP9hFIx5hE9r7HrD
supabase functions deploy calloff-crud --project-ref pxwtdaqhwzweedflwora
```

## Common Errors

1. **"Access token is required"** - SUPABASE_ACCESS_TOKEN is missing
2. **"Invalid project ID"** - Wrong project reference
3. **"Authentication failed"** - Wrong password or token expired