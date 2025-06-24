import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
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
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
  console.error('=== SERVER ERROR: Unhandled error ===', { error: err });
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=== SERVER: Running on port ${PORT} ===`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('WhatsApp webhook endpoint: /api/webhook');
  console.log('Health check endpoint: /health');
  
  // Keep Supabase alive - ping health endpoint every 4 days (safer margin)
  if (process.env.NODE_ENV === 'production') {
    const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds
    
    setInterval(async () => {
      try {
        const url = process.env.WEBHOOK_URL ? `${process.env.WEBHOOK_URL}/health` : `http://localhost:${PORT}/health`;
        const response = await fetch(url);
        console.log(`Keep-alive ping successful: ${response.status}`);
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
      }
    }, FOUR_DAYS);
    
    console.log('Supabase keep-alive scheduler started (pings every 4 days)');
  }
}); 