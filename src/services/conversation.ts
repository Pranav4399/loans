import { ConversationState, LoanApplication } from '../types/database';
import { getConversationState, updateConversationState } from '../config/supabase';
import { FORM_STEPS, STEP_MESSAGES, FormStep } from './chatbot';
import { validators } from '../utils/validation';
import logger from '../config/logger';

export interface StepHandler {
  validate: (input: string) => boolean | string;
  process: (input: string) => Partial<LoanApplication>;
  getNextStep: (currentData: Partial<LoanApplication>) => FormStep;
}

// Step handlers for each form field
const stepHandlers: Record<FormStep, StepHandler> = {
  start: {
    validate: (input: string): boolean => input.toLowerCase() === 'yes',
    process: () => ({}),
    getNextStep: () => 'full_name',
  },
  full_name: {
    validate: (input: string): boolean | string => input.length >= 2 || 'Name must be at least 2 characters long',
    process: (input: string) => ({ full_name: input.trim() }),
    getNextStep: () => 'email',
  },
  email: {
    validate: (input: string): boolean | string => validators.email(input) || 'Please enter a valid email address',
    process: (input: string) => ({ email: input.trim().toLowerCase() }),
    getNextStep: () => 'loan_type',
  },
  loan_type: {
    validate: (input: string): boolean | string => {
      const validOptions = { '1': 'Personal', '2': 'Business', '3': 'Education', '4': 'Home' };
      return input in validOptions || 'Please select a valid option (1-4)';
    },
    process: (input: string) => {
      const options = { '1': 'Personal', '2': 'Business', '3': 'Education', '4': 'Home' } as const;
      return { loan_type: options[input as keyof typeof options] };
    },
    getNextStep: () => 'loan_amount',
  },
  loan_amount: {
    validate: (input: string): boolean | string => validators.number(input) || 'Please enter a valid amount',
    process: (input: string) => ({ loan_amount: Number(input) }),
    getNextStep: () => 'purpose',
  },
  purpose: {
    validate: (input: string): boolean | string => input.length >= 10 || 'Please provide more details (min 10 characters)',
    process: (input: string) => ({ purpose: input.trim() }),
    getNextStep: () => 'monthly_income',
  },
  monthly_income: {
    validate: (input: string): boolean | string => validators.number(input) || 'Please enter a valid amount',
    process: (input: string) => ({ monthly_income: Number(input) }),
    getNextStep: () => 'employment_status',
  },
  employment_status: {
    validate: (input: string): boolean | string => {
      if (input.toLowerCase() === 'skip') return true;
      const validOptions = { '1': true, '2': true, '3': true };
      return input in validOptions || 'Please select a valid option (1-3) or type SKIP';
    },
    process: (input: string) => {
      if (input.toLowerCase() === 'skip') return {};
      const options = { '1': 'Salaried', '2': 'Self-employed', '3': 'Business Owner' } as const;
      return { employment_status: options[input as keyof typeof options] };
    },
    getNextStep: (data: Partial<LoanApplication>) => data.employment_status ? 'current_employer' : 'existing_loans',
  },
  current_employer: {
    validate: (input: string): boolean => input.toLowerCase() === 'skip' || input.length >= 2,
    process: (input: string) => input.toLowerCase() === 'skip' ? {} : { current_employer: input.trim() },
    getNextStep: () => 'years_employed',
  },
  years_employed: {
    validate: (input: string): boolean => input.toLowerCase() === 'skip' || validators.number(input),
    process: (input: string) => input.toLowerCase() === 'skip' ? {} : { years_employed: Number(input) },
    getNextStep: () => 'existing_loans',
  },
  existing_loans: {
    validate: (input: string): boolean => {
      const normalized = input.toLowerCase();
      return normalized === 'skip' || normalized === 'yes' || normalized === 'no';
    },
    process: (input: string) => {
      const normalized = input.toLowerCase();
      return normalized === 'skip' ? {} : { existing_loans: normalized === 'yes' };
    },
    getNextStep: () => 'preferred_tenure',
  },
  preferred_tenure: {
    validate: (input: string): boolean => input.toLowerCase() === 'skip' || validators.number(input),
    process: (input: string) => input.toLowerCase() === 'skip' ? {} : { preferred_tenure: Number(input) },
    getNextStep: () => 'preferred_communication',
  },
  preferred_communication: {
    validate: (input: string): boolean | string => {
      if (input.toLowerCase() === 'skip') return true;
      const validOptions = { '1': true, '2': true, '3': true };
      return input in validOptions || 'Please select a valid option (1-3) or type SKIP';
    },
    process: (input: string) => {
      if (input.toLowerCase() === 'skip') return {};
      const options = { '1': 'WhatsApp', '2': 'Email', '3': 'Both' } as const;
      return { preferred_communication: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  review: {
    validate: (input: string): boolean => {
      const normalized = input.toLowerCase();
      return normalized === 'yes' || normalized === 'no';
    },
    process: () => ({}),
    getNextStep: () => 'confirm',
  },
  confirm: {
    validate: (): boolean => true,
    process: () => ({}),
    getNextStep: () => 'start',
  },
};

export async function handleConversationStep(
  phoneNumber: string,
  message: string
): Promise<{ nextMessage: string; isComplete: boolean }> {
  try {
    // Get current conversation state
    let state = await getConversationState(phoneNumber);
    
    // Initialize new conversation if none exists
    if (!state) {
      state = await updateConversationState(phoneNumber, {
        current_step: 'start',
        form_data: {},
        phone_number: phoneNumber,
        is_complete: false,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });
    }

    const currentStep = state.current_step as FormStep;
    const handler = stepHandlers[currentStep];
    
    if (!handler) {
      throw new Error(`No handler found for step: ${currentStep}`);
    }

    // Validate input
    const validationResult = handler.validate(message);
    if (validationResult !== true) {
      return {
        nextMessage: typeof validationResult === 'string' 
          ? validationResult 
          : 'Invalid input, please try again.',
        isComplete: false,
      };
    }

    // Process input and update form data
    const newData = handler.process(message);
    const updatedFormData = { ...state.form_data, ...newData };
    
    // Determine next step
    const nextStep = handler.getNextStep(updatedFormData);
    
    // Update conversation state
    await updateConversationState(phoneNumber, {
      current_step: nextStep,
      form_data: updatedFormData,
      last_updated: new Date().toISOString(),
    });

    // Return next message
    return {
      nextMessage: typeof STEP_MESSAGES[nextStep] === 'function' 
        ? (STEP_MESSAGES[nextStep] as (state: ConversationState) => string)({ ...state, current_step: nextStep, form_data: updatedFormData })
        : STEP_MESSAGES[nextStep] as string,
      isComplete: nextStep === 'review',
    };
  } catch (error) {
    logger.error('Error handling conversation step:', { error, phoneNumber, message });
    throw error;
  }
} 