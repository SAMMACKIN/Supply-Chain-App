#!/bin/bash

# Fix database schema issues after migration from Supabase

echo "Fixing database schema issues..."

cd /app

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Create initial migration from existing database
echo "Creating initial migration from existing database..."
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

mkdir -p prisma/migrations/0_init
echo "-- Initial migration from existing database" > prisma/migrations/0_init/migration.sql

# Apply any pending migrations
echo "Applying migrations..."
npx prisma migrate deploy

# Seed database if needed
echo "Database schema fixed!"

# Show current database status
npx prisma migrate status