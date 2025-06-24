import { validateWebhook } from '../config/gupshup';
import { processMessage } from '../services/chatbot';

// Define the Gupshup webhook body type (flexible structure)
export interface GupshupWebhookBody {
  type: string;
  payload: {
    id: string;
    source: string;
    type: string;
    payload?: {
      text: string;
      postbackText?: string; // For interactive button responses
    };
    message?: {
      text: string;
    };
    sender: {
      phone: string;
      name: string;
    };
    timestamp: number;
  };
}

/**
 * Format phone number to match database constraint
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any prefixes and spaces, keep just the number
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // For Indian numbers, ensure we have the right format
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2); // Remove country code for database storage
  }
  
  return cleaned;
}

/**
 * Process a WhatsApp message from Gupshup webhook
 */
export async function processWebhook(body: GupshupWebhookBody): Promise<void> {
  // Validate the webhook body
  if (!validateWebhook(body)) {
    console.error('=== WEBHOOK ERROR: Invalid webhook body ===', { 
      body,
      bodyType: typeof body,
      hasRequiredFields: {
        type: !!body.type,
        payload: !!body.payload,
        source: !!body.payload?.source,
        sender: !!body.payload?.sender,
        text: !!(body.payload?.payload?.text || body.payload?.payload?.postbackText || body.payload?.message?.text)
      }
    });
    throw new Error('Invalid webhook body');
  }
  
  // Extract message details from Gupshup format (handle both possible structures)
  // Prioritize interactive button responses (postbackText) over regular text
  const messageBody = body.payload.payload?.postbackText || 
                     body.payload.payload?.text || 
                     body.payload.message?.text || '';
  const from = formatPhoneNumber(body.payload.sender.phone);
  const senderName = body.payload.sender.name;

  if (!messageBody || !from) {
    console.error('=== WEBHOOK ERROR: Missing required fields ===', { 
      body,
      messageBody,
      from,
      extractedFields: {
        postbackText: body.payload.payload?.postbackText,
        payloadText: body.payload.payload?.text,
        messageText: body.payload.message?.text,
        senderPhone: body.payload.sender?.phone
      }
    });
    throw new Error('Missing required fields');
  }

  console.log('=== WEBHOOK DEBUG: Processing WhatsApp message ===', { 
    from,
    messageBody,
    senderName,
    messageId: body.payload.id,
    isInteractive: !!body.payload.payload?.postbackText
  });

  // Process the message through chatbot service
  await processMessage(from, messageBody);
} 