import dotenv from 'dotenv';
import twilio from 'twilio';
import logger from './logger';

dotenv.config();

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  throw new Error('Missing Twilio credentials in environment variables');
}

// Initialize Twilio client
export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Interface for quick reply option
 */
export interface QuickReplyOption {
  title: string;
  payload: string;
}

/**
 * Send a WhatsApp message with optional quick replies
 * @param to Recipient phone number
 * @param message Message text
 * @param options Optional quick reply options (will be displayed as text)
 */
export async function sendWhatsAppMessage(
  to: string, 
  message: string, 
  options?: QuickReplyOption[]
) {
  try {
    // Prepare message body
    let messageBody = message;
    
    // Add text-based options if provided
    if (options && options.length > 0) {
      const optionsText = options.map(opt => 
        `${opt.title} (${opt.payload})`
      ).join(', ');
      
      messageBody = `${message}\n\nQuick replies: ${optionsText}`;
    }
    
    // Create and send the message
    const response = await twilioClient.messages.create({
      body: messageBody,
      from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    
    logger.info('WhatsApp message sent:', { to, messageId: response.sid });
    return response;
  } catch (error) {
    logger.error('Error sending WhatsApp message:', { error });
    throw error;
  }
}

// Helper function to validate webhook request
export function validateWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  try {
    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      params
    );
  } catch (error) {
    logger.error('Error validating webhook:', { error });
    return false;
  }
} 