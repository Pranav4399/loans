import { Router } from 'express';
import logger from '../config/logger';
import { GupshupWebhookBody, processWebhook } from '../services/webhook';

const router = Router();

/**
 * GET /api/webhook
 * Handle webhook validation from Gupshup
 */
router.get('/', (req, res) => {
  logger.info('Gupshup webhook validation request received');
  res.status(200).json({ 
    status: 'ok',
    message: 'Webhook endpoint is active' 
  });
});

/**
 * POST /api/webhook
 * Handle incoming WhatsApp messages from Gupshup
 */
router.post('/', async (req, res) => {
  try {
    // Log the incoming webhook request
    logger.info('Received Gupshup webhook request', { 
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      body: req.body
    });
    
    // Validate that this is a message event from Gupshup
    if (req.body.type !== 'message') {
      logger.info('Ignoring non-message webhook event', { type: req.body.type });
      return res.status(200).json({ status: 'ignored' });
    }

    // Filter out system messages (OPTIN, proxy, etc.)
    const messageText = req.body.payload?.payload?.text || req.body.payload?.message?.text || '';
    if (messageText.toLowerCase().includes('optin') || 
        messageText.toLowerCase().includes('proxy') ||
        messageText.toLowerCase().startsWith('system:')) {
      logger.info('Ignoring system message', { messageText });
      return res.status(200).json({ status: 'system_message_ignored' });
    }
    
    // Type the request body as Gupshup webhook
    const body = req.body as GupshupWebhookBody;
    
    // Process the webhook using the service
    await processWebhook(body);
    
    // Respond with success status for Gupshup
    res.status(200).json({ status: 'success' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return appropriate status code based on error
    if (errorMessage === 'Invalid webhook body') {
      res.status(400).json({ error: 'Bad Request: Invalid webhook body' });
    } else if (errorMessage === 'Missing required fields') {
      res.status(400).json({ error: 'Bad Request: Missing required fields' });
    } else {
      logger.error('Webhook processing error:', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

export default router; 