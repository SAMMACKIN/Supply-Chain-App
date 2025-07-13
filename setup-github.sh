#!/bin/bash

echo "🚀 Setting up GitHub repository for Supply Chain App"
echo "=================================================="

# Check if git is already initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
else
    echo "✅ Git repository already initialized"
fi

# Add all files
echo "📝 Adding files to git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Supply Chain Logistics App

- React frontend with Material-UI
- Supabase backend with Edge Functions
- Call-off management features
- Shipment line tracking
- Mock data support for development
- Vercel deployment ready"

# Show remote setup instructions
echo ""
echo "✅ Local repository ready!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new repository on GitHub (https://github.com/new)"
echo "   - Repository name: Supply-Chain-App"
echo "   - Keep it private if needed"
echo "   - Don't initialize with README (we already have one)"
echo ""
echo "2. Add the remote origin:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/Supply-Chain-App.git"
echo ""
echo "3. Push your code:"
echo "   git push -u origin main"
echo ""
echo "4. Set up Vercel deployment:"
echo "   - Go to https://vercel.com/new"
echo "   - Import your GitHub repository"
echo "   - Set root directory to: frontend"
echo "   - Add environment variables:"
echo "     VITE_DEV_MODE=false"
echo "     VITE_SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co"
echo "     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "🎉 Done!"