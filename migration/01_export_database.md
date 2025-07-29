# Database Export Instructions

## Step 1: Export Database Schema

Run these commands in your Supabase SQL Editor to export the schema:

```sql
-- Export all table definitions
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
    array_to_string(
        array_agg(
            column_name || ' ' || 
            data_type || 
            CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                ELSE ''
            END ||
            CASE 
                WHEN is_nullable = 'NO' 
                THEN ' NOT NULL'
                ELSE ''
            END ||
            CASE 
                WHEN column_default IS NOT NULL 
                THEN ' DEFAULT ' || column_default
                ELSE ''
            END
        ), ', '
    ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

## Step 2: Export Data

Use pg_dump from your local machine:

```bash
# Install PostgreSQL client tools if needed
brew install postgresql

# Export schema + data
pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --password \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-unlogged-table-data \
  --file=supabase_export.sql

# Export data only (for safety)
pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --password \
  --dbname=postgres \
  --schema=public \
  --data-only \
  --no-owner \
  --file=supabase_data.sql
```

## Step 3: Clean up Supabase-specific items

Remove from the export:
- `auth.*` schema references
- `storage.*` schema references
- `realtime.*` subscriptions
- Supabase-specific functions
- RLS policies (we'll handle auth differently)

## Step 4: Export Enums and Types

```sql
-- Get all custom types
SELECT 
    n.nspname as schema,
    t.typname as name,
    t.typtype as type,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE (t.typtype = 'e' OR t.typtype = 'c')
AND n.nspname = 'public'
GROUP BY schema, name, type
ORDER BY name;
```

## Step 5: Document Current Schema

Save this for reference during migration:

```sql
-- List all tables with row counts
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## Files Created:
- `supabase_export.sql` - Complete database export
- `supabase_data.sql` - Data only backup
- `schema_documentation.txt` - Current schema reference

## Next Steps:
1. Review the exported files
2. Set up Railway/Render PostgreSQL
3. Import the cleaned schema
4. Verify data integrity