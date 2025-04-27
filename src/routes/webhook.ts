import { Request, Response, Router, RequestHandler } from 'express';
import { validateWebhook } from '../config/twilio';
import { processMessage } from '../services/chatbot';
import logger from '../config/logger';

const router = Router();

interface TwilioWebhookBody {
  Body: string;
  From: string;
  [key: string]: string;
}

// Webhook for incoming WhatsApp messages
const handleWebhook: RequestHandler = async (req, res) => {
  try {
    // Validate request is from Twilio
    const signature = req.header('X-Twilio-Signature') || '';
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    const body = req.body as TwilioWebhookBody;
    
    if (!validateWebhook(signature, url, body)) {
      logger.error('Invalid webhook signature', { signature, url });
      res.status(403).send('Invalid signature');
      return;
    }

    // Extract message details
    const messageBody = body.Body;
    const from = body.From.replace('whatsapp:', '');

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