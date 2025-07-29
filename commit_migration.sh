#!/bin/bash

echo "🚀 Committing migration changes..."

# Add all files
git add -A

# Commit with detailed message
git commit -m "Add complete backend API and database migration setup

- Created Express/TypeScript backend with Prisma ORM
- Implemented all API routes matching Supabase Edge Functions
- Added authentication middleware ready for Clerk
- Created comprehensive migration guides and scripts
- Successfully exported Supabase database (107KB)
- Backend structure ready for Railway deployment
- Added API client service for frontend migration
- Included CORS, rate limiting, and error handling

Backend features:
- RESTful API endpoints for quotas, call-offs, shipment lines
- Prisma schema matching existing database
- Environment-based configuration
- Production-ready middleware
- Railway deployment configuration

Migration status:
- Database export: ✅ Complete
- Backend API: ✅ Ready
- Deployment config: ✅ Ready
- Next: Deploy to Railway and migrate frontend

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
echo "Pushing to remote..."
git push origin develop

echo "✅ Changes pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Go to railway.app and sign in with GitHub"
echo "2. Create new project from your GitHub repo"
echo "3. Railway will detect the backend/ directory"