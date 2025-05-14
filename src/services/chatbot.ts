import logger from '../config/logger';
import { createConversationState, getConversationState, updateConversationState } from '../config/supabase';
import { sendWhatsAppMessage } from '../config/twilio';
import { ConversationState, FormStep, StepMessage } from '../types/chat';
import { CategoryType, SubcategoryType } from '../types/database';
import { validators } from '../utils/validation';
import { createLead } from './leads';

// Category constants
export const CATEGORIES: Record<string, CategoryType> = {
  '1': 'Loans',
  '2': 'Insurance',
  '3': 'Mutual Funds',
};

// Subcategory constants
export const LOAN_SUBCATEGORIES: Record<string, SubcategoryType> = {
  '1': 'Personal Loan',
  '2': 'Business Loan',
  '3': 'Home Loan',
  '4': 'Loan Against Property',
  '5': 'Car Loan',
  '6': 'Working Capital',
};

export const INSURANCE_SUBCATEGORIES: Record<string, SubcategoryType> = {
  '1': 'Health Insurance',
  '2': 'Motor Vehicle Insurance',
  '3': 'Life Insurance',
  '4': 'Property Insurance',
};

export const MUTUAL_FUND_SUBCATEGORIES: Record<string, SubcategoryType> = {
  '1': 'General Inquiry',
};

// Questions for each step
export const STEP_MESSAGES: Record<FormStep, StepMessage> = {
  start: '👋 *Welcome to Andromeda*\n\n🏆 *India\'s Largest Loan Distributor* 🏆\n\n*About Us:*\n• 25,000+ financial advisors nationwide\n• 125+ lending partners for best offers\n• Present in 100+ cities across India\n• Rs. 75,000+ CR loans disbursed annually\n• Trusted by 2+ million customers\n\n*Our Products:*\n• 🏦 Loans: Personal, Home, Business & more\n• 🛡️ Insurance: Health, Life, Motor & more\n• 📈 Mutual Funds: Diverse investment options\n\n➡️ Ready to explore your financial options? Simply reply with *YES* to start.\n\n💬 Type *HELP* anytime for assistance.',
  
  category: '💰 What financial product are you interested in?\n\nChoose from these options:\n1️⃣ Loans\n2️⃣ Insurance\n3️⃣ Mutual Funds\n\nReply with the number (1-3)',

  loan_subcategory: '🏦 What type of loan are you interested in?\n\nChoose from these options:\n1️⃣ Personal Loan\n2️⃣ Business Loan\n3️⃣ Home Loan\n4️⃣ Loan Against Property\n5️⃣ Car Loan\n6️⃣ Working Capital\n\nReply with the number (1-6)',

  insurance_subcategory: '🛡️ What type of insurance are you interested in?\n\nChoose from these options:\n1️⃣ Health Insurance\n2️⃣ Motor Vehicle Insurance\n3️⃣ Life Insurance\n4️⃣ Property Insurance\n\nReply with the number (1-4)',
  
  full_name: '📝 What is your name?\n\nPlease enter your name as it appears on official documents.\nExample: "John" or "John Smith"',
  
  contact_number: '📱 What is your contact number?\n\nYou can enter with or without country code.\nExamples: "9876543210" or "+919876543210"',
  
  confirm: '🎉 Thank you for your interest!\n\nA representative will contact you shortly at your provided contact number.\n\n[Click here](https://example.com/products) to learn more about our offerings.\n\nType START if you\'d like to inquire about another product.',
};

// Help messages for each step
const HELP_MESSAGES: Record<FormStep, string> = {
  start: 'Andromeda is India\'s largest loan distributor with 25,000+ financial advisors. We connect you with the best financial products tailored to your needs. To begin, simply reply with YES, and our guided process will help you find the right product. For customer support, call 1800 123 3001.',
  category: 'Enter a number (1-3) to select the financial product category you\'re interested in.',
  loan_subcategory: 'Enter a number (1-6) to select the specific loan type you\'re interested in.',
  insurance_subcategory: 'Enter a number (1-4) to select the specific insurance type you\'re interested in.',
  full_name: 'Please enter your full name as it appears on official documents. You can use letters and spaces.',
  contact_number: 'Enter a valid phone number with country code. This will be used to contact you about your inquiry.',
  confirm: 'Your inquiry has been submitted. You can type START to begin a new inquiry about another product.',
};

// Handle navigation commands
async function handleNavigationCommand(
  command: string,
  state: ConversationState,
  phoneNumber: string
): Promise<{ nextMessage: string; handled: boolean }> {
  const normalizedCommand = command.toLowerCase().trim();

  switch (normalizedCommand) {
    case 'restart':
      // Create new conversation state
      await updateConversationState({
        phone_number: phoneNumber,
        current_step: 'start',
        form_data: {},
        is_complete: false
      });

      // Get the start message
      return {
        nextMessage: STEP_MESSAGES.start,
        handled: true
      };

    case 'help':
      return {
        nextMessage: HELP_MESSAGES[state.current_step],
        handled: true
      };

    case 'exit':
      // Mark conversation as complete
      await updateConversationState({
        phone_number: phoneNumber,
        is_complete: true
      });
      
      return {
        nextMessage: 'Your inquiry has been cancelled. Type START anytime to begin again.',
        handled: true
      };

    default:
      return {
        nextMessage: '',
        handled: false
      };
  }
}

// Format error message with examples and suggestions
function formatErrorMessage(field: FormStep, error: string): string {
  const errorMessages: Record<FormStep, { examples: string[]; suggestions: string[] }> = {
    start: {
      examples: ['YES'],
      suggestions: ['Type YES in any case (yes, Yes, YES)']
    },
    category: {
      examples: ['1', '2', '3'],
      suggestions: [
        'Enter only the number (1-3)',
        'Choose from the options shown',
        'Don\'t type the category name, just the number'
      ]
    },
    loan_subcategory: {
      examples: ['1', '2', '3', '4', '5', '6'],
      suggestions: [
        'Enter only the number (1-6)',
        'Choose from the options shown',
        'Don\'t type the loan name, just the number'
      ]
    },
    insurance_subcategory: {
      examples: ['1', '2', '3', '4'],
      suggestions: [
        'Enter only the number (1-4)',
        'Choose from the options shown',
        'Don\'t type the insurance name, just the number'
      ]
    },
    full_name: {
      examples: ['John', 'John Smith', 'Mary'],
      suggestions: [
        'Just enter your name as you prefer to be called',
        'Last name is optional',
        'Avoid special characters or numbers'
      ]
    },
    contact_number: {
      examples: ['9876543210', '+919876543210'],
      suggestions: [
        'Can enter with or without country code',
        'Don\'t include spaces or dashes',
        'Use only numbers'
      ]
    },
    confirm: {
      examples: ['START'],
      suggestions: ['Type START to begin a new inquiry']
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

// Process user response
export async function processMessage(phoneNumber: string, message: string): Promise<void> {
  try {
    logger.info('Starting message processing:', { phoneNumber, message });
    
    // Check if we have an existing conversation or need to create one
    let state = await getConversationState(phoneNumber);
    if (!state) {
      state = await createConversationState(phoneNumber);
      
      // Send the welcome message automatically for new conversations
      logger.info('New conversation started, sending welcome message');
      await sendWhatsAppMessage(phoneNumber, STEP_MESSAGES.start);
      
      // Return without processing the first message
      // This ensures the user sees the welcome message first
      return;
    }
    
    logger.info('Retrieved conversation state:', { 
      phoneNumber,
      currentStep: state.current_step
    });

    const userInput = message.trim();

    // Check for navigation commands first
    const navigationResult = await handleNavigationCommand(userInput, state, phoneNumber);
    if (navigationResult.handled) {
      logger.info('Handled navigation command:', { command: userInput });
      await sendWhatsAppMessage(phoneNumber, navigationResult.nextMessage);
      return;
    }

    let nextStep: FormStep = state.current_step;
    let responseMessage = '';
    let formData = { ...state.form_data };

    switch (state.current_step) {
      case 'start':
        if (userInput.toLowerCase() === 'yes') {
          nextStep = 'category';
        } else {
          responseMessage = 'To start exploring our financial products, please reply with YES.';
        }
        break;
        
      case 'category':
        if (['1', '2', '3'].includes(userInput)) {
          const category = CATEGORIES[userInput];
          formData.category = category;
          
          // Determine next step based on category
          if (category === 'Loans') {
            nextStep = 'loan_subcategory';
          } else if (category === 'Insurance') {
            nextStep = 'insurance_subcategory';
          } else if (category === 'Mutual Funds') {
            // For mutual funds, set the subcategory directly and skip to name step
            formData.subcategory = 'General Inquiry';
            nextStep = 'full_name';
          }
        } else {
          responseMessage = formatErrorMessage('category', 'Please select a valid option (1-3).');
        }
        break;
        
      case 'loan_subcategory':
        if (Object.keys(LOAN_SUBCATEGORIES).includes(userInput)) {
          formData.subcategory = LOAN_SUBCATEGORIES[userInput];
          nextStep = 'full_name';
        } else {
          responseMessage = formatErrorMessage('loan_subcategory', 'Please select a valid loan type (1-6).');
        }
        break;
        
      case 'insurance_subcategory':
        if (Object.keys(INSURANCE_SUBCATEGORIES).includes(userInput)) {
          formData.subcategory = INSURANCE_SUBCATEGORIES[userInput];
          nextStep = 'full_name';
        } else {
          responseMessage = formatErrorMessage('insurance_subcategory', 'Please select a valid insurance type (1-4).');
        }
        break;
        
      case 'full_name':
        if (validators.fullName(userInput)) {
          formData.full_name = userInput;
          nextStep = 'contact_number';
        } else {
          responseMessage = formatErrorMessage('full_name', 'Please enter a valid name.');
        }
        break;

      case 'contact_number':
        if (validators.phoneNumber(userInput)) {
          formData.contact_number = userInput;
          nextStep = 'confirm';
        } else {
          responseMessage = formatErrorMessage('contact_number', 'Please enter a valid phone number.');
        }
        break;

      case 'confirm':
        if (userInput.toLowerCase() === 'start') {
          // Reset for a new inquiry
          await updateConversationState({
            phone_number: phoneNumber,
            current_step: 'start',
            form_data: {},
            is_complete: false
          });
          
          // Send the start message directly
          await sendWhatsAppMessage(
            phoneNumber, 
            STEP_MESSAGES.start
          );
          return;
        } else {
          responseMessage = 'Your inquiry has been submitted. Type START to begin a new inquiry.';
        }
        break;

      default:
        responseMessage = 'Sorry, something went wrong. Type RESTART to begin again or HELP for assistance.';
    }

    // If we've reached confirm step and are just getting there, save the lead data
    if (nextStep === 'confirm' && state.current_step !== 'confirm') {
      try {
        // Create lead in database
        await createLead({
          full_name: formData.full_name as string,
          contact_number: formData.contact_number as string,
          category: formData.category as CategoryType,
          subcategory: formData.subcategory as SubcategoryType,
        });
        
        // Mark conversation as complete
        formData.status = 'pending';
        
        logger.info('Created lead:', {
          full_name: formData.full_name,
          category: formData.category,
          subcategory: formData.subcategory
        });
      } catch (error) {
        logger.error('Error creating lead:', { error, formData });
        responseMessage = 'Sorry, we encountered an error submitting your inquiry. Please try again.';
        nextStep = state.current_step; // Stay on current step
      }
    }

    // Update conversation state
    if (nextStep !== state.current_step || Object.keys(formData).length !== Object.keys(state.form_data).length) {
      await updateConversationState({
        phone_number: phoneNumber,
        current_step: nextStep,
        form_data: formData,
        is_complete: nextStep === 'confirm'
      });
    }

    // If no error message was set and we have a next step, get the step message
    if (!responseMessage) {
      if (nextStep === 'confirm') {
        // Create personalized confirmation message based on selected products
        const categoryName = formData.category as CategoryType;
        const subcategoryName = formData.subcategory as SubcategoryType;
        const userName = formData.full_name?.split(' ')[0] || 'there'; // Get first name or default
        
        // Format subcategory for URL
        const formattedSubcategory = String(subcategoryName).toLowerCase().replace(/\s+/g, '-');
        
        // Generate category-specific messages and links
        let productInfo = '';
        let productLink = '';
        
        if (categoryName === 'Loans') {
          productLink = `https://www.andromedaloans.com/loans/${formattedSubcategory}`;
          
          // Add loan-specific information
          if (subcategoryName === 'Personal Loan') {
            productInfo = 'Personal loans with competitive interest rates starting at 10.5% p.a.';
          } else if (subcategoryName === 'Home Loan') {
            productInfo = 'Home loans with up to 85% financing and 30-year tenure options.';
          } else if (subcategoryName === 'Business Loan') {
            productInfo = 'Business loans with minimal documentation and quick approval.';
          } else {
            productInfo = `Our ${subcategoryName} options are designed for optimal flexibility and value.`;
          }
        } else if (categoryName === 'Insurance') {
          productLink = `https://www.andromedaloans.com/insurance/${formattedSubcategory}`;
          productInfo = `Our ${subcategoryName} plans offer comprehensive coverage at competitive premiums.`;
        } else { // Mutual Funds
          productLink = 'https://www.andromedaloans.com/mutual-funds';
          productInfo = 'Our mutual fund experts will help you find the right investment options for your goals.';
        }
        
        // Create the personalized message
        responseMessage = `🎉 Thank you, ${userName}!\n\nYour interest in ${subcategoryName} has been recorded. ${productInfo}\n\nA representative will contact you shortly at ${formData.contact_number}.\n\nLearn more about our ${subcategoryName} offerings: ${productLink}\n\nType START if you'd like to inquire about another product.`;
      } else {
        responseMessage = STEP_MESSAGES[nextStep];
      }
    }

    // Send the message with quick replies if available
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