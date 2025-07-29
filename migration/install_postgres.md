# Install PostgreSQL Client Tools

## macOS (using Homebrew)

```bash
# Install PostgreSQL (includes pg_dump)
brew install postgresql@16

# Add to PATH (add this to your ~/.zshrc)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
pg_dump --version
```

## Alternative: Install just the client tools

```bash
# Lighter weight - just client tools
brew install libpq

# Link the tools
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## After Installation

Once installed, run the export command:

```bash
cd ~/Desktop/Claude\ Code\ Apps/Supply\ Chain\ app/migration
mkdir -p exports

PGPASSWORD=tfy3MrsCfcWsP4pP pg_dump \
  --host=db.pxwtdaqhwzweedflwora.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-unlogged-table-data \
  --file=exports/supabase_full_export.sql
```

## Alternative Methods (No Installation Required)

### Option 1: Use Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/pxwtdaqhwzweedflwora
2. Navigate to Settings → Database
3. Look for backup/export options

### Option 2: Use TablePlus (GUI)
1. Download TablePlus: https://tableplus.com/
2. Create connection with these details:
   - Host: `db.pxwtdaqhwzweedflwora.supabase.co`
   - Port: `5432`
   - User: `postgres`
   - Password: `tfy3MrsCfcWsP4pP`
   - Database: `postgres`
3. Right-click database → Export → SQL Dump

### Option 3: Use Supabase CLI
```bash
npx supabase db dump --db-url "postgresql://postgres:tfy3MrsCfcWsP4pP@db.pxwtdaqhwzweedflwora.supabase.co:5432/postgres" -f exports/supabase_export.sql
```