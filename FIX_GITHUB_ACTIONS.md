# Fix GitHub Actions Deployment

Both deployments failed because GitHub secrets are not configured. Follow these steps:

## 1. Add GitHub Secrets

Go to: https://github.com/SAMMACKIN/Supply-Chain-App/settings/secrets/actions

Click "New repository secret" and add each of these:

### Required Secrets:

1. **SUPABASE_ACCESS_TOKEN**
   ```
   sbp_5a1f7de7fceb5aa749a5f047c56ff91adb0329d4
   ```

2. **SUPABASE_PROJECT_REF** (Production)
   ```
   brixbdbunhwlhuwunqxw
   ```

3. **SUPABASE_DB_PASSWORD** (Production)
   ```
   8TG8DYmSWNf88bGh
   ```

4. **SUPABASE_DEV_PROJECT_REF** (Development)
   ```
   pxwtdaqhwzweedflwora
   ```

5. **SUPABASE_DEV_DB_PASSWORD** (Development)
   ```
   dP9hFIx5hE9r7HrD
   ```

## 2. Re-run Failed Workflows

1. Go to: https://github.com/SAMMACKIN/Supply-Chain-App/actions
2. Click on the failed workflow run
3. Click "Re-run all jobs" button

## 3. Verify Success

After re-running, the deployments should succeed and you'll see:
- ✅ Database migrations applied
- ⚡ Edge Functions deployed
- 🔗 Project URLs displayed

The workflow will automatically deploy:
- `develop` branch → Development Supabase
- `main` branch → Production Supabase