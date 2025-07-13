-- Create counterparty table for trading partners
CREATE TABLE IF NOT EXISTS counterparty (
  -- Primary key
  counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company identification
  company_name VARCHAR(200) NOT NULL,
  company_code VARCHAR(20) UNIQUE NOT NULL, -- Short code like "ACME", "TESCO", etc.
  
  -- Contact information
  primary_contact_name VARCHAR(100),
  primary_contact_email VARCHAR(100),
  primary_contact_phone VARCHAR(30),
  
  -- Address information
  address_line_1 VARCHAR(200),
  address_line_2 VARCHAR(200),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country_code CHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
  
  -- Business information
  counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
  tax_id VARCHAR(50),
  credit_rating VARCHAR(10), -- AAA, AA, A, BBB, etc.
  
  -- Trading terms
  default_currency CHAR(3) DEFAULT 'USD', -- ISO 4217
  payment_terms_days INTEGER DEFAULT 30,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_counterparty_company_code ON counterparty (company_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_company_name ON counterparty (company_name);
CREATE INDEX IF NOT EXISTS idx_counterparty_type ON counterparty (counterparty_type);
CREATE INDEX IF NOT EXISTS idx_counterparty_country ON counterparty (country_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_active ON counterparty (is_active) WHERE is_active = true;

-- Insert sample counterparties for development
INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, primary_contact_name, city) VALUES
('Acme Corporation', 'ACME', 'CUSTOMER', 'US', 'John Smith', 'New York'),
('Global Metals Ltd', 'GLOBAL', 'SUPPLIER', 'GB', 'Sarah Johnson', 'London'),
('TechCorp Industries', 'TECH', 'CUSTOMER', 'DE', 'Hans Mueller', 'Berlin'),
('Pacific Mining Co', 'PACIFIC', 'SUPPLIER', 'AU', 'Michael Chen', 'Sydney'),
('European Alloys SA', 'EURO', 'BOTH', 'FR', 'Marie Dubois', 'Paris'),
('American Steel Inc', 'AMSTEEL', 'CUSTOMER', 'US', 'Robert Wilson', 'Chicago'),
('Nordic Resources', 'NORDIC', 'SUPPLIER', 'NO', 'Erik Larsen', 'Oslo'),
('Asian Metals Trading', 'ASIAN', 'BOTH', 'SG', 'Li Wei', 'Singapore'),
('Brazilian Copper Ltd', 'BRAZIL', 'SUPPLIER', 'BR', 'Carlos Silva', 'São Paulo'),
('Canadian Minerals Corp', 'CANADA', 'SUPPLIER', 'CA', 'Emma Brown', 'Toronto')
ON CONFLICT (company_code) DO NOTHING;