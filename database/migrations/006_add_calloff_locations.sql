-- Add location fields to call_off table for better logistics management
-- fulfillment_location: Where we source goods from (for SELL direction)
-- delivery_location: Where we deliver to (for SELL with delivery incoterms)

ALTER TABLE call_off 
ADD COLUMN IF NOT EXISTS fulfillment_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(100);

-- Add comments for clarity
COMMENT ON COLUMN call_off.fulfillment_location IS 'For SELL direction: warehouse or location where goods are sourced from';
COMMENT ON COLUMN call_off.delivery_location IS 'For SELL direction with delivery incoterms: customer delivery location';