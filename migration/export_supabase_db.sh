#!/bin/bash

# Supabase Database Export Script
# This script exports your Supabase database for migration

echo "🚀 Supabase Database Export Tool"
echo "================================"

# Configuration
DB_HOST="db.pxwtdaqhwzweedflwora.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
EXPORT_DIR="./migration/exports"

# Create export directory
mkdir -p $EXPORT_DIR

echo ""
echo "📋 Export Options:"
echo "1. Full export (schema + data)"
echo "2. Schema only"
echo "3. Data only"
echo "4. Custom tables only"
read -p "Select option (1-4): " OPTION

# Get password
echo ""
read -s -p "Enter database password: " DB_PASS
echo ""

# Set PGPASSWORD environment variable
export PGPASSWORD=$DB_PASS

# Function to check if pg_dump exists
check_pg_dump() {
    if ! command -v pg_dump &> /dev/null; then
        echo "❌ pg_dump not found. Please install PostgreSQL client tools:"
        echo "   macOS: brew install postgresql"
        echo "   Ubuntu: sudo apt-get install postgresql-client"
        echo "   Windows: Download from https://www.postgresql.org/download/"
        exit 1
    fi
}

# Check prerequisites
check_pg_dump

# Export based on selection
case $OPTION in
    1)
        echo "📦 Exporting full database (schema + data)..."
        pg_dump \
            --host=$DB_HOST \
            --port=$DB_PORT \
            --username=$DB_USER \
            --dbname=$DB_NAME \
            --schema=public \
            --no-owner \
            --no-privileges \
            --no-tablespaces \
            --no-unlogged-table-data \
            --file=$EXPORT_DIR/supabase_full_export.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Full export completed: $EXPORT_DIR/supabase_full_export.sql"
        else
            echo "❌ Export failed"
            exit 1
        fi
        ;;
    
    2)
        echo "📋 Exporting schema only..."
        pg_dump \
            --host=$DB_HOST \
            --port=$DB_PORT \
            --username=$DB_USER \
            --dbname=$DB_NAME \
            --schema=public \
            --schema-only \
            --no-owner \
            --no-privileges \
            --file=$EXPORT_DIR/supabase_schema.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Schema export completed: $EXPORT_DIR/supabase_schema.sql"
        else
            echo "❌ Export failed"
            exit 1
        fi
        ;;
    
    3)
        echo "💾 Exporting data only..."
        pg_dump \
            --host=$DB_HOST \
            --port=$DB_PORT \
            --username=$DB_USER \
            --dbname=$DB_NAME \
            --schema=public \
            --data-only \
            --no-owner \
            --disable-triggers \
            --file=$EXPORT_DIR/supabase_data.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Data export completed: $EXPORT_DIR/supabase_data.sql"
        else
            echo "❌ Export failed"
            exit 1
        fi
        ;;
    
    4)
        echo "📊 Exporting custom tables..."
        
        # Define tables to export
        TABLES=(
            "user_profiles"
            "counterparty"
            "counterparty_addresses"
            "quota"
            "call_off"
            "call_off_shipment_line"
        )
        
        # Export each table
        for TABLE in "${TABLES[@]}"; do
            echo "  Exporting table: $TABLE"
            pg_dump \
                --host=$DB_HOST \
                --port=$DB_PORT \
                --username=$DB_USER \
                --dbname=$DB_NAME \
                --table=public.$TABLE \
                --no-owner \
                --no-privileges \
                --file=$EXPORT_DIR/${TABLE}_export.sql
        done
        
        echo "✅ Custom tables exported to $EXPORT_DIR/"
        ;;
    
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

# Export row counts for verification
echo ""
echo "📊 Getting row counts for verification..."
psql \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --dbname=$DB_NAME \
    --command="
        SELECT 
            schemaname,
            tablename,
            n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    " > $EXPORT_DIR/row_counts.txt

echo "✅ Row counts saved to: $EXPORT_DIR/row_counts.txt"

# Export enums
echo ""
echo "🔧 Exporting custom types and enums..."
psql \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --dbname=$DB_NAME \
    --command="
        SELECT 
            n.nspname as schema,
            t.typname as name,
            array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
        FROM pg_type t
        LEFT JOIN pg_enum e ON t.oid = e.enumtypid
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typtype = 'e'
        AND n.nspname = 'public'
        GROUP BY schema, name
        ORDER BY name;
    " > $EXPORT_DIR/enums.txt

echo "✅ Enums saved to: $EXPORT_DIR/enums.txt"

# Clean up
unset PGPASSWORD

echo ""
echo "🎉 Export complete!"
echo ""
echo "📁 Files created:"
ls -la $EXPORT_DIR/
echo ""
echo "📝 Next steps:"
echo "1. Review the exported files"
echo "2. Remove any Supabase-specific functions/triggers"
echo "3. Set up your Railway/Render PostgreSQL database"
echo "4. Import using: psql YOUR_NEW_DB_URL < $EXPORT_DIR/supabase_full_export.sql"