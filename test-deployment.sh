#!/bin/bash
# Test deployment script to verify Supabase CLI commands work

echo "🔧 Testing Supabase deployment locally..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Test development environment
echo ""
echo "📦 Testing DEVELOPMENT environment..."
echo "Project: $DEV_SUPABASE_PROJECT_REF"

# Set environment variables
export SUPABASE_ACCESS_TOKEN=$DEV_SUPABASE_ACCESS_TOKEN

# Link to development project
echo "🔗 Linking to development project..."
supabase link --project-ref $DEV_SUPABASE_PROJECT_REF

# Check migration status
echo "📋 Checking pending migrations..."
supabase migration list --password $DEV_SUPABASE_DB_PASSWORD

# Deploy to development (dry run)
echo "🚀 Testing deployment (dry run)..."
echo "Would run: supabase db push --password $DEV_SUPABASE_DB_PASSWORD"
echo "Would run: supabase functions deploy calloff-crud --project-ref $DEV_SUPABASE_PROJECT_REF"

echo ""
echo "✅ Development environment test complete!"
echo ""
echo "To actually deploy, run:"
echo "  supabase db push --password $DEV_SUPABASE_DB_PASSWORD"
echo "  supabase functions deploy calloff-crud --project-ref $DEV_SUPABASE_PROJECT_REF"