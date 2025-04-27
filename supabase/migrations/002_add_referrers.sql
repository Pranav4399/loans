-- Create enum type for relationship
CREATE TYPE referrer_relationship AS ENUM (
    'Family',
    'Friend',
    'Colleague',
    'Business Associate',
    'Other'
);

-- Create referrers table
CREATE TABLE referrers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Referrer Information
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    relationship_to_applicant referrer_relationship NOT NULL,
    
    -- Metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT referrer_phone_number_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
    CONSTRAINT unique_referrer_phone_number UNIQUE (phone_number)
);

-- Add referrer relationship to loan applications
ALTER TABLE loan_applications
    ADD COLUMN referrer_id UUID REFERENCES referrers(id),
    ADD COLUMN is_referral BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX idx_referrers_phone_number ON referrers(phone_number);
CREATE INDEX idx_loan_applications_referrer_id ON loan_applications(referrer_id);
CREATE INDEX idx_loan_applications_is_referral ON loan_applications(is_referral);

-- Add RLS (Row Level Security) policies
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;

-- Create policies for referrers table
CREATE POLICY "Enable read access for all users" ON referrers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all users" ON referrers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON referrers FOR UPDATE TO authenticated USING (true);

-- Update conversation_states to handle referral flow
ALTER TABLE conversation_states
    ADD COLUMN is_referral BOOLEAN DEFAULT FALSE,
    ADD COLUMN referrer_data JSONB DEFAULT '{}'::jsonb; 