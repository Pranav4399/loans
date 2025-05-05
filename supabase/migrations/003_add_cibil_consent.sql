-- Migration to add cibil_consent column to loan_applications table
-- This migration adds the missing cibil_consent column mentioned in the application code

-- Add cibil_consent column to loan_applications table
ALTER TABLE loan_applications
    ADD COLUMN cibil_consent BOOLEAN;

-- Add a comment to the column for documentation
COMMENT ON COLUMN loan_applications.cibil_consent IS 'Indicates whether the applicant has consented to CIBIL score check';

-- Update existing records to have a default value (null, meaning consent not provided)
-- You can modify this if you want a different default
-- UPDATE loan_applications SET cibil_consent = false WHERE cibil_consent IS NULL; 