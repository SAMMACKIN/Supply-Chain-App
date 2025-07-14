-- Create indexes and enable RLS
BEGIN;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_counterparty_company_code ON counterparty(company_code);
CREATE INDEX IF NOT EXISTS idx_counterparty_type ON counterparty(counterparty_type);
CREATE INDEX IF NOT EXISTS idx_counterparty_active ON counterparty(is_active);

CREATE INDEX IF NOT EXISTS idx_quota_counterparty ON quota(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_quota_period ON quota(period_month);
CREATE INDEX IF NOT EXISTS idx_quota_direction ON quota(direction);

CREATE INDEX IF NOT EXISTS idx_call_off_quota ON call_off(quota_id);
CREATE INDEX IF NOT EXISTS idx_call_off_counterparty ON call_off(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_call_off_status ON call_off(status);
CREATE INDEX IF NOT EXISTS idx_call_off_number ON call_off(call_off_number);

CREATE INDEX IF NOT EXISTS idx_transport_order_status ON transport_order(status);
CREATE INDEX IF NOT EXISTS idx_transport_order_carrier ON transport_order(carrier_name);

CREATE INDEX IF NOT EXISTS idx_shipment_line_call_off ON call_off_shipment_line(call_off_id);
CREATE INDEX IF NOT EXISTS idx_shipment_line_transport_order ON call_off_shipment_line(transport_order_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Apply update triggers
CREATE TRIGGER update_counterparty_updated_at BEFORE UPDATE ON counterparty 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_off_updated_at BEFORE UPDATE ON call_off 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE counterparty ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_off_shipment_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read" ON counterparty
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON quota
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON call_off
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON call_off_shipment_line
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON transport_order
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

COMMIT;