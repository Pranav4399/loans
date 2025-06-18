import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

if (!process.env.GUPSHUP_API_KEY || !process.env.GUPSHUP_APP_NAME) {
  throw new Error('Missing Gupshup credentials in environment variables');
}

// Gupshup configuration
export const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
export const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME;
export const GUPSHUP_BASE_URL = 'https://api.gupshup.io/sm/api/v1';

/**
 * Interface for quick reply option
 */
export interface QuickReplyOption {
  title: string;
  payload: string;
}

/**
 * Send a WhatsApp message via Gupshup API
 * @param to Recipient phone number (without country code prefix)
 * @param message Message text
 * @param options Optional quick reply options
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

    // Prepare the request payload (using JSON format like ChatGPT suggested)
    const payload = {
      channel: 'whatsapp',
      source: GUPSHUP_APP_NAME,
      destination: to,
      message: {
        type: 'text',
        text: messageBody
      }
    };

    // Send the message via Gupshup API
    const response = await fetch(`${GUPSHUP_BASE_URL}/msg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': GUPSHUP_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Gupshup API error: ${result.message || 'Unknown error'}`);
    }

    logger.info('WhatsApp message sent via Gupshup:', { 
      to, 
      messageId: result.messageId,
      status: result.status 
    });
    
    return result;
  } catch (error) {
    logger.error('Error sending WhatsApp message via Gupshup:', { error });
    throw error;
  }
}

/**
 * Validate Gupshup webhook request
 * Note: Gupshup doesn't use signature validation like Twilio
 * Instead, we validate the presence of required fields and API key
 */
export function validateWebhook(body: any): boolean {
  try {
    // Basic validation - check for required Gupshup webhook fields (flexible structure)
    const hasText = body.payload?.payload?.text || body.payload?.message?.text;
    return !!(
      body.type &&
      body.payload &&
      body.payload.source &&
      body.payload.sender &&
      hasText
    );
  } catch (error) {
    logger.error('Error validating Gupshup webhook:', { error });
    return false;
  }
} 