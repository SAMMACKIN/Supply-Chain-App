#!/bin/bash

echo "🚀 Supabase GitHub Integration Setup Script"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: GitHub Repository Check${NC}"
if git remote -v | grep -q "github.com"; then
    echo -e "${GREEN}✓ GitHub repository detected${NC}"
    git remote -v
else
    echo -e "${RED}✗ No GitHub remote found${NC}"
    echo "Please ensure your repository is pushed to GitHub first"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Required GitHub Secrets${NC}"
echo "Please add these secrets to your GitHub repository:"
echo "(Go to: Settings → Secrets and variables → Actions)"
echo ""
echo "Required secrets:"
echo "- SUPABASE_ACCESS_TOKEN     (from https://supabase.com/dashboard/account/tokens)"
echo "- SUPABASE_PROJECT_REF      (Production: brixbdbunhwlhuwunqxw)"
echo "- SUPABASE_DB_PASSWORD      (Production database password)"
echo "- SUPABASE_DEV_PROJECT_REF  (Development: pxwtdaqhwzweedflwora)"
echo "- SUPABASE_DEV_DB_PASSWORD  (Development database password)"
echo ""

echo -e "${YELLOW}Step 3: Migration Files${NC}"
echo "Checking migration files..."
if [ -d "supabase/migrations" ]; then
    echo -e "${GREEN}✓ Migration directory exists${NC}"
    ls -la supabase/migrations/
else
    echo -e "${RED}✗ Migration directory not found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Next Steps${NC}"
echo "1. Add the GitHub secrets listed above"
echo "2. Run the initial migration manually in Supabase SQL Editor:"
echo "   - Use files in supabase/migrations/ in order"
echo "3. Commit and push to trigger automatic deployment:"
echo "   git add ."
echo "   git commit -m 'Set up Supabase GitHub integration'"
echo "   git push origin main"
echo ""
echo "4. Check GitHub Actions tab for deployment status"
echo ""

echo -e "${YELLOW}Optional: Install Supabase CLI locally${NC}"
echo "brew install supabase/tap/supabase"
echo "# or"
echo "npm install -g supabase"
echo ""

echo -e "${GREEN}Setup script complete!${NC}"