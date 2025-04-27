import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import webhookRoutes from './routes/webhook';
import logger from './config/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Production middleware
if (process.env.NODE_ENV === 'production') {
  // Enable compression
  app.use(compression());
  
  // Security headers
  app.use(helmet());
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Register routes
app.use('/api', webhookRoutes);

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString()
  };
  
  try {
    logger.info('Health check requested');
    res.json(healthcheck);
  } catch (error) {
    logger.error('Health check failed:', { error });
    healthcheck.message = 'ERROR';
    res.status(503).json(healthcheck);
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', { error: err });
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info('WhatsApp webhook endpoint: /api/webhook');
}); 