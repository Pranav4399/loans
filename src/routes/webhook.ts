import { Request, Response, Router, RequestHandler } from 'express';
import { validateWebhook } from '../config/twilio';
import { processMessage } from '../services/chatbot';
import logger from '../config/logger';

const router = Router();

// Define the complete webhook body type
interface TwilioWebhookBody {
  Body: string;
  From: string;
  WaId: string;  // WhatsApp ID
  ProfileName: string;
  [key: string]: string;  // All Twilio webhook fields are strings
}

// Format phone number to match database constraint
function formatPhoneNumber(phoneNumber: string): string {
  // Remove 'whatsapp:' prefix and any spaces
  return phoneNumber.replace('whatsapp:', '').replace(/\s/g, '');
}

// Webhook for incoming WhatsApp messages
const handleWebhook: RequestHandler = async (req, res) => {
  try {
    // Validate request is from Twilio
    const signature = req.header('X-Twilio-Signature') || '';
    const url = `${process.env.WEBHOOK_URL}/api/webhook`;
    
    // Cast the body to our interface, ensuring all fields are strings
    const body: TwilioWebhookBody = {
      ...req.body,
      Body: String(req.body.Body || ''),
      From: String(req.body.From || ''),
      WaId: String(req.body.WaId || ''),
      ProfileName: String(req.body.ProfileName || '')
    };
    
    logger.info('Received webhook request:', { 
      headers: req.headers,
      body: JSON.stringify(body, null, 2)
    });
    
    if (!validateWebhook(signature, url, body)) {
      logger.error('Invalid webhook signature', { 
        signature, 
        url,
        authToken: process.env.TWILIO_AUTH_TOKEN?.substring(0, 5) + '...',
        body: JSON.stringify(body)
      });
      res.status(403).send('Invalid signature');
      return;
    }
    
    console.log(body, "BODY");
    // Extract message details
    const messageBody = body.Body;
    // Format phone number to match database constraint
    const from = formatPhoneNumber(body.From);

    if (!messageBody || !from) {
      logger.error('Missing required fields in webhook body', { body });
      res.status(400).send('Missing required fields');
      return;
    }

    logger.info('Processing message:', { 
      from,
      messageBody,
      waId: body.WaId,
      profileName: body.ProfileName
    });

    // Process the message
    await processMessage(from, messageBody);

    // Respond to Twilio with TwiML
    res.setHeader('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    logger.error('Webhook error:', { error });
    res.status(500).send('Internal server error');
  }
};

router.post('/webhook', handleWebhook);

// Health check endpoint
const healthCheck: RequestHandler = (_req, res) => {
  res.json({ status: 'ok' });
};

router.get('/health', healthCheck);

export default router; 