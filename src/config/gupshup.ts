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
 * Format phone number for Gupshup API
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with country code, add India country code (91)
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  return cleaned;
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
    logger.info('Validating webhook body:', { 
      bodyType: typeof body,
      hasType: !!body.type,
      hasPayload: !!body.payload,
      hasSource: !!body.payload?.source,
      hasSender: !!body.payload?.sender,
      bodyStructure: {
        type: body.type,
        payloadKeys: body.payload ? Object.keys(body.payload) : [],
        payloadPayloadKeys: body.payload?.payload ? Object.keys(body.payload.payload) : [],
        payloadMessageKeys: body.payload?.message ? Object.keys(body.payload.message) : []
      }
    });

    // Basic validation - check for required Gupshup webhook fields (flexible structure)
    const hasText = body.payload?.payload?.text || 
                   body.payload?.payload?.postbackText || 
                   body.payload?.message?.text;
    
    const isValid = !!(
      body.type &&
      body.payload &&
      body.payload.source &&
      body.payload.sender &&
      hasText
    );

    logger.info('Webhook validation result:', { 
      isValid,
      hasText: !!hasText,
      textContent: hasText || 'none',
      isInteractive: !!body.payload?.payload?.postbackText
    });

    return isValid;
  } catch (error) {
    logger.error('Error validating Gupshup webhook:', { error, body });
    return false;
  }
}

/**
 * Send interactive quick reply buttons message via Gupshup API
 */
export async function sendInteractiveButtons(
  phoneNumber: string, 
  bodyText: string, 
  buttons: Array<{ id: string; title: string }>,
  headerText?: string,
  footerText?: string
): Promise<void> {
  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  
  const messagePayload = {
    type: 'quick_reply',
    content: {
      type: 'text',
      ...(headerText && { header: headerText }),
      text: bodyText,
      ...(footerText && { caption: footerText })
    },
    options: buttons.map(button => ({
      type: 'text',
      title: button.title,
      postbackText: button.id
    }))
  };

  const formData = new URLSearchParams({
    channel: 'whatsapp',
    source: GUPSHUP_SOURCE_NUMBER,
    destination: formattedPhoneNumber,
    message: JSON.stringify(messagePayload),
    'src.name': GUPSHUP_APP_NAME
  });

  try {
    const response = await fetch(`${GUPSHUP_BASE_URL}/msg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': GUPSHUP_API_KEY,
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      logger.error('Gupshup API error response:', responseText);
      throw new Error(`Gupshup API error: ${responseText}`);
    }

    // Try to parse as JSON, but handle non-JSON responses
    try {
      const result = JSON.parse(responseText);
      logger.info('Interactive buttons sent successfully via Gupshup:', { 
        phoneNumber: formattedPhoneNumber,
        messageId: result.messageId,
        buttons: buttons.length
      });
    } catch (parseError) {
      // If response is not JSON but request was successful, log it
      logger.info('Interactive buttons sent successfully (non-JSON response):', { 
        phoneNumber: formattedPhoneNumber,
        response: responseText,
        buttons: buttons.length
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error sending interactive buttons via Gupshup:', { 
      error: errorMessage,
      phoneNumber: formattedPhoneNumber 
    });
    throw new Error(`Failed to send interactive buttons: ${errorMessage}`);
  }
}

/**
 * Send interactive list message via Gupshup API (for more than 3 options)
 */
export async function sendInteractiveList(
  phoneNumber: string, 
  bodyText: string, 
  items: Array<{ id: string; title: string; description?: string }>,
  buttonText: string = 'Select Option',
  headerText?: string,
  footerText?: string
): Promise<void> {
  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  
  const messagePayload = {
    type: 'list',
    title: headerText || 'Please select an option',
    body: bodyText,
    ...(footerText && { footer: footerText }),
    globalButtons: [{
      type: 'text',
      title: buttonText
    }],
    items: [{
      title: 'Options',
      options: items.map(item => ({
        type: 'text',
        title: item.title,
        ...(item.description && { description: item.description }),
        postbackText: item.id
      }))
    }]
  };

  const formData = new URLSearchParams({
    channel: 'whatsapp',
    source: GUPSHUP_SOURCE_NUMBER,
    destination: formattedPhoneNumber,
    message: JSON.stringify(messagePayload),
    'src.name': GUPSHUP_APP_NAME
  });

  try {
    const response = await fetch(`${GUPSHUP_BASE_URL}/msg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': GUPSHUP_API_KEY,
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      logger.error('Gupshup API error response:', responseText);
      throw new Error(`Gupshup API error: ${responseText}`);
    }

    // Try to parse as JSON, but handle non-JSON responses
    try {
      const result = JSON.parse(responseText);
      logger.info('Interactive list sent successfully via Gupshup:', { 
        phoneNumber: formattedPhoneNumber,
        messageId: result.messageId,
        items: items.length
      });
    } catch (parseError) {
      // If response is not JSON but request was successful, log it
      logger.info('Interactive list sent successfully (non-JSON response):', { 
        phoneNumber: formattedPhoneNumber,
        response: responseText,
        items: items.length
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error sending interactive list via Gupshup:', { 
      error: errorMessage,
      phoneNumber: formattedPhoneNumber 
    });
    throw new Error(`Failed to send interactive list: ${errorMessage}`);
  }
} 