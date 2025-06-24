import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GUPSHUP_API_KEY || !process.env.GUPSHUP_APP_NAME || !process.env.GUPSHUP_SOURCE_NUMBER) {
  throw new Error('Missing Gupshup credentials in environment variables (GUPSHUP_API_KEY, GUPSHUP_APP_NAME, GUPSHUP_SOURCE_NUMBER)');
}

// Gupshup configuration
export const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
export const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME;
export const GUPSHUP_SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
export const GUPSHUP_BASE_URL = 'https://api.gupshup.io/wa/api/v1';

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

    console.log('=== GUPSHUP DEBUG: Sending message to Gupshup ===', { 
      originalTo: to,
      formattedTo,
      messageLength: messageBody.length,
      source: GUPSHUP_SOURCE_NUMBER,
      appName: GUPSHUP_APP_NAME,
      messagePreview: messageBody.substring(0, 100) + (messageBody.length > 100 ? '...' : ''),
      url: `${GUPSHUP_BASE_URL}/msg`,
      hasApiKey: !!GUPSHUP_API_KEY,
      apiKeyPrefix: GUPSHUP_API_KEY ? GUPSHUP_API_KEY.substring(0, 8) + '...' : 'MISSING'
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
    console.log('=== GUPSHUP DEBUG: API raw response ===', { 
      status: response.status,
      statusText: response.statusText,
      responseText: responseText, // Log full response for debugging
      responseLength: responseText.length,
      headers: Object.fromEntries(response.headers.entries())
    });

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('=== GUPSHUP DEBUG: Parsed response ===', { 
        result,
        hasMessageId: !!result.messageId,
        hasStatus: !!result.status,
        hasErrors: !!result.errors
      });
    } catch (parseError) {
      console.error('=== GUPSHUP ERROR: Failed to parse response as JSON ===', { 
        responseText: responseText,
        parseError: parseError instanceof Error ? parseError.message : parseError
      });
      throw new Error(`Gupshup API returned invalid JSON: ${responseText.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      console.error('=== GUPSHUP ERROR: API error response ===', { 
        status: response.status,
        statusText: response.statusText,
        result,
        formDataEntries: Object.fromEntries(formData),
        fullResponse: responseText
      });
      throw new Error(`Gupshup API error: ${result.message || response.statusText || 'Unknown error'}`);
    }

    console.log('=== GUPSHUP DEBUG: Message sent successfully ===', { 
      to, 
      formattedTo,
      messageId: result.messageId,
      status: result.status,
      fullResult: result
    });
    
    return result;
  } catch (error) {
    console.error('=== GUPSHUP ERROR: Failed to send message ===', { 
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

    return isValid;
  } catch (error) {
    console.error('=== GUPSHUP ERROR: Webhook validation failed ===', { error, body });
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
      console.error('Gupshup API error response:', responseText);
      throw new Error(`Gupshup API error: ${responseText}`);
    }

    // Try to parse as JSON, but handle non-JSON responses
    try {
      const result = JSON.parse(responseText);
      console.log('Interactive buttons sent successfully via Gupshup:', { 
        phoneNumber: formattedPhoneNumber,
        messageId: result.messageId,
        buttons: buttons.length
      });
    } catch (parseError) {
      // If response is not JSON but request was successful, log it
      console.log('Interactive buttons sent successfully (non-JSON response):', { 
        phoneNumber: formattedPhoneNumber,
        response: responseText,
        buttons: buttons.length
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending interactive buttons via Gupshup:', { 
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
      console.error('Gupshup API error response:', responseText);
      throw new Error(`Gupshup API error: ${responseText}`);
    }

    // Try to parse as JSON, but handle non-JSON responses
    try {
      const result = JSON.parse(responseText);
      console.log('Interactive list sent successfully via Gupshup:', { 
        phoneNumber: formattedPhoneNumber,
        messageId: result.messageId,
        items: items.length
      });
    } catch (parseError) {
      // If response is not JSON but request was successful, log it
      console.log('Interactive list sent successfully (non-JSON response):', { 
        phoneNumber: formattedPhoneNumber,
        response: responseText,
        items: items.length
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending interactive list via Gupshup:', { 
      error: errorMessage,
      phoneNumber: formattedPhoneNumber 
    });
    throw new Error(`Failed to send interactive list: ${errorMessage}`);
  }
} 