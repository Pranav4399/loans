import express from 'express';
import logger from '../config/logger';
import { getAllLeads, getLeadById, getLeadStats } from '../services/leads';

const router = express.Router();

/**
 * GET /api/leads
 * Get all leads with optional filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const search = req.query.search as string;
    
    // Log the search query for debugging
    if (search) {
      logger.info('Searching leads with term:', { search });
    }
    
    // Get leads from service with search parameter
    const result = await getAllLeads({ page, limit, status, category, search });
    
    // Return formatted response
    res.status(200).json({
      success: true,
      data: result.leads,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    logger.error('Error in getLeads handler:', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leads/stats
 * Get lead statistics grouped by category
 */
router.get('/stats', async (req, res) => {
  try {
    // Get lead statistics from service
    const stats = await getLeadStats();
    
    // Return formatted response
    res.status(200).json({
      success: true,
      ...stats
    });
  } catch (error) {
    logger.error('Error in getLeadStats handler:', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leads/:id
 * Get a specific lead by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get lead from service
    const lead = await getLeadById(id);
    
    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle not found error
    if (errorMessage === 'Lead not found') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    // Handle other errors
    logger.error('Error in getLead handler:', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: errorMessage
    });
  }
});

export default router; 