#!/bin/bash

echo "☁️  Supabase Cloud-Only Workflow Setup"
echo "======================================"
echo "No local Supabase needed - everything in the cloud!"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Installing Supabase CLI...${NC}"
    brew install supabase/tap/supabase
fi

echo -e "${GREEN}✓ Supabase CLI installed${NC}"

# Login
echo ""
echo -e "${YELLOW}Step 1: Login to Supabase${NC}"
echo "You'll be redirected to your browser..."
read -p "Press Enter to continue..."
supabase login

# Link to development
echo ""
echo -e "${YELLOW}Step 2: Link to Development Project${NC}"
supabase link --project-ref pxwtdaqhwzweedflwora

# Pull current dev schema
echo ""
echo -e "${YELLOW}Step 3: Initialize Migrations${NC}"
echo "Creating migrations from current dev schema..."
supabase db remote commit

# Create develop branch
echo ""
echo -e "${YELLOW}Step 4: Set Up Branches${NC}"
if git show-ref --verify --quiet refs/heads/develop; then
    echo -e "${GREEN}✓ Develop branch exists${NC}"
    git checkout develop
else
    git checkout -b develop
    echo -e "${GREEN}✓ Created develop branch${NC}"
fi

# Show current state
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Your workflow:"
echo "1. Work on 'develop' branch"
echo "2. Push changes → Auto-deploy to dev Supabase"
echo "3. Test at: https://pxwtdaqhwzweedflwora.supabase.co"
echo "4. Merge to 'main' → Auto-deploy to production"
echo ""
echo "Next: Let's fix production!"
echo ""
echo -e "${YELLOW}To fix production now:${NC}"
echo "1. Go to: https://supabase.com/dashboard/project/brixbdbunhwlhuwunqxw/sql"
echo "2. Run: supabase/migrations/20250114120000_sync_production_schema.sql"
echo ""
echo "Happy shipping! 🚀"