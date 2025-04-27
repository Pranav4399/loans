import { ConversationState, LoanApplication } from '../types/database';
import { getConversationState, updateConversationState, createLoanApplication } from '../config/supabase';
import { sendWhatsAppMessage } from '../config/twilio';
import { StepHandler } from '../services/conversation';
import { validators } from '../utils/validation';
import logger from '../config/logger';

// Form steps configuration
export type FormStep = 
  | 'start'
  | 'full_name'
  | 'email'
  | 'loan_type'
  | 'loan_amount'
  | 'purpose'
  | 'monthly_income'
  | 'employment_status'
  | 'current_employer'
  | 'years_employed'
  | 'existing_loans'
  | 'cibil_consent'
  | 'preferred_tenure'
  | 'preferred_communication'
  | 'review'
  | 'confirm';

export const FORM_STEPS: Record<Uppercase<FormStep>, FormStep> = {
  START: 'start',
  FULL_NAME: 'full_name',
  EMAIL: 'email',
  LOAN_TYPE: 'loan_type',
  LOAN_AMOUNT: 'loan_amount',
  PURPOSE: 'purpose',
  MONTHLY_INCOME: 'monthly_income',
  EMPLOYMENT_STATUS: 'employment_status',
  CURRENT_EMPLOYER: 'current_employer',
  YEARS_EMPLOYED: 'years_employed',
  EXISTING_LOANS: 'existing_loans',
  CIBIL_CONSENT: 'cibil_consent',
  PREFERRED_TENURE: 'preferred_tenure',
  PREFERRED_COMMUNICATION: 'preferred_communication',
  REVIEW: 'review',
  CONFIRM: 'confirm'
} as const;

// Calculate form progress
function calculateProgress(currentStep: FormStep, formData: Partial<LoanApplication>): {
  currentStepNumber: number;
  totalSteps: number;
  percentage: number;
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
} {
  const steps: FormStep[] = Object.values(FORM_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  
  // Define required fields
  const requiredFields = [
    'full_name',
    'email',
    'loan_type',
    'loan_amount',
    'purpose',
    'monthly_income'
  ];
  
  // Count completed required fields
  const completedRequired = requiredFields.filter(field => 
    formData[field as keyof LoanApplication] !== undefined
  ).length;
  
  // Calculate percentage (based on required fields)
  const percentage = Math.round((completedRequired / requiredFields.length) * 100);
  
  return {
    currentStepNumber: currentIndex + 1,
    totalSteps: steps.length,
    percentage,
    requiredFieldsCompleted: completedRequired,
    totalRequiredFields: requiredFields.length
  };
}

// Format progress message
function getProgressMessage(currentStep: FormStep, formData: Partial<LoanApplication>): string {
  const progress = calculateProgress(currentStep, formData);
  
  // Don't show progress for start and confirm steps
  if (currentStep === 'start' || currentStep === 'confirm') {
    return '';
  }

  // Show detailed progress for review step
  if (currentStep === 'review') {
    return `📊 Progress: ${progress.percentage}% complete\n` +
           `✅ ${progress.requiredFieldsCompleted}/${progress.totalRequiredFields} required fields completed\n\n`;
  }

  // Show step progress for all other steps
  return `📊 Step ${progress.currentStepNumber} of ${progress.totalSteps}\n` +
         `✅ Progress: ${progress.percentage}%\n\n`;
}

// Questions for each step
export type StepMessage = string | ((state: ConversationState) => string);
export const STEP_MESSAGES: Record<FormStep, StepMessage> = {
  start: '👋 Welcome to the Loan Application Bot!\n\nI\'ll help you complete your loan application step by step. You can type:\n• BACK - to go to previous step\n• RESTART - to start over\n• HELP - to see instructions\n\nReady to begin? (Reply YES to start)',
  
  full_name: (state: ConversationState) => {
    const progress = getProgressMessage('full_name', state.form_data);
    return progress + '📝 What is your full name?\n\nPlease enter your complete name as it appears on official documents.\nExample: "John Michael Smith"';
  },
  
  email: (state: ConversationState) => {
    const progress = getProgressMessage('email', state.form_data);
    return progress + '📧 What\'s your email address?\n\nWe\'ll use this to send you important updates about your application.\nExample: "john.smith@email.com"';
  },
  
  loan_type: (state: ConversationState) => {
    const progress = getProgressMessage('loan_type', state.form_data);
    return progress + '💰 What type of loan are you interested in?\n\nChoose from these options:\n1️⃣ Personal Loan\n2️⃣ Business Loan\n3️⃣ Education Loan\n4️⃣ Home Loan\n\nReply with the number (1-4)';
  },
  
  loan_amount: (state: ConversationState) => {
    const progress = getProgressMessage('loan_amount', state.form_data);
    return progress + '💵 How much would you like to borrow?\n\nPlease enter the amount in numbers only.\nExample: "50000"';
  },
  
  purpose: (state: ConversationState) => {
    const progress = getProgressMessage('purpose', state.form_data);
    return progress + '🎯 What\'s the purpose of this loan?\n\nPlease provide a brief description (minimum 10 characters).\nExample: "Home renovation" or "Business expansion"';
  },
  
  monthly_income: (state: ConversationState) => {
    const progress = getProgressMessage('monthly_income', state.form_data);
    return progress + '💸 What is your monthly income?\n\nPlease enter the amount in numbers only.\nExample: "45000"';
  },
  
  employment_status: (state: ConversationState) => {
    const progress = getProgressMessage('employment_status', state.form_data);
    return progress + '👔 What is your employment status?\n\nChoose from these options:\n1️⃣ Salaried\n2️⃣ Self-employed\n3️⃣ Business Owner\n\nReply with the number (1-3) or type SKIP if you prefer not to answer';
  },
  
  current_employer: (state: ConversationState) => {
    const progress = getProgressMessage('current_employer', state.form_data);
    return progress + '🏢 Who is your current employer?\n\nEnter your company name or type SKIP if you prefer not to answer.\nExample: "Tech Solutions Inc."';
  },
  
  years_employed: (state: ConversationState) => {
    const progress = getProgressMessage('years_employed', state.form_data);
    return progress + '⏳ How many years have you been with your current employer?\n\nEnter the number of years or type SKIP if you prefer not to answer.\nExample: "3"';
  },
  
  existing_loans: (state: ConversationState) => {
    const progress = getProgressMessage('existing_loans', state.form_data);
    return progress + '📊 Do you have any existing loans?\n\nReply with:\n• YES - if you have existing loans\n• NO - if you don\'t have any loans';
  },
  
  cibil_consent: (state: ConversationState) => {
    const progress = getProgressMessage('cibil_consent', state.form_data);
    return progress + '📋 Since you have existing loans, we would like to check your CIBIL score to better assess your application.\n\nDo you consent to us pulling your CIBIL score?\n\nReply with:\n• YES - I consent\n• NO - I do not consent';
  },
  
  preferred_tenure: (state: ConversationState) => {
    const progress = getProgressMessage('preferred_tenure', state.form_data);
    return progress + '📅 What is your preferred loan tenure?\n\nEnter the number of months.\nExample: "24" for 2 years';
  },
  
  preferred_communication: (state: ConversationState) => {
    const progress = getProgressMessage('preferred_communication', state.form_data);
    return progress + '📱 How would you prefer to be contacted?\n\nChoose from these options:\n1️⃣ WhatsApp\n2️⃣ Email\n3️⃣ Both\n\nReply with the number (1-3) or type SKIP if you prefer not to answer';
  },
  
  review: (state: ConversationState) => {
    const progress = getProgressMessage('review', state.form_data);
    const summary = formatApplicationSummary(state.form_data);
    return `${progress}${summary}`;
  },
  
  confirm: '🎉 Thank you for completing your loan application!\n\nOur team will review your application and contact you soon through your preferred communication channel.\n\nReference Number: {ref_number}\n\nType START if you\'d like to submit another application.'
};

// Help message for each step
const HELP_MESSAGES: Record<FormStep, string> = {
  start: 'Type YES to start your loan application, or RESTART to begin again.',
  full_name: 'Please enter your full name as it appears on official documents. You can use letters and spaces.',
  email: 'Enter a valid email address that you regularly check. We\'ll use this for important updates.',
  loan_type: 'Enter a number (1-4) to select your loan type. Each option has different terms and requirements.',
  loan_amount: 'Enter the loan amount you need in numbers only. Don\'t include currency symbols or commas.',
  purpose: 'Briefly describe why you need this loan. Be specific but concise (at least 10 characters).',
  monthly_income: 'Enter your monthly income in numbers only. This helps us assess loan affordability.',
  employment_status: 'Enter a number (1-3) to select your employment status:\n1. Salaried\n2. Self-employed\n3. Business Owner',
  current_employer: 'Enter your employer\'s name. This information helps with loan assessment.',
  years_employed: 'Enter the number of years you\'ve been employed. Use whole numbers.',
  existing_loans: 'Type YES if you have other loans, NO if you don\'t. This helps us assess your current financial commitments.',
  cibil_consent: 'Please confirm if you consent to us checking your CIBIL score. Type YES to give consent or NO to deny consent.',
  preferred_tenure: 'Enter your preferred loan duration in months (e.g., 12 for 1 year, 24 for 2 years, 36 for 3 years).',
  preferred_communication: 'Enter a number (1-3) to choose how we contact you:\n1. WhatsApp\n2. Email\n3. Both',
  review: 'Review your information and type:\n• YES to submit\n• NO to restart\n• EDIT followed by the field number to make changes',
  confirm: 'Your application is complete! Type START if you want to submit another application.'
};

// Get previous step in the form flow
function getPreviousStep(currentStep: FormStep): FormStep {
  const steps: FormStep[] = Object.values(FORM_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex > 0 ? steps[currentIndex - 1] : 'start';
}

// Handle navigation commands
async function handleNavigationCommand(
  command: string,
  state: ConversationState,
  phoneNumber: string
): Promise<{ nextMessage: string; handled: boolean }> {
  const normalizedCommand = command.toLowerCase().trim();

  switch (normalizedCommand) {
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
        ? prevStepMessage(state) 
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
      return {
        nextMessage: HELP_MESSAGES[state.current_step as FormStep],
        handled: true
      };

    default:
      return {
        nextMessage: '',
        handled: false
      };
  }
}

// Format field value for display
function formatFieldValue(field: keyof LoanApplication, value: any): string {
  if (value === undefined || value === null) {
    return 'Not provided';
  }

  switch (field) {
    case 'loan_amount':
    case 'monthly_income':
      return `$${Number(value).toLocaleString()}`;
    case 'existing_loans':
      return value ? 'Yes' : 'No';
    case 'years_employed':
      return `${value} year${Number(value) === 1 ? '' : 's'}`;
    case 'preferred_tenure':
      return `${value} month${Number(value) === 1 ? '' : 's'}`;
    default:
      return String(value);
  }
}

// Get field label for display
function getFieldLabel(field: keyof LoanApplication): string {
  const labels: Record<keyof LoanApplication, string> = {
    full_name: 'Full Name',
    email: 'Email Address',
    phone_number: 'Phone Number',
    loan_type: 'Type of Loan',
    loan_amount: 'Loan Amount',
    purpose: 'Purpose',
    monthly_income: 'Monthly Income',
    employment_status: 'Employment Status',
    current_employer: 'Current Employer',
    years_employed: 'Years Employed',
    existing_loans: 'Existing Loans',
    cibil_consent: 'CIBIL Score Consent',
    preferred_tenure: 'Preferred Tenure',
    preferred_communication: 'Preferred Communication',
    status: 'Application Status',
    created_at: 'Created At',
    last_updated: 'Last Updated',
    id: 'Application ID'
  };
  return labels[field];
}

// Format application summary with field numbers for editing
function formatApplicationSummary(application: Partial<LoanApplication>): string {
  // Combine all fields into one section
  const allFields = [
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
    'preferred_tenure',
    'preferred_communication'
  ];

  let summary = '📋 Application Summary\n\n';
  
  // Add progress bar for all fields
  const completedFields = allFields.filter(field => 
    application[field as keyof LoanApplication] !== undefined
  ).length;
  const progressBar = '▓'.repeat(completedFields) + '░'.repeat(allFields.length - completedFields);
  summary += `📊 Progress: ${progressBar} (${Math.round((completedFields / allFields.length) * 100)}%)\n\n`;
  
  // All Information section
  summary += '📝 Application Information:\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━\n';
  allFields.forEach((field, index) => {
    const value = application[field as keyof LoanApplication];
    const label = getFieldLabel(field as keyof LoanApplication);
    const formattedValue = formatFieldValue(field as keyof LoanApplication, value);
    const status = value !== undefined ? '✅' : '❌';
    summary += `${index + 1}. ${label}\n   ${status} ${formattedValue}\n`;
  });

  // Instructions section
  summary += '\n📝 Review Instructions:\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '1. Review all information carefully\n';
  summary += '2. To edit any field:\n';
  summary += '   • Type EDIT followed by the field number\n';
  summary += '   • Example: "EDIT 3" to change loan type\n';
  summary += '3. When you\'re ready:\n';
  summary += '   ✅ Type YES to submit your application\n';
  summary += '   ❌ Type NO to start over\n';

  return summary;
}

// Get field by number from summary
function getFieldByNumber(number: number): FormStep | null {
  const fields: FormStep[] = [
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
    'preferred_tenure',
    'preferred_communication'
  ];
  
  return fields[number - 1] || null;
}

// Handle edit command in review step
async function handleEditCommand(
  command: string,
  state: ConversationState
): Promise<{ nextStep: FormStep; message: string } | null> {
  const match = command.match(/^edit\s+(\d+)$/i);
  if (!match) return null;

  const fieldNumber = parseInt(match[1], 10);
  const field = getFieldByNumber(fieldNumber);
  
  if (!field) {
    return {
      nextStep: 'review',
      message: 'Invalid field number. Please check the summary and try again.'
    };
  }

  const stepMessage = STEP_MESSAGES[field];
  const message = typeof stepMessage === 'function' 
    ? stepMessage(state) 
    : stepMessage;

  return {
    nextStep: field,
    message
  };
}

// Format error message with examples and suggestions
function formatErrorMessage(field: FormStep, error: string): string {
  const errorMessages: Record<FormStep, { examples: string[]; suggestions: string[] }> = {
    start: {
      examples: ['YES'],
      suggestions: ['Type YES in any case (yes, Yes, YES)']
    },
    full_name: {
      examples: ['John Smith', 'Mary Jane Wilson'],
      suggestions: [
        'Use your full legal name',
        'Include both first and last name',
        'Avoid special characters or numbers'
      ]
    },
    email: {
      examples: ['john.smith@email.com', 'mary.jane@company.co.uk'],
      suggestions: [
        'Include @ symbol and domain',
        'Check for typos',
        'Avoid spaces in email address'
      ]
    },
    loan_type: {
      examples: ['1', '2', '3', '4'],
      suggestions: [
        'Enter only the number (1-4)',
        'Choose from the options shown',
        'Don\'t type the loan name, just the number'
      ]
    },
    loan_amount: {
      examples: ['50000', '100000'],
      suggestions: [
        'Enter numbers only',
        'Don\'t include currency symbols or commas',
        'Must be greater than 0'
      ]
    },
    purpose: {
      examples: ['Home renovation project', 'Starting an online business'],
      suggestions: [
        'Be specific about how you\'ll use the loan',
        'Provide at least 10 characters',
        'Avoid vague descriptions'
      ]
    },
    monthly_income: {
      examples: ['45000', '75000'],
      suggestions: [
        'Enter numbers only',
        'Don\'t include currency symbols or commas',
        'Must be greater than 0'
      ]
    },
    employment_status: {
      examples: ['1', '2', '3', 'SKIP'],
      suggestions: [
        'Enter only the number (1-3)',
        'Type SKIP to leave this optional',
        'Don\'t type the status name, just the number'
      ]
    },
    current_employer: {
      examples: ['Tech Solutions Inc', 'SKIP'],
      suggestions: [
        'Enter company\'s legal name',
        'Type SKIP to leave this optional',
        'Avoid abbreviations unless official'
      ]
    },
    years_employed: {
      examples: ['3', '5', 'SKIP'],
      suggestions: [
        'Enter whole numbers only',
        'Type SKIP to leave this optional',
        'Must be greater than 0'
      ]
    },
    existing_loans: {
      examples: ['YES', 'NO', 'SKIP'],
      suggestions: [
        'Type YES, NO, or SKIP only',
        'Answer applies to all types of loans',
        'Case doesn\'t matter'
      ]
    },
    cibil_consent: {
      examples: ['YES', 'NO'],
      suggestions: [
        'Type YES to consent',
        'Type NO to deny consent'
      ]
    },
    preferred_tenure: {
      examples: ['12', '24', '36', 'SKIP'],
      suggestions: [
        'Enter number of months',
        'Type SKIP if unsure',
        'Must be greater than 0'
      ]
    },
    preferred_communication: {
      examples: ['1', '2', '3', 'SKIP'],
      suggestions: [
        'Enter only the number (1-3)',
        'Type SKIP to leave this optional',
        'Don\'t type the option name, just the number'
      ]
    },
    review: {
      examples: ['YES', 'NO', 'EDIT 3'],
      suggestions: [
        'Type YES to submit',
        'Type NO to start over',
        'Type EDIT followed by field number to modify'
      ]
    },
    confirm: {
      examples: ['START'],
      suggestions: ['Type START to begin a new application']
    }
  };

  const fieldInfo = errorMessages[field];
  let message = '❌ ' + error + '\n\n';
  
  message += '📝 Examples:\n';
  fieldInfo.examples.forEach(example => {
    message += `• "${example}"\n`;
  });
  
  message += '\n💡 Tips:\n';
  fieldInfo.suggestions.forEach(suggestion => {
    message += `• ${suggestion}\n`;
  });
  
  message += '\n🔍 Need help? Type HELP for more information.';
  
  return message;
}

// Update the stepHandlers to return to review after editing
const stepHandlers: Record<FormStep, StepHandler> = {
  start: {
    validate: (input: string): boolean | string => {
      const isValid = input.toLowerCase() === 'yes';
      return isValid || formatErrorMessage('start', 'Please reply with YES to start the application.');
    },
    process: () => ({}),
    getNextStep: () => 'full_name',
  },
  full_name: {
    validate: (input: string): boolean | string => {
      const isValid = validators.fullName(input);
      return isValid || formatErrorMessage('full_name', 
        'Please enter your full name with at least first and last name, using only letters and spaces. Each name should be at least 2 characters long.');
    },
    process: (input: string) => ({ full_name: input.trim() }),
    getNextStep: () => 'review',
  },
  email: {
    validate: (input: string): boolean | string => {
      const isValid = validators.email(input);
      return isValid || formatErrorMessage('email', 
        'Please enter a valid email address in the format: username@domain.com');
    },
    process: (input: string) => ({ email: input.trim().toLowerCase() }),
    getNextStep: () => 'review',
  },
  loan_type: {
    validate: (input: string): boolean | string => {
      const isValid = validators.loanType(input);
      return isValid || formatErrorMessage('loan_type', 
        'Please select a valid loan type by entering a number from 1 to 4.');
    },
    process: (input: string) => {
      const options = { '1': 'Personal', '2': 'Business', '3': 'Education', '4': 'Home' } as const;
      return { loan_type: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  loan_amount: {
    validate: (input: string): boolean | string => {
      const isValid = validators.loanAmount(input);
      return isValid || formatErrorMessage('loan_amount', 
        'Please enter a valid loan amount between ₹10,000 and ₹1,00,00,000 using only numbers.');
    },
    process: (input: string) => ({ loan_amount: Number(input) }),
    getNextStep: () => 'review',
  },
  purpose: {
    validate: (input: string): boolean | string => {
      const isValid = validators.purpose(input);
      return isValid || formatErrorMessage('purpose', 
        'Please provide a clear purpose between 10 and 100 characters, using only letters, numbers, and basic punctuation.');
    },
    process: (input: string) => ({ purpose: input.trim() }),
    getNextStep: () => 'review',
  },
  monthly_income: {
    validate: (input: string): boolean | string => {
      const isValid = validators.monthlyIncome(input);
      return isValid || formatErrorMessage('monthly_income', 
        'Please enter your monthly income between ₹10,000 and ₹10,00,000 using only numbers.');
    },
    process: (input: string) => ({ monthly_income: Number(input) }),
    getNextStep: () => 'review',
  },
  employment_status: {
    validate: (input: string): boolean | string => {
      const isValid = validators.employmentStatus(input);
      return isValid || formatErrorMessage('employment_status', 
        'Please select your employment status by entering a number from 1 to 3.');
    },
    process: (input: string) => {
      const options = { '1': 'Salaried', '2': 'Self-employed', '3': 'Business Owner' } as const;
      return { employment_status: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  current_employer: {
    validate: (input: string): boolean | string => {
      const isValid = validators.currentEmployer(input);
      return isValid || formatErrorMessage('current_employer', 
        'Please enter your employer\'s name using 2-50 characters, with only letters, numbers, spaces, and basic punctuation.');
    },
    process: (input: string) => ({ current_employer: input.trim() }),
    getNextStep: () => 'review',
  },
  years_employed: {
    validate: (input: string): boolean | string => {
      const isValid = validators.yearsEmployed(input);
      return isValid || formatErrorMessage('years_employed', 
        'Please enter a valid number of years between 1 and 50.');
    },
    process: (input: string) => ({ years_employed: Number(input) }),
    getNextStep: () => 'review',
  },
  existing_loans: {
    validate: (input: string): boolean | string => {
      const isValid = validators.yesNo(input);
      return isValid || formatErrorMessage('existing_loans', 
        'Please reply with YES or NO regarding your existing loans.');
    },
    process: (input: string) => ({ existing_loans: input.toLowerCase() === 'yes' }),
    getNextStep: (data: Partial<LoanApplication>) => data.existing_loans ? 'cibil_consent' : 'preferred_tenure',
  },
  cibil_consent: {
    validate: (input: string): boolean | string => {
      const isValid = validators.yesNo(input);
      return isValid || formatErrorMessage('cibil_consent', 
        'Please reply with YES or NO regarding your consent for CIBIL score check.');
    },
    process: (input: string) => ({ cibil_consent: input.toLowerCase() === 'yes' }),
    getNextStep: () => 'review',
  },
  preferred_tenure: {
    validate: (input: string): boolean | string => {
      const isValid = validators.preferredTenure(input);
      return isValid || formatErrorMessage('preferred_tenure', 
        'Please enter a valid loan tenure between 3 months and 30 years (360 months).');
    },
    process: (input: string) => ({ preferred_tenure: Number(input) }),
    getNextStep: () => 'review',
  },
  preferred_communication: {
    validate: (input: string): boolean | string => {
      const isValid = validators.communicationPreference(input);
      return isValid || formatErrorMessage('preferred_communication', 
        'Please select your preferred communication method by entering a number from 1 to 3.');
    },
    process: (input: string) => {
      const options = { '1': 'WhatsApp', '2': 'Email', '3': 'Both' } as const;
      return { preferred_communication: options[input as keyof typeof options] };
    },
    getNextStep: () => 'review',
  },
  review: {
    validate: (input: string): boolean | string => {
      const normalized = input.toLowerCase();
      const isValid = normalized === 'yes' || normalized === 'no' || normalized.startsWith('edit');
      return isValid || formatErrorMessage('review', 
        'Please type YES to submit, NO to start over, or EDIT followed by the field number to modify a field.');
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

// Process user response
export async function processMessage(phoneNumber: string, message: string): Promise<void> {
  try {
    logger.info('Starting message processing:', { phoneNumber, message });
    
    let state = await getConversationState(phoneNumber);
    logger.info('Retrieved conversation state:', { 
      state: state ? {
        current_step: state.current_step,
        is_complete: state.is_complete,
        has_form_data: !!state.form_data
      } : null 
    });

    const userInput = message.trim();

    if (!state) {
      logger.info('Creating new conversation state:', { phoneNumber });
      try {
        console.log(phoneNumber, "PHONE NUMBER");
        state = await updateConversationState(phoneNumber, {
          current_step: 'start' as FormStep,
          form_data: {},
          phone_number: phoneNumber,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          is_complete: false
        });
        logger.info('Successfully created new conversation state:', { 
          current_step: state.current_step,
          phone_number: state.phone_number
        });
      } catch (dbError) {
        logger.error('Failed to create conversation state:', { 
          error: dbError instanceof Error ? {
            name: dbError.name,
            message: dbError.message,
            stack: dbError.stack
          } : dbError,
          phoneNumber 
        });
        throw dbError;
      }
    }

    // Check for navigation commands first
    const navigationResult = await handleNavigationCommand(userInput, state, phoneNumber);
    if (navigationResult.handled) {
      logger.info('Handled navigation command:', { command: userInput });
      await sendWhatsAppMessage(phoneNumber, navigationResult.nextMessage);
      return;
    }

    let nextStep: FormStep = state.current_step as FormStep;
    let responseMessage = '';
    let formData = state.form_data || {};

    switch (state.current_step) {
      case 'start':
        if (userInput.toLowerCase() === 'yes') {
          nextStep = 'full_name';
        } else {
          responseMessage = 'Please reply with YES to start the application, or type HELP for assistance.';
        }
        break;

      case 'full_name':
        if (message.length > 2) {
          formData.full_name = message;
          nextStep = 'email';
        } else {
          responseMessage = 'Please enter a valid name.';
        }
        break;

      case 'email':
        if (validators.email(message)) {
          formData.email = message;
          nextStep = 'loan_type';
        } else {
          responseMessage = 'Please enter a valid email address.';
        }
        break;

      case 'loan_type':
        if (validators.number(message) && Number(message) >= 1 && Number(message) <= 4) {
          formData.loan_type = message;
          nextStep = 'loan_amount';
        } else {
          responseMessage = 'Please enter a valid loan type (1-4).';
        }
        break;

      case 'loan_amount':
        if (validators.number(message)) {
          formData.loan_amount = message;
          nextStep = 'purpose';
        } else {
          responseMessage = 'Please enter a valid loan amount in numbers only.';
        }
        break;

      case 'purpose':
        if (message.length >= 10) {
          formData.purpose = message;
          nextStep = 'monthly_income';
        } else {
          responseMessage = 'Please provide a brief description of at least 10 characters.';
        }
        break;

      case 'monthly_income':
        if (validators.number(message)) {
          formData.monthly_income = message;
          nextStep = 'employment_status';
        } else {
          responseMessage = 'Please enter a valid monthly income in numbers only.';
        }
        break;

      case 'employment_status':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'current_employer';
        } else if (validators.number(message) && Number(message) >= 1 && Number(message) <= 3) {
          formData.employment_status = message;
          nextStep = 'current_employer';
        } else {
          responseMessage = 'Please enter a valid employment status (1-3) or type SKIP to skip this question.';
        }
        break;

      case 'current_employer':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'years_employed';
        } else {
          formData.current_employer = message;
          nextStep = 'years_employed';
        }
        break;

      case 'years_employed':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'existing_loans';
        } else if (validators.number(message)) {
          formData.years_employed = message;
          nextStep = 'existing_loans';
        } else {
          responseMessage = 'Please enter a valid number of years or type SKIP to skip this question.';
        }
        break;

      case 'existing_loans':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'cibil_consent';
        } else if (message.toLowerCase() === 'yes') {
          formData.existing_loans = true;
          nextStep = 'cibil_consent';
        } else if (message.toLowerCase() === 'no') {
          formData.existing_loans = false;
          nextStep = 'cibil_consent';
        } else {
          responseMessage = 'Please reply with YES, NO, or SKIP.';
        }
        break;

      case 'cibil_consent':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'preferred_tenure';
        } else if (message.toLowerCase() === 'yes') {
          formData.cibil_consent = true;
          nextStep = 'preferred_tenure';
        } else if (message.toLowerCase() === 'no') {
          formData.cibil_consent = false;
          nextStep = 'preferred_tenure';
        } else {
          responseMessage = 'Please reply with YES or NO.';
        }
        break;

      case 'preferred_tenure':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'preferred_communication';
        } else if (validators.number(message)) {
          formData.preferred_tenure = message;
          nextStep = 'preferred_communication';
        } else {
          responseMessage = 'Please enter a valid number of months or type SKIP.';
        }
        break;

      case 'preferred_communication':
        if (message.toLowerCase() === 'skip') {
          nextStep = 'review';
        } else if (validators.number(message) && Number(message) >= 1 && Number(message) <= 3) {
          formData.preferred_communication = message;
          nextStep = 'review';
        } else {
          responseMessage = 'Please enter a valid communication preference (1-3) or type SKIP.';
        }
        break;

      case 'review':
        if (message.toLowerCase().startsWith('edit')) {
          const editResult = await handleEditCommand(message, state);
          if (editResult) {
            nextStep = editResult.nextStep;
            responseMessage = editResult.message;
          } else {
            responseMessage = 'Invalid edit command. Please type EDIT followed by the field number (e.g., "EDIT 3").';
          }
        } else if (message.toLowerCase() === 'yes') {
          // Create loan application
          const now = new Date().toISOString();
          const application: LoanApplication = {
            id: state.id,
            created_at: state.created_at,
            last_updated: now,
            status: 'submitted',
            ...state.form_data,
            phone_number: phoneNumber
          };

          await createLoanApplication(application);
          await updateConversationState(phoneNumber, {
            ...state,
            current_step: 'confirm',
            is_complete: true,
            last_updated: now
          });

          const confirmMessage = STEP_MESSAGES.confirm;
          const messageToSend = typeof confirmMessage === 'function'
            ? confirmMessage(state)
            : confirmMessage;
          
          await sendWhatsAppMessage(phoneNumber, messageToSend);
          return;
        }

        if (message.toLowerCase() === 'no') {
          // Start over
          const now = new Date().toISOString();
          await updateConversationState(phoneNumber, {
            ...state,
            current_step: 'start',
            form_data: {},
            last_updated: now
          });

          const startMessage = STEP_MESSAGES.start;
          const messageToSend = typeof startMessage === 'function'
            ? startMessage(state)
            : startMessage;
          
          await sendWhatsAppMessage(phoneNumber, messageToSend);
          return;
        }

        responseMessage = 'Please type:\n' +
          '• EDIT [number] - to modify a field\n' +
          '• YES - to submit your application\n' +
          '• NO - to start over';
        break;

      default:
        responseMessage = 'Sorry, something went wrong. Type RESTART to begin again or HELP for assistance.';
    }

    // Update conversation state
    if (nextStep !== state.current_step || Object.keys(formData).length > 0) {
      await updateConversationState(phoneNumber, {
        current_step: nextStep,
        form_data: formData,
      });
    }

    // If no error message was set and we have a next step, get the step message
    if (!responseMessage) {
      const stepMessage = STEP_MESSAGES[nextStep];
      if (typeof stepMessage === 'function') {
        // Create a complete state object for the message function
        const messageState: ConversationState = {
          ...state,
          current_step: nextStep,
          form_data: formData,
          last_updated: new Date().toISOString()
        };
        responseMessage = stepMessage(messageState);
      } else {
        responseMessage = stepMessage;
      }
    }

    await sendWhatsAppMessage(phoneNumber, responseMessage);
  } catch (error) {
    logger.error('Error processing message:', { 
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      phoneNumber,
      message 
    });
    
    // Send a more detailed error message to help with debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await sendWhatsAppMessage(
      phoneNumber,
      `Sorry, we encountered an error: ${errorMessage}\n\nPlease type RESTART to begin again or contact support if the issue persists.`
    );
  }
} 