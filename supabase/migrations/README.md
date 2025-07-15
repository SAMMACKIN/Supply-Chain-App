# Database Migrations

This directory contains SQL migrations that are automatically applied by GitHub Actions when you push to develop or main branches.

## How It Works

1. **Automatic Deployment**:
   - Push to `develop` → Migrations run in preview database
   - Push to `main` → Migrations run in production database
   - No manual SQL running needed!

2. **Migration Files**:
   - `00_complete_schema.sql` - Complete database structure
   - `01_initial_data.sql` - Sample data for testing
   - Future migrations: `02_feature_name.sql`, `03_another_feature.sql`, etc.

3. **Important Rules**:
   - **NEVER** modify existing migration files after they're deployed
   - **ALWAYS** create new numbered files for changes
   - Migrations run in alphabetical order

## Adding New Features

To add a new table or modify schema:

```sql
-- Create a new file: 02_add_new_feature.sql
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- your columns here
);
```

Then push to develop to test, and main to deploy.

## Fresh Install

For new developers setting up the project:
1. The migrations will run automatically when they deploy
2. Or they can manually run the SQL files in order in Supabase SQL Editor

## Troubleshooting

If migrations fail in GitHub Actions:
1. Check the Actions tab for error details
2. The workflow now stops on errors (no more silent failures)
3. Fix the migration file and push again

## Archive

Old migrations from before the cleanup are in `archive/old-migrations/` for reference only.