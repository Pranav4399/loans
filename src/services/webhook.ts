import logger from '../config/logger';
import { validateWebhook } from '../config/twilio';
import { processMessage } from '../services/chatbot';

// Define the complete webhook body type
export interface TwilioWebhookBody {
  Body: string;
  From: string;
  WaId: string;  // WhatsApp ID
  ProfileName: string;
  [key: string]: string;  // All Twilio webhook fields are strings
}

/**
 * Format phone number to match database constraint
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove 'whatsapp:' prefix and any spaces
  return phoneNumber.replace('whatsapp:', '').replace(/\s/g, '');
}

/**
 * Process a WhatsApp message from Twilio webhook
 */
export async function processWebhook(
  body: TwilioWebhookBody, 
  signature: string, 
  webhookUrl: string
): Promise<void> {
  // Validate the webhook signature
  if (!validateWebhook(signature, webhookUrl, body)) {
    logger.error('Invalid webhook signature', { 
      signature,
      webhookUrl
    });
    throw new Error('Invalid signature');
  }
  
  // Extract message details
  const messageBody = body.Body;
  const from = formatPhoneNumber(body.From);

  if (!messageBody || !from) {
    logger.error('Missing required fields in webhook body', { body });
    throw new Error('Missing required fields');
  }

  logger.info('Processing WhatsApp message:', { 
    from,
    messageBody,
    waId: body.WaId,
    profileName: body.ProfileName
  });

  // Process the message through chatbot service
  await processMessage(from, messageBody);
} 