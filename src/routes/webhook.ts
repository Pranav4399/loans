import { Router } from 'express';
import logger from '../config/logger';
import { processWebhook, TwilioWebhookBody } from '../services/webhook';

const router = Router();

/**
 * POST /api/webhook
 * Handle incoming WhatsApp messages from Twilio
 */
router.post('/', async (req, res) => {
  try {
    // Get the Twilio signature
    const signature = req.header('X-Twilio-Signature') || '';
    
    // Construct the full webhook URL
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhook`;
    
    // Normalize the request body
    const body: TwilioWebhookBody = {
      ...req.body,
      Body: String(req.body.Body || ''),
      From: String(req.body.From || ''),
      WaId: String(req.body.WaId || ''),
      ProfileName: String(req.body.ProfileName || '')
    };
    
    logger.info('Received webhook request', { 
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type')
    });
    
    // Process the webhook using the service
    await processWebhook(body, signature, webhookUrl);
    
    // Respond to Twilio with TwiML
    res.setHeader('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return appropriate status code based on error
    if (errorMessage === 'Invalid signature') {
      res.status(403).send('Forbidden: Invalid signature');
    } else if (errorMessage === 'Missing required fields') {
      res.status(400).send('Bad Request: Missing required fields');
    } else {
      logger.error('Webhook processing error:', { error });
      res.status(500).send('Internal Server Error');
    }
  }
});

export default router; 