# Production Deployment Guide

This document provides step-by-step instructions for deploying the Supply Chain Logistics App to production environment.

## 🚀 Database Setup for Production

### Required SQL Commands

When deploying to production, you'll need to run these SQL commands in order:

#### 1. Create Counterparty Table

```sql
-- Create counterparty table for trading partners
CREATE TABLE IF NOT EXISTS counterparty (
  counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  company_code VARCHAR(20) UNIQUE NOT NULL,
  primary_contact_name VARCHAR(100),
  primary_contact_email VARCHAR(100),
  primary_contact_phone VARCHAR(30),
  address_line_1 VARCHAR(200),
  address_line_2 VARCHAR(200),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country_code CHAR(2) NOT NULL,
  counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
  tax_id VARCHAR(50),
  credit_rating VARCHAR(10),
  default_currency CHAR(3) DEFAULT 'USD',
  payment_terms_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_counterparty_company_code ON counterparty (company_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_company_name ON counterparty (company_name);
CREATE INDEX IF NOT EXISTS idx_counterparty_type ON counterparty (counterparty_type);
CREATE INDEX IF NOT EXISTS idx_counterparty_country ON counterparty (country_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_active ON counterparty (is_active) WHERE is_active = true;
```

#### 2. Insert Production Counterparty Data

```sql
-- Insert your actual production counterparties
-- Replace these with real company data
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, primary_contact_name, city) VALUES
('Your Customer Corp', 'CUST1', 'CUSTOMER', 'US', 'Contact Name', 'City'),
('Your Supplier Ltd', 'SUPP1', 'SUPPLIER', 'GB', 'Contact Name', 'City')
-- Add more as needed
ON CONFLICT (company_code) DO NOTHING;
```

#### 3. Create Foreign Key Relationships

```sql
-- Add foreign key constraint from quota to counterparty
ALTER TABLE quota 
ADD CONSTRAINT fk_quota_counterparty 
FOREIGN KEY (counterparty_id) 
REFERENCES counterparty(counterparty_id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Add foreign key constraint from call_off to counterparty
ALTER TABLE call_off 
ADD CONSTRAINT fk_call_off_counterparty 
FOREIGN KEY (counterparty_id) 
REFERENCES counterparty(counterparty_id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Add foreign key constraint from call_off to quota
ALTER TABLE call_off 
ADD CONSTRAINT fk_call_off_quota 
FOREIGN KEY (quota_id) 
REFERENCES quota(quota_id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
```

#### 4. Link Existing Quotas to Counterparties

If you have existing quota data, you'll need to update the counterparty_id fields:

```sql
-- Update quotas to reference actual counterparties
-- This example assigns random counterparties - you should use actual business logic
UPDATE quota 
SET counterparty_id = (
  SELECT counterparty_id 
  FROM counterparty 
  WHERE company_code = 'YOUR_COMPANY_CODE'
) 
WHERE quota_id = 'your-quota-id';
```

## 🛠️ Automated Setup via Edge Functions

### Alternative: Use Edge Function Endpoints

Instead of running SQL manually, you can use these endpoints after deploying the Edge Functions:

#### 1. Create Counterparty Table
```bash
curl -X POST "https://YOUR_PRODUCTION_SUPABASE_URL/functions/v1/calloff-crud/create-counterparty-table" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### 2. Link Quotas to Counterparties  
```bash
curl -X POST "https://YOUR_PRODUCTION_SUPABASE_URL/functions/v1/calloff-crud/link-quotas-to-counterparties" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### 3. Create Foreign Key Relationships
```bash
curl -X POST "https://YOUR_PRODUCTION_SUPABASE_URL/functions/v1/calloff-crud/create-foreign-keys" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 📋 Pre-Production Checklist

### Environment Setup
- [ ] Production Supabase project created
- [ ] Environment variables configured in `.env.local`
- [ ] Switch to production environment: `./scripts/switch-env.sh production`

### Database Deployment
- [ ] All existing migrations applied: `npx supabase db push`
- [ ] Counterparty table created (SQL or Edge Function)
- [ ] Sample/production counterparty data inserted
- [ ] Quotas linked to counterparties
- [ ] Foreign key relationships created
- [ ] Database schema integrity verified

### Application Deployment
- [ ] Edge Functions deployed: `npx supabase functions deploy`
- [ ] Frontend built and deployed: `npm run build`
- [ ] Environment variables verified in production
- [ ] API endpoints tested with production data

### Testing & Verification
- [ ] Quota API returns counterparty data: `/functions/v1/calloff-crud/quotas`
- [ ] Counterparty selection API works: `/functions/v1/calloff-crud/counterparties`
- [ ] Filtered quota API works: `/functions/v1/calloff-crud/counterparties/{id}/quotas`
- [ ] Call-off creation wizard workflow functions correctly
- [ ] Frontend displays company names instead of UUIDs
- [ ] All CRUD operations functional

## 🔄 Ongoing Maintenance

### Adding New Counterparties

When adding new trading partners:

1. **Via SQL:**
```sql
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, primary_contact_name, city) 
VALUES ('New Company Ltd', 'NEWCO', 'CUSTOMER', 'US', 'John Doe', 'New York');
```

2. **Via Application:** Create a counterparty management UI (future enhancement)

### Monitoring

Monitor these key areas:
- Database performance (quota queries with joins)
- Edge Function execution times
- API error rates for counterparty-related operations

## 🚨 Rollback Plan

If issues arise after deployment:

1. **Database rollback:** Restore from backup before counterparty table creation
2. **Application rollback:** Redeploy previous Edge Function version
3. **Data fix:** Remove counterparty relationships if needed:
```sql
-- Emergency: Remove counterparty links to restore basic functionality
UPDATE quota SET counterparty_id = NULL;
```

## 📝 Environment-Specific Notes

### Development vs Production Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| Counterparty Data | Sample companies (Acme, Global Metals) | Real trading partners |
| Quota Assignment | Random assignment | Business logic-based |
| Data Volume | 10-20 test quotas | Hundreds/thousands |
| Performance | Not critical | Optimized for scale |

### Security Considerations

- Use Row-Level Security (RLS) policies for counterparty data
- Ensure service role keys are properly secured
- Limit API access to authorized users only
- Regular backup of counterparty master data

---

*Last updated: July 13, 2025*
*Environment: Production deployment preparation*