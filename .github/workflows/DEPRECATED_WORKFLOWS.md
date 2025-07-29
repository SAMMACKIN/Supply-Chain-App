# Deprecated Workflows

## Migration Status
We are migrating from Supabase to Railway + Vercel. The following workflows have been deprecated:

### Deprecated Files:
1. **supabase-cloud-pipeline.yml.deprecated** - Was used for Supabase deployments
2. **run-migrations-supabase.yml.deprecated** - Was used for manual Supabase migrations
3. **railway-deploy.yml.disabled** - GitHub Actions workflow for Railway (replaced by Railway's native GitHub integration)

### Active Workflows:
None - All deployments are handled by platform integrations:
- Railway: Uses native GitHub integration (configured in Railway dashboard)
- Vercel: Uses native GitHub integration (automatic)

## Next Steps:
- Once Railway migration is complete and stable, these deprecated files can be deleted
- Database migrations will be handled through Railway's deployment process
- Edge functions are replaced by Express API endpoints in the Railway backend

## Note:
These workflows are kept for reference during the migration period. Do not use them for new deployments.