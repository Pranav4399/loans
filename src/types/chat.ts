import { LeadInfo } from './database';

// Form steps configuration
export type FormStep = 
  | 'start'
  | 'category'
  | 'loan_subcategory'
  | 'insurance_subcategory'
  | 'full_name'
  | 'contact_number'
  | 'confirm';

// Step constants
export const FORM_STEPS = {
  START: 'start',
  CATEGORY: 'category',
  LOAN_SUBCATEGORY: 'loan_subcategory',
  INSURANCE_SUBCATEGORY: 'insurance_subcategory',
  FULL_NAME: 'full_name',
  CONTACT_NUMBER: 'contact_number',
  CONFIRM: 'confirm',
} as const;

// Conversation state interface
export interface ConversationState {
  id?: string;
  phone_number: string;
  current_step: FormStep;
  form_data: Partial<LeadInfo>;
  created_at?: string;
  last_updated?: string;
  is_complete?: boolean;
}

// Step message type
export type StepMessage = string; 