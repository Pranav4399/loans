-- ==========================================
-- Balan WhatsApp Bot Database Setup Script
-- ==========================================
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension for auto-generating IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUM TYPES
-- ==========================================

-- Category types for financial products
CREATE TYPE category_type AS ENUM (
  'Loans',
  'Insurance', 
  'Mutual Funds'
);

-- Lead status types
CREATE TYPE lead_status_type AS ENUM (
  'pending',
  'contacted',
  'converted',
  'closed'
);

-- Form step types for conversation flow
CREATE TYPE form_step_type AS ENUM (
  'start',
  'loan_subcategory',
  'insurance_subcategory', 
  'full_name',
  'contact_number',
  'confirm'
);

-- ==========================================
-- TABLES
-- ==========================================

-- Leads table - stores customer lead information
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  category category_type NOT NULL,
  subcategory VARCHAR(100) NOT NULL,
  status lead_status_type DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Conversation states table - tracks WhatsApp conversation progress
CREATE TABLE conversation_states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  current_step form_step_type NOT NULL,
  form_data JSONB DEFAULT '{}' NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Leads table indexes
CREATE INDEX idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_category ON leads (category);
CREATE INDEX idx_leads_contact_number ON leads (contact_number);

-- Conversation states table indexes
CREATE INDEX idx_conversation_phone_number ON conversation_states (phone_number);
CREATE INDEX idx_conversation_is_complete ON conversation_states (is_complete);
CREATE INDEX idx_conversation_last_updated ON conversation_states (last_updated DESC);
CREATE INDEX idx_conversation_phone_incomplete ON conversation_states (phone_number, is_complete) WHERE is_complete = FALSE;

-- ==========================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ==========================================

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for conversation_states table
CREATE TRIGGER update_conversation_states_last_updated
  BEFORE UPDATE ON conversation_states
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on both tables for security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role full access to leads
CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow service role full access to conversation_states  
CREATE POLICY "Service role can manage conversation_states" ON conversation_states
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for anonymous users (if needed for API access)
CREATE POLICY "Anonymous users can read leads with API key" ON leads
  FOR SELECT USING (true);

-- ==========================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ==========================================

-- Uncomment below to insert sample data for testing:

/*
-- Sample leads
INSERT INTO leads (full_name, contact_number, category, subcategory, status) VALUES
  ('John Smith', '+919876543210', 'Loans', 'Personal Loan', 'pending'),
  ('Priya Sharma', '+919876543211', 'Insurance', 'Health Insurance', 'contacted'),
  ('Rahul Kumar', '+919876543212', 'Mutual Funds', 'General Inquiry', 'converted');

-- Sample conversation state
INSERT INTO conversation_states (phone_number, current_step, form_data, is_complete) VALUES
  ('+919876543210', 'full_name', '{"category": "Loans", "subcategory": "Personal Loan"}', false);
*/

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Run these to verify your setup:

-- Check if tables were created successfully
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('leads', 'conversation_states');

-- Check if indexes were created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('leads', 'conversation_states');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('leads', 'conversation_states');

-- ==========================================
-- SETUP COMPLETE!
-- ==========================================

-- Your database is now ready for the WhatsApp bot!
-- 
-- Next steps:
-- 1. Update your .env file with Supabase credentials
-- 2. Make sure SUPABASE_SERVICE_KEY has the service_role key
-- 3. Test the connection by running your app
--
-- Tables created:
-- - leads: Stores customer lead information
-- - conversation_states: Tracks WhatsApp conversation progress
--
-- Features enabled:
-- - UUID auto-generation for primary keys
-- - Automatic timestamps (created_at, last_updated)
-- - Performance indexes on frequently queried columns
-- - Row Level Security for data protection
-- - Proper data types and constraints 