-- Create enum types
CREATE TYPE loan_type AS ENUM ('Personal', 'Business', 'Education', 'Home');
CREATE TYPE employment_status AS ENUM ('Salaried', 'Self-employed', 'Business Owner');
CREATE TYPE application_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');
CREATE TYPE communication_preference AS ENUM ('WhatsApp', 'Email', 'Both');

-- Create loan applications table
CREATE TABLE loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Essential Information
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    loan_type loan_type NOT NULL,
    loan_amount DECIMAL NOT NULL,
    purpose TEXT NOT NULL,
    monthly_income DECIMAL NOT NULL,
    
    -- Optional Information
    employment_status employment_status,
    current_employer TEXT,
    years_employed DECIMAL,
    existing_loans BOOLEAN,
    preferred_tenure INTEGER,
    preferred_communication communication_preference,
    
    -- Metadata
    status application_status NOT NULL DEFAULT 'pending',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT phone_number_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- Create conversation states table
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    current_step TEXT NOT NULL,
    form_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_complete BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT phone_number_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- Create indexes
CREATE INDEX idx_loan_applications_phone_number ON loan_applications(phone_number);
CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_conversation_states_phone_number ON conversation_states(phone_number);
CREATE INDEX idx_conversation_states_is_complete ON conversation_states(is_complete);

-- Add RLS (Row Level Security) policies
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON loan_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all users" ON loan_applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON loan_applications FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read access for all users" ON conversation_states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all users" ON conversation_states FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON conversation_states FOR UPDATE TO authenticated USING (true); 