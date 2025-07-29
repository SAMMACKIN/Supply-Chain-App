#!/bin/bash

echo "Testing PostgreSQL tools and connection..."
echo ""

# Check if pg_dump exists
if command -v pg_dump &> /dev/null; then
    echo "✅ pg_dump found at: $(which pg_dump)"
    echo "   Version: $(pg_dump --version)"
else
    echo "❌ pg_dump not found. Install with:"
    echo "   brew install postgresql"
    exit 1
fi

echo ""
echo "Testing connection to Supabase..."

# Test connection
PGPASSWORD=tfy3MrsCfcWsP4pP psql \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --command="SELECT version();" \
  --command="SELECT current_database();" \
  --command="SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Connection successful!"
    echo "Ready to run export."
else
    echo ""
    echo "❌ Connection failed. Please check:"
    echo "1. Internet connection"
    echo "2. Supabase service is running"
    echo "3. Credentials are correct"
fi