import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import logger from './config/logger';
import healthRoutes from './routes/health';
import leadsRoutes from './routes/leads';
import webhookRoutes from './routes/webhook';

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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Register routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/health', healthRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', { error: err });
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Start server (only in non-serverless environments)
const PORT = process.env.PORT || 3000;

// For serverless environments like Vercel, export the app
// For traditional hosting, start the server
if (process.env.VERCEL) {
  // In Vercel, just export the app
  logger.info('Running in Vercel serverless environment');
} else {
  // In traditional hosting, start the server
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Frontend dashboard available at: /');
    logger.info('WhatsApp webhook endpoint: /api/webhook');
    logger.info('Leads API endpoint: /api/leads');
    logger.info('Health check endpoint: /health');
    
    // Keep Supabase alive - ping health endpoint every 4 days (safer margin)
    if (process.env.NODE_ENV === 'production') {
      const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds
      
      setInterval(async () => {
        try {
          const url = process.env.WEBHOOK_URL ? `${process.env.WEBHOOK_URL}/health` : `http://localhost:${PORT}/health`;
          const response = await fetch(url);
          logger.info(`Keep-alive ping successful: ${response.status}`);
        } catch (error) {
          logger.error('Keep-alive ping failed:', error);
        }
      }, FOUR_DAYS);
      
      logger.info('Supabase keep-alive scheduler started (pings every 4 days)');
    }
  });
}

// Export the Express app for serverless environments
export default app; 