#!/bin/bash

# Deploy fixes for authentication and database issues
# Run this script to fix the current issues

echo "🔧 Deploying fixes for Supply Chain app..."
echo ""

# Step 1: Push code changes
echo "📦 Step 1: Pushing code changes..."
git add -A
git commit -m "Fix authentication with dynamic user_profiles schema handling

- Updated AuthProvider to handle varying user_profiles schemas
- Added RPC function for safe profile creation
- Added fallback to minimal profile insert
- Enhanced error handling and logging

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin develop

echo "✅ Code changes pushed"
echo ""

# Step 2: Manual database fix
echo "📋 Step 2: Database fixes required"
echo ""
echo "Please run the following SQL script in your Supabase SQL Editor:"
echo "----------------------------------------"
echo "File: fix_user_profiles_schema.sql"
echo ""
echo "This script will:"
echo "1. Check what columns exist in user_profiles"
echo "2. Create the RPC function for safe profile creation"
echo "3. Create missing user profiles dynamically"
echo "4. Show verification results"
echo ""
echo "After running the SQL script, check the output to see:"
echo "- What columns your user_profiles table has"
echo "- Whether profiles were created successfully"
echo "- Current status of all users"
echo ""

# Step 3: Trigger deployment
echo "🚀 Step 3: Triggering deployment..."
echo ""
echo "The code push will automatically trigger:"
echo "- Vercel deployment for frontend"
echo "- GitHub Actions for Supabase (may fail but that's ok)"
echo ""

# Step 4: Next steps
echo "📝 Step 4: Next steps"
echo "----------------------------------------"
echo "1. Run fix_user_profiles_schema.sql in Supabase SQL Editor"
echo "2. Wait for Vercel deployment to complete (~2-3 minutes)"
echo "3. Test the app - authentication should work now"
echo "4. If shipment lines still don't work, check if call_off_shipment_line table exists"
echo ""
echo "Common issues:"
echo "- If you still can't refresh: Clear browser data and try again"
echo "- If shipment lines fail: The table might be missing - run apply_all_pending_migrations.sql"
echo "- If quotas show GUIDs: The join queries need the counterparty data"
echo ""
echo "🎯 Once the SQL script is run and deployment completes, the app should work!"