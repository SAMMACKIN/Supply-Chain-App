# Deployment Guide

This guide covers deploying the Supply Chain App to production using Vercel (frontend) and Supabase (backend).

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase project already set up
- Node.js 18+ installed locally

## Step 1: Prepare Your Code

1. **Clean up sensitive files**:
   ```bash
   # Remove any local environment files from git
   git rm --cached .env.local
   git rm --cached frontend/.env.local
   ```

2. **Verify .gitignore**:
   Make sure `.env.local` and other sensitive files are in `.gitignore`

## Step 2: Push to GitHub

1. **Initialize git** (if not already done):
   ```bash
   cd "/Users/sammackin/Desktop/Claude Code Apps/Supply Chain app"
   ./setup-github.sh
   ```

2. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `Supply-Chain-App` (or your choice)
   - Description: "Modern supply chain management application"
   - Private/Public: Your choice
   - DON'T initialize with README, .gitignore, or license

3. **Connect and push**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/Supply-Chain-App.git
   git push -u origin main
   ```

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Import Project**:
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your `Supply-Chain-App` repository

2. **Configure Project**:
   - Framework Preset: Vite
   - Root Directory: `frontend` ⚠️ Important!
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables**:
   Add these in the Vercel dashboard:
   ```
   VITE_DEV_MODE=false
   VITE_SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjI4OTYsImV4cCI6MjA2Nzg5ODg5Nn0.1ILHILy2_YCZ_uqRJIN7WvVhD1PP3vgZT5g3xmxGSiM
   ```

4. **Deploy**:
   Click "Deploy" and wait for the build to complete

### Option B: Via CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Follow prompts**:
   - Set up and deploy? Yes
   - Which scope? Select your account
   - Found project "supply-chain-app"? Yes
   - Link to existing project? Yes (if you created via dashboard)
   - What's your project's name? supply-chain-app
   - In which directory? ./ (current)
   - Override settings? No

## Step 4: Post-Deployment

1. **Verify Deployment**:
   - Visit your Vercel URL (e.g., https://supply-chain-app.vercel.app)
   - Try logging in with your Supabase credentials
   - Test creating call-offs and shipment lines

2. **Custom Domain** (Optional):
   - In Vercel dashboard > Settings > Domains
   - Add your custom domain
   - Follow DNS configuration instructions

3. **Enable Analytics** (Optional):
   - In Vercel dashboard > Analytics
   - Enable Web Vitals monitoring

## Step 5: Continuous Deployment

With GitHub integration, Vercel automatically deploys:
- Production: Every push to `main` branch
- Preview: Every pull request

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify environment variables are set

### App Won't Load
- Check browser console for errors
- Verify Supabase URL and anon key are correct
- Ensure Edge Functions are deployed to Supabase

### Authentication Issues
- For production, ensure VITE_DEV_MODE=false
- Create real user accounts in Supabase Auth
- Check Supabase dashboard for auth logs

### CORS Errors
- Edge Functions already have CORS configured
- If issues persist, check Supabase dashboard > Edge Functions

## Security Checklist

- [ ] Environment variables set in Vercel (not in code)
- [ ] .env.local not committed to git
- [ ] Supabase RLS policies configured
- [ ] API keys are anon keys (not service role)
- [ ] Error messages don't expose sensitive info

## Performance Optimization

1. **Enable Vercel Edge Network**:
   - Automatically enabled for all deployments
   - Serves assets from global CDN

2. **Monitor Performance**:
   - Use Vercel Analytics
   - Check Core Web Vitals scores

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Project Issues: https://github.com/YOUR_USERNAME/Supply-Chain-App/issues