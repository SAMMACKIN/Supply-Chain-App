#!/bin/bash
# Setup script for local development environment

echo "🚀 Setting up local development environment..."

# Check operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 macOS detected"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed. Please install it first:"
        echo "Visit: https://brew.sh"
        exit 1
    fi
    
    # Install Supabase CLI
    if ! command -v supabase &> /dev/null; then
        echo "📦 Installing Supabase CLI..."
        brew install supabase/tap/supabase
    else
        echo "✅ Supabase CLI already installed"
    fi
else
    echo "📦 Linux/Other OS detected"
    echo "Please install Supabase CLI manually:"
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local and add your actual credentials"
else
    echo "✅ .env.local already exists"
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Verify environment variables are set
if [ -z "$DEV_SUPABASE_ACCESS_TOKEN" ] || [ -z "$DEV_SUPABASE_PROJECT_REF" ]; then
    echo "❌ Missing required environment variables in .env.local"
    echo "Please ensure these are set:"
    echo "  - DEV_SUPABASE_ACCESS_TOKEN"
    echo "  - DEV_SUPABASE_PROJECT_REF"
    echo "  - DEV_SUPABASE_DB_PASSWORD"
    exit 1
fi

echo ""
echo "✅ Local development environment is ready!"
echo ""
echo "Next steps:"
echo "1. Make sure your GitHub repository has the required secrets set"
echo "2. Run './test-deployment.sh' to test the deployment locally"
echo "3. Push changes to trigger GitHub Actions"