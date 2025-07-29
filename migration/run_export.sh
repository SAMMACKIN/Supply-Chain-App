#!/bin/bash

# Create export directory
mkdir -p exports

echo "🚀 Starting Supabase database export..."
echo ""

# Export full database
echo "📦 Exporting database (this may take a few minutes)..."

PGPASSWORD=tfy3MrsCfcWsP4pP pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-unlogged-table-data \
  --file=exports/supabase_full_export.sql

if [ $? -eq 0 ]; then
    echo "✅ Export successful!"
    echo ""
    echo "📊 Checking file size..."
    ls -lh exports/supabase_full_export.sql
    echo ""
    echo "📝 Getting row counts..."
    
    PGPASSWORD=tfy3MrsCfcWsP4pP psql \
      --host=db.pxwtdaqhwzweedflwora.supabase.co \
      --port=5432 \
      --username=postgres \
      --dbname=postgres \
      --quiet \
      --tuples-only \
      --command="
        SELECT tablename || ': ' || n_live_tup || ' rows' as count_info
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      " > exports/row_counts.txt
    
    echo "✅ Row counts saved to exports/row_counts.txt"
    cat exports/row_counts.txt
    echo ""
    echo "🎉 Export complete! Files created:"
    echo "  - exports/supabase_full_export.sql (full database)"
    echo "  - exports/row_counts.txt (verification)"
else
    echo "❌ Export failed. Please check:"
    echo "1. PostgreSQL client tools are installed:"
    echo "   brew install postgresql"
    echo "2. You can connect to Supabase"
fi