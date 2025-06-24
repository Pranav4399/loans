import express from 'express';
import { getAllLeads, getLeadById, getLeadStats, updateLead } from '../services/leads';

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
    // Get stats from service
    const stats = await getLeadStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: errorMessage
    });
  }
});

/**
 * PUT /api/leads/:id
 * Update a lead's information (currently only status)
 */
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Validate status value
    const validStatuses = ['pending', 'contacted', 'converted', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Update lead in the database
    const updatedLead = await updateLead(id, { status });
    
    res.status(200).json({
      success: true,
      data: updatedLead
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
    res.status(500).json({
      success: false,
      message: 'Failed to update lead',
      error: errorMessage
    });
  }
});

export default router; 