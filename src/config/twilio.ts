import twilio from 'twilio';
import logger from './logger';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  throw new Error('Missing Twilio credentials in environment variables');
}

// Initialize Twilio client
export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Helper function to send WhatsApp message
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    
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