#!/bin/bash

echo "🧹 Cleaning up migration and temporary files..."

# Remove temporary SQL files that were used during migration
rm -f emergency_fix.sql
rm -f fix_user_profile.sql
rm -f fix_user_profiles_corrected.sql
rm -f fix_user_profiles_only.sql
rm -f fix_user_profiles_schema.sql
rm -f quick_fix_essentials.sql
rm -f apply_pending_migrations.sql
rm -f apply_all_pending_migrations.sql
rm -f check_user_profiles_schema.sql
rm -f check_current_state.sql
rm -f verify_user_profiles.sql
rm -f test_edge_function.sh
rm -f test-shipment-fix.sql
rm -f test_quota_schema.sql
rm -f test_shipment_line.sql
rm -f manual_migration_030.sql
rm -f manual_migration_script.sql
rm -f fix-updated-at.sql
rm -f fix_all_issues.sql
rm -f create_counterparty_table.sql
rm -f create-safe-update-function.js
rm -f create-test-data.js
rm -f production-setup.js
rm -f run-sql-fix.js
rm -f run_sql_fix.sh
rm -f test-deployment.sh
rm -f test-edge-functions.sh
rm -f verify_setup.sql
rm -f deploy_fixes.sh
rm -f commit_migration.sh

# Remove old deployment guides that are outdated
rm -f DEPLOYMENT.md
rm -f DEBUG_DEPLOYMENT.md
rm -f FIX_GITHUB_ACTIONS.md
rm -f FIX_PRODUCTION_NOW.md
rm -f MANUAL_DEPLOY.md
rm -f RESET_PRODUCTION.md
rm -f TRIGGER_DEPLOYMENT.md
rm -f VERCEL_DEPLOY_FIX.md
rm -f VERCEL_ENV_FIX.md
rm -f VERCEL_KEY_FORMAT.md
rm -f CHECK_GITHUB_SECRETS.md
rm -f GET_ANON_KEYS.md
rm -f GITHUB_ACTIONS_TROUBLESHOOTING.md
rm -f ENVIRONMENT_SYNC_GUIDE.md
rm -f trigger_deploy.md
rm -f setup_github_secrets.md
rm -f setup-github.sh
rm -f setup-local-dev.sh
rm -f get-supabase-keys.sh

# Clean up frontend temporary files
rm -f frontend/manual-fix.sql
rm -f frontend/run-sql-fix.js
rm -f frontend/simple-fix.js
rm -f frontend/test-supabase.js
rm -f frontend/create_counterparty.js

# Clean up migration directory but keep important files
cd migration
rm -f test_connection.sh
rm -f find_postgres.sh
rm -f run_export.sh
rm -f export_supabase_db.sh
rm -f install_postgres.md
rm -f EXPORT_COMMAND.txt
cd ..

echo "✅ Cleanup complete!"
echo ""
echo "📁 Kept important files:"
echo "  - migration/exports/ (your database exports)"
echo "  - migration/*.md (migration guides)"
echo "  - backend/ (your new backend)"
echo "  - frontend/ (your app)"
echo "  - docs/ (documentation)"
echo ""
echo "🎯 Next: Import environment variables to Railway to fix the 502 error!"