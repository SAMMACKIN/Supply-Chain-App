-- Final attempt to add business_unit_id column to quota table
-- Migration: 015_add_business_unit_column_final.sql
-- Created: July 12, 2025

-- Direct column addition
ALTER TABLE quota ADD COLUMN IF NOT EXISTS business_unit_id UUID NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440001';