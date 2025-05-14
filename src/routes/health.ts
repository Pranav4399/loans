import { Router } from 'express';
import logger from '../config/logger';
import { getHealthStatus } from '../services/health';

const router = Router();

/**
 * GET /health
 * Health check endpoint for monitoring system status
 */
router.get('/', (req, res) => {
  try {
    const healthInfo = getHealthStatus();
    
    res.status(200).json(healthInfo);
  } catch (error) {
    logger.error('Health check endpoint error:', { error });
    
    res.status(503).json({
      uptime: process.uptime(),
      message: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 