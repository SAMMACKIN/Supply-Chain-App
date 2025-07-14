#!/bin/bash

echo "🚀 Supabase Local Development Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"
    if command -v brew &> /dev/null; then
        brew install supabase/tap/supabase
    else
        echo -e "${RED}Homebrew not found. Please install Supabase CLI manually:${NC}"
        echo "https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Check if already initialized
if [ -f "supabase/config.toml" ]; then
    echo -e "${GREEN}✓ Supabase already initialized${NC}"
else
    echo -e "${YELLOW}Initializing Supabase...${NC}"
    supabase init
fi

# Login to Supabase
echo ""
echo -e "${YELLOW}Step 1: Login to Supabase${NC}"
echo "You'll be redirected to your browser to authenticate"
read -p "Press Enter to continue..."
supabase login

# Link to development project
echo ""
echo -e "${YELLOW}Step 2: Link to Development Project${NC}"
echo "Linking to development project (pxwtdaqhwzweedflwora)..."
supabase link --project-ref pxwtdaqhwzweedflwora

# Pull current schema
echo ""
echo -e "${YELLOW}Step 3: Pull Current Development Schema${NC}"
read -p "This will create migration files from your current dev database. Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    supabase db pull
    echo -e "${GREEN}✓ Schema pulled successfully${NC}"
fi

# Create branching structure
echo ""
echo -e "${YELLOW}Step 4: Set Up Git Branches${NC}"
if git show-ref --verify --quiet refs/heads/develop; then
    echo -e "${GREEN}✓ Develop branch already exists${NC}"
else
    echo "Creating develop branch..."
    git checkout -b develop
    echo -e "${GREEN}✓ Develop branch created${NC}"
fi

# Create local environment file
echo ""
echo -e "${YELLOW}Step 5: Create Local Environment File${NC}"
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << 'EOF'
# Local Supabase instance
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
VITE_DEV_MODE=false
EOF
    echo -e "${GREEN}✓ Created frontend/.env.local${NC}"
    echo -e "${YELLOW}Note: Update VITE_SUPABASE_ANON_KEY after running 'supabase start'${NC}"
else
    echo -e "${GREEN}✓ frontend/.env.local already exists${NC}"
fi

# Start local Supabase
echo ""
echo -e "${YELLOW}Step 6: Start Local Supabase${NC}"
read -p "Start local Supabase now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting Supabase (this may take a few minutes)..."
    supabase start
    echo ""
    echo -e "${GREEN}✓ Local Supabase is running!${NC}"
    echo ""
    echo -e "${YELLOW}Important: Copy the anon key from above and update frontend/.env.local${NC}"
fi

# Show next steps
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update frontend/.env.local with the anon key from 'supabase start'"
echo "2. Run 'npm run dev' in the frontend directory"
echo "3. Your app will now use the local Supabase instance"
echo ""
echo "Useful commands:"
echo "  supabase start          - Start local Supabase"
echo "  supabase stop           - Stop local Supabase"
echo "  supabase status         - Check status and get URLs"
echo "  supabase migration new  - Create a new migration"
echo "  supabase db reset       - Reset local database"
echo ""
echo "Happy coding! 🚀"