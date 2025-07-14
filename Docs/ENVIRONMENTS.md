# Environment Management

This document explains how to manage development and production environments for the Supply Chain Logistics App.

## 🌍 Available Environments

### Development Environment
- **URL**: https://pxwtdaqhwzweedflwora.supabase.co
- **Project Ref**: `pxwtdaqhwzweedflwora`
- **Purpose**: Daily development, testing new features, schema changes
- **Data**: Test/mock data only

### Production Environment  
- **URL**: https://brixbdbunhwlhuwunqxw.supabase.co
- **Project Ref**: `brixbdbunhwlhuwunqxw`
- **Purpose**: Live application with real business data
- **Data**: Real quota, call-off, and inventory data

## 🔄 Switching Environments

### Quick Switch Commands
```bash
# Switch to development (default for daily work)
./scripts/switch-env.sh development

# Switch to production (for deployments)
./scripts/switch-env.sh production

# Check current environment
./scripts/switch-env.sh status
```

### What Happens When You Switch:
1. **Updates `.env.local`** with correct Supabase credentials
2. **Links Supabase CLI** to the target environment
3. **Updates all environment variables** for consistent access

## 📁 Environment Files

### `.env.local` (Active Configuration)
- Contains credentials for the currently active environment
- Automatically updated by `switch-env.sh`
- **Never commit this file** - it contains passwords

### `.env.example` (Template)
- Template showing all required environment variables
- Safe to commit - contains no real credentials
- Use as reference for setting up new environments

## 🚀 Development Workflow

### Daily Development
```bash
# Start in development environment
./scripts/switch-env.sh development

# Make changes, test migrations
npx supabase db push

# Build and test your changes
npm run dev
```

### Deploying to Production
```bash
# Switch to production (with confirmation prompt)
./scripts/switch-env.sh production

# Apply tested migrations
npx supabase db push

# Deploy frontend application
npm run build && npm run deploy
```

## 🛡️ Safety Features

### Production Protection
- **Confirmation prompt** required when switching to production
- **Visual warnings** displayed when in production mode
- **Separate credentials** prevent accidental cross-environment access

### Environment Isolation
- **Completely separate databases** - no risk of data contamination
- **Independent authentication** and user management
- **Isolated Edge Functions** and API endpoints

## 📊 Environment Status

Check which environment you're currently using:

```bash
./scripts/switch-env.sh status
```

Output example:
```
Current Environment Status:
Environment: development
Supabase URL: https://pxwtdaqhwzweedflwora.supabase.co
```

## 🔧 Troubleshooting

### Common Issues

#### "Failed to link environment"
```bash
# Re-run with explicit password
SUPABASE_DB_PASSWORD="your_password" ./scripts/switch-env.sh development
```

#### "Migration already applied"
This is normal - Supabase tracks which migrations have been applied.

#### "Wrong environment active"
Always check current environment before making changes:
```bash
./scripts/switch-env.sh status
```

### Manual Environment Setup

If the script fails, you can manually update `.env.local`:

```bash
# For development
SUPABASE_URL=https://pxwtdaqhwzweedflwora.supabase.co
SUPABASE_PROJECT_REF=pxwtdaqhwzweedflwora
SUPABASE_DB_PASSWORD=dP9hFIx5hE9r7HrD
ACTIVE_ENV=development

# Then link manually
npx supabase link --project-ref pxwtdaqhwzweedflwora
```

## 🔒 Security Notes

1. **Never commit real passwords** to Git
2. **Use development environment** for all testing
3. **Backup production** before major schema changes
4. **Limit production access** to authorized team members only

## 📈 Best Practices

### Development
- Always work in development environment first
- Test all migrations thoroughly before production
- Use realistic test data for better testing

### Production
- Only apply well-tested migrations
- Monitor application after deployments
- Keep regular database backups
- Document all production changes

---

*Environment setup completed: July 12, 2025*