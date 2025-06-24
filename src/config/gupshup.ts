import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

if (!process.env.GUPSHUP_API_KEY || !process.env.GUPSHUP_APP_NAME || !process.env.GUPSHUP_SOURCE_NUMBER) {
  throw new Error('Missing Gupshup credentials in environment variables (GUPSHUP_API_KEY, GUPSHUP_APP_NAME, GUPSHUP_SOURCE_NUMBER)');
}

// Gupshup configuration
export const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
export const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME;
export const GUPSHUP_SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
export const GUPSHUP_BASE_URL = 'https://api.gupshup.io/wa/api/v1';

// Log configuration (without sensitive data)
logger.info('Gupshup configuration loaded:', {
  hasApiKey: !!GUPSHUP_API_KEY,
  appName: GUPSHUP_APP_NAME,
  hasSourceNumber: !!GUPSHUP_SOURCE_NUMBER,
  baseUrl: GUPSHUP_BASE_URL
});

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

    // Format phone number for Gupshup (ensure it has country code)
    let formattedTo = to;
    if (to.length === 10 && !to.startsWith('91')) {
      formattedTo = '91' + to; // Add India country code
    }

    // Prepare the form data as required by Gupshup API
    const formData = new URLSearchParams();
    formData.append('channel', 'whatsapp');
    formData.append('source', GUPSHUP_SOURCE_NUMBER);
    formData.append('destination', formattedTo);
    formData.append('src.name', GUPSHUP_APP_NAME);
    formData.append('message', JSON.stringify({
      type: 'text',
      text: messageBody
    }));

    logger.info('Sending message to Gupshup:', { 
      originalTo: to,
      formattedTo,
      messageLength: messageBody.length,
      source: GUPSHUP_SOURCE_NUMBER,
      appName: GUPSHUP_APP_NAME
    });

    // Send the message via Gupshup API using correct format
    const response = await fetch(`${GUPSHUP_BASE_URL}/msg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': GUPSHUP_API_KEY
      },
      body: formData
    });

    // Get response text first to handle non-JSON responses
    const responseText = await response.text();
    logger.info('Gupshup API raw response:', { 
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 500) // Log first 500 chars
    });

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse Gupshup response as JSON:', { 
        responseText: responseText.substring(0, 1000),
        parseError: parseError instanceof Error ? parseError.message : parseError
      });
      throw new Error(`Gupshup API returned invalid JSON: ${responseText.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      logger.error('Gupshup API error response:', { 
        status: response.status,
        statusText: response.statusText,
        result,
        formData: Object.fromEntries(formData)
      });
      throw new Error(`Gupshup API error: ${result.message || response.statusText || 'Unknown error'}`);
    }

    logger.info('WhatsApp message sent via Gupshup:', { 
      to, 
      messageId: result.messageId,
      status: result.status 
    });
    
    return result;
  } catch (error) {
    logger.error('Error sending WhatsApp message via Gupshup:', { 
      error: error instanceof Error ? error.message : error,
      to,
      message
    });
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