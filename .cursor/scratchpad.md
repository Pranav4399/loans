# WhatsApp Loan Form Chatbot Project

## Background and Motivation
- Create a simple WhatsApp chatbot that helps users fill out a loan application form
- Data will be stored in Supabase database
- Focus on simplicity and essential functionality only

## Key Challenges and Analysis
1. WhatsApp Integration
   - Need to use WhatsApp Business API or a third-party service (Twilio/MessageBird)
   - Handle message webhooks and responses
   - Maintain conversation state

2. Form Flow Design
   - Keep questions simple and clear
   - Handle user input validation
   - Allow users to review before submission

3. Data Storage
   - Supabase table design for loan applications
   - Secure storage of sensitive information
   - Handle concurrent submissions

## High-level Task Breakdown

### Phase 1: Setup and Infrastructure
1. Initialize project and dependencies
   - Success Criteria: Project structure created with necessary dependencies
   - Tools: Node.js, TypeScript, necessary WhatsApp API packages

2. Setup Supabase project and database
   - Success Criteria: Supabase project created with proper tables
   - Create table for loan applications with necessary fields

3. Setup WhatsApp Business API account
   - Success Criteria: Working API credentials and webhook URL

### Phase 2: Core Implementation
4. Implement basic webhook handler
   - Success Criteria: Server receives and logs WhatsApp messages

5. Implement conversation flow manager
   - Success Criteria: Can maintain state of form filling process
   - Handle user responses and validation

6. Create form questions flow
   - Success Criteria: Bot can ask questions in sequence
   - Fields to include:
     Essential Information:
     - Full Name
     - Phone Number
     - Email Address (for loan updates)
     - Type of Loan (Personal/Business/Education/Home)
     - Loan Amount
     - Purpose of Loan
     - Monthly Income

     Optional Additional Information:
     - Employment Status (Salaried/Self-employed/Business Owner)
     - Current Employer (if salaried)
     - Years at Current Job/Business
     - Existing Loan Commitments (Yes/No)
     - Preferred Loan Tenure (in years)
     - Preferred Mode of Communication (WhatsApp/Email/Both)

7. Implement data storage in Supabase
   - Success Criteria: Form submissions successfully stored in database

### Phase 3: Testing and Deployment
8. Test end-to-end flow
   - Success Criteria: Complete form submission works
   - Error handling works as expected

9. Deploy to production
   - Success Criteria: Bot accessible via WhatsApp
   - Webhook endpoints properly configured

## Project Status Board
- [x] Task 1: Database Schema Updates (Completed)
  - [x] Created new 'referrers' table with necessary fields
  - [x] Added referrer relationship to loan applications
  - [x] Added indexes and constraints
  - [x] Added RLS policies
  - [x] Updated conversation_states for referral flow
- [x] Task 2: Backend API Updates (Completed)
  - [x] Updated database types to include referrer interfaces
  - [x] Created referrer service with CRUD operations
  - [x] Added helper functions for referrer-related queries
  - [x] Set up Supabase client configuration
- [x] Task 3: Frontend Form Flow Updates (Completed)
  - [x] Added new form steps for referrer flow
  - [x] Updated conversation state handling
  - [x] Added validation for referrer fields
  - [x] Integrated referrer creation/update in flow
  - [x] Added help messages and error handling
- [ ] Task 4: Testing and Validation (Not Started)

## Current Status / Progress Tracking
- Added new form steps:
  - is_referral: Choose between self-application and referral
  - referrer_details: Introduction to referrer information collection
  - referrer_name: Collect referrer's full name
  - referrer_phone: Collect referrer's phone number
  - referrer_email: Collect referrer's email
  - referrer_relationship: Specify relationship with applicant
- Added validation for all referrer fields
- Implemented referrer data persistence
- Added proper error messages and help text
- Updated conversation flow to handle both direct and referral applications
- Ready for review before proceeding to Task 4

## Executor's Feedback or Assistance Requests
To complete the deployment, I need:
1. Confirmation to proceed with Heroku CLI installation and app creation
2. Production environment variable values for:
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER
   - SUPABASE_URL
   - SUPABASE_ANON_KEY

## Lessons
- Keep form questions minimal to avoid user drop-off
- Store conversation state to handle interrupted chats
- Implement proper error handling for network issues
- Make additional fields optional to not overwhelm users
- Provide predefined options where possible to make input easier
- Allow users to skip optional fields with a simple command
- Add clear validation messages to guide users
- Include emoji for better user experience
- Handle edge cases like invalid inputs and timeouts
- TypeScript and Express type definitions need careful handling
- Implement step-by-step validation for better user experience
- Use type-safe handlers for form fields

# Referrer Functionality Implementation Plan

## Background and Motivation
- Currently, the system allows users to directly apply for loans by filling out a form with their details
- A new requirement has been added to allow referrers to submit loan applications on behalf of others
- This requires capturing both the loan applicant's details and the referrer's information
- The goal is to reuse the existing form while adding referrer-specific functionality

## Key Challenges and Analysis
1. Data Model Extension
   - Need to extend the database schema to store referrer information
   - Must maintain relationships between referrers and loan applications
   - Need to track which applications came through referrers

2. UI/UX Considerations
   - Need to clearly distinguish between direct applications and referral applications
   - Must maintain a smooth user experience while collecting additional information
   - Should make it clear who the application is for vs who is submitting it

3. Form Flow Modifications
   - Need to modify the existing form flow to accommodate referrer information
   - Must ensure validation works for both direct and referral applications
   - Need to handle the submission and storage of both sets of information

## High-level Task Breakdown

1. Database Schema Updates
   - [ ] Create a new 'referrers' table in the database
   - [ ] Add necessary foreign key relationships to loan applications
   - Success Criteria: Database schema updated and migrations run successfully

2. Backend API Updates
   - [ ] Create new endpoints for referrer-related operations
   - [ ] Modify existing loan application endpoints to handle referrer data
   - Success Criteria: API endpoints tested and working correctly

3. Frontend Form Flow Updates
   - [ ] Add a toggle/switch to indicate if application is being submitted by a referrer
   - [ ] Create new form components for referrer information
   - [ ] Modify form submission logic to handle both flows
   - Success Criteria: Form correctly handles both direct and referral applications

4. Testing and Validation
   - [ ] Add tests for new database operations
   - [ ] Add tests for new API endpoints
   - [ ] Add tests for form validation and submission
   - Success Criteria: All tests passing, both flows working as expected

## Project Status Board
- [ ] Task 1: Database Schema Updates (Not Started)
- [ ] Task 2: Backend API Updates (Not Started)
- [ ] Task 3: Frontend Form Flow Updates (Not Started)
- [ ] Task 4: Testing and Validation (Not Started)

## Current Status / Progress Tracking
- Project initialized
- Initial planning completed
- Awaiting approval to begin implementation

## Executor's Feedback or Assistance Requests
- No feedback yet

## Lessons
- No lessons recorded yet 