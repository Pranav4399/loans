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
    validate: (input: string): boolean | string => 
      validators.fullName(input) || 'Please enter your full name with at least first and last name',
    process: (input: string) => ({ full_name: input.trim() }),
    getNextStep: () => 'review',
  },
  email: {
    validate: (input: string): boolean | string => 
      validators.email(input) || 'Please enter a valid email address',
    process: (input: string) => ({ email: input.trim().toLowerCase() }),
    getNextStep: () => 'review',
  },
  loan_type: {
    validate: (input: string): boolean | string => 
      validators.loanType(input) || 'Please select a valid option (1-4)',
    process: (input: string) => {
      const options = { '1': 'Personal', '2': 'Business', '3': 'Education', '4': 'Home' } as const;
      return { loan_type: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  loan_amount: {
    validate: (input: string): boolean | string => 
      validators.loanAmount(input) || 'Please enter a valid amount between ₹10,000 and ₹1,00,00,000',
    process: (input: string) => ({ loan_amount: Number(input) }),
    getNextStep: () => 'review',
  },
  purpose: {
    validate: (input: string): boolean | string => 
      validators.purpose(input) || 'Please provide a clear purpose between 10 and 100 characters',
    process: (input: string) => ({ purpose: input.trim() }),
    getNextStep: () => 'review',
  },
  monthly_income: {
    validate: (input: string): boolean | string => 
      validators.monthlyIncome(input) || 'Please enter a valid monthly income between ₹10,000 and ₹10,00,000',
    process: (input: string) => ({ monthly_income: Number(input) }),
    getNextStep: () => 'review',
  },
  employment_status: {
    validate: (input: string): boolean | string => 
      validators.employmentStatus(input) || 'Please select a valid employment status (1-3)',
    process: (input: string) => {
      const options = { '1': 'Salaried', '2': 'Self-employed', '3': 'Business Owner' } as const;
      return { employment_status: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  current_employer: {
    validate: (input: string): boolean | string => 
      validators.currentEmployer(input) || 'Please enter a valid employer name (2-50 characters)',
    process: (input: string) => ({ current_employer: input.trim() }),
    getNextStep: () => 'review',
  },
  years_employed: {
    validate: (input: string): boolean | string => 
      validators.yearsEmployed(input) || 'Please enter a valid number of years (1-50)',
    process: (input: string) => ({ years_employed: Number(input) }),
    getNextStep: () => 'review',
  },
  existing_loans: {
    validate: (input: string): boolean | string => 
      validators.yesNo(input) || 'Please reply with YES or NO',
    process: (input: string) => ({ existing_loans: input.toLowerCase() === 'yes' }),
    getNextStep: (data: Partial<LoanApplication>) => data.existing_loans ? 'cibil_consent' : 'preferred_tenure',
  },
  cibil_consent: {
    validate: (input: string): boolean | string => 
      validators.yesNo(input) || 'Please reply with YES or NO for CIBIL score consent',
    process: (input: string) => ({ cibil_consent: input.toLowerCase() === 'yes' }),
    getNextStep: () => 'review',
  },
  preferred_tenure: {
    validate: (input: string): boolean | string => 
      validators.preferredTenure(input) || 'Please enter a valid tenure between 3 and 360 months',
    process: (input: string) => ({ preferred_tenure: Number(input) }),
    getNextStep: () => 'review',
  },
  preferred_communication: {
    validate: (input: string): boolean | string => 
      validators.communicationPreference(input) || 'Please select a valid communication preference (1-3)',
    process: (input: string) => {
      const options = { '1': 'WhatsApp', '2': 'Email', '3': 'Both' } as const;
      return { preferred_communication: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  review: {
    validate: (input: string): boolean => {
      const normalized = input.toLowerCase();
      return normalized === 'yes' || normalized === 'no' || normalized.startsWith('edit');
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

// Get previous step in the form flow
function getPreviousStep(currentStep: FormStep): FormStep {
  const steps: FormStep[] = [
    'start',
    'full_name',
    'email',
    'loan_type',
    'loan_amount',
    'purpose',
    'monthly_income',
    'employment_status',
    'current_employer',
    'years_employed',
    'existing_loans',
    'cibil_consent',
    'preferred_tenure',
    'preferred_communication',
    'review',
    'confirm'
  ];
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex > 0 ? steps[currentIndex - 1] : 'start';
}

// Help messages for each step
const HELP_MESSAGES: Record<FormStep, string> = {
  start: 'Type YES to start your loan application.\n\nYou can type EXIT at any time to cancel the current application.',
  full_name: 'Please enter your full name as it appears on official documents. Use letters and spaces only.',
  email: 'Enter a valid email address that you regularly check. We\'ll use this for important updates.',
  loan_type: 'Enter a number (1-4) to select your loan type:\n1. Personal Loan\n2. Business Loan\n3. Education Loan\n4. Home Loan',
  loan_amount: 'Enter the loan amount you need in numbers only (between ₹10,000 and ₹1,00,00,000). Don\'t include currency symbols or commas.',
  purpose: 'Briefly describe why you need this loan. Be specific but concise (10-100 characters).',
  monthly_income: 'Enter your monthly income in numbers only (between ₹10,000 and ₹10,00,000).',
  employment_status: 'Enter a number (1-3) to select your employment status:\n1. Salaried\n2. Self-employed\n3. Business Owner',
  current_employer: 'Enter your employer\'s name (2-50 characters).',
  years_employed: 'Enter the number of years you\'ve been employed (1-50 years).',
  existing_loans: 'Type YES if you have other loans, NO if you don\'t.',
  cibil_consent: 'Type YES to give consent for CIBIL score check, NO to deny consent.',
  preferred_tenure: 'Enter your preferred loan duration in months (between 3 and 360 months).',
  preferred_communication: 'Enter a number (1-3) to choose how we contact you:\n1. WhatsApp\n2. Email\n3. Both',
  review: 'Review your information and:\n• Type YES to submit\n• Type NO to start over\n• Type EDIT followed by the field number to make changes',
  confirm: 'Your application is complete! Type START for a new application or EXIT to end the conversation.'
};

// Handle navigation commands
async function handleNavigationCommand(
  command: string,
  state: ConversationState,
  phoneNumber: string
): Promise<{ nextMessage: string; handled: boolean }> {
  const normalizedCommand = command.toLowerCase().trim();

  switch (normalizedCommand) {
    case 'exit':
      // Reset the conversation state completely
      await updateConversationState(phoneNumber, {
        current_step: 'start',
        form_data: {},
        phone_number: phoneNumber,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_complete: false
      });

      return {
        nextMessage: '🔄 Current application cancelled. You can start a new application by typing YES.',
        handled: true
      };

    case 'back':
      if (state.current_step === 'start') {
        return {
          nextMessage: 'You\'re already at the start. Type YES to begin the application.',
          handled: true
        };
      }
      const previousStep = getPreviousStep(state.current_step as FormStep);
      await updateConversationState(phoneNumber, {
        current_step: previousStep,
        form_data: state.form_data // Preserve existing data
      });

      // Get the message for the previous step
      const prevStepMessage = STEP_MESSAGES[previousStep];
      const prevMessage = typeof prevStepMessage === 'function' 
        ? prevStepMessage({ ...state, current_step: previousStep })
        : prevStepMessage;

      return {
        nextMessage: prevMessage,
        handled: true
      };

    case 'restart':
      const newState: Partial<ConversationState> = {
        current_step: 'start',
        form_data: {},
        is_complete: false
      };
      await updateConversationState(phoneNumber, newState);

      // Get the start message
      const startMessage = STEP_MESSAGES.start;
      const message = typeof startMessage === 'function'
        ? startMessage({ ...state, ...newState })
        : startMessage;

      return {
        nextMessage: message,
        handled: true
      };

    case 'help':
      const helpMessage = HELP_MESSAGES[state.current_step as FormStep];
      return {
        nextMessage: `📌 Available commands:\n• EXIT - Cancel current application and start fresh\n• BACK - Go to previous step\n• RESTART - Start over\n• HELP - Show this message\n\n${helpMessage}`,
        handled: true
      };

    default:
      return {
        nextMessage: '',
        handled: false
      };
  }
} 