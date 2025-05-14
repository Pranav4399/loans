import logger from '../config/logger';
import { LEADS_TABLE, supabase } from '../config/supabase';
import { LeadInfo } from '../types/database';

/**
 * Interface for query options to filter and paginate leads
 */
export interface LeadQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
}

/**
 * Get all leads with optional filtering and pagination
 */
export async function getAllLeads({ 
  page = 1, 
  limit = 10, 
  status, 
  category,
  search
}: LeadQueryOptions): Promise<{ leads: LeadInfo[]; total: number }> {
  try {
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Start building query
    let query = supabase
      .from(LEADS_TABLE)
      .select('*', { count: 'exact' });
    
    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    // Apply search if provided
    if (search && search.trim() !== '') {
      const searchTerm = search.trim().toLowerCase();
      
      // Use OR conditions to search across multiple fields
      query = query.or(
        `full_name.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,subcategory.ilike.%${searchTerm}%`
      );
    }
    
    // Apply pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      logger.error('Error fetching leads from database:', { error });
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }
    
    return {
      leads: data as LeadInfo[],
      total: count || 0
    };
  } catch (error) {
    logger.error('Error in getAllLeads service:', { error });
    throw error;
  }
}

/**
 * Get a specific lead by ID
 */
export async function getLeadById(id: string): Promise<LeadInfo> {
  try {
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found error
        throw new Error('Lead not found');
      }
      
      logger.error('Error fetching lead from database:', { error, id });
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }
    
    return data as LeadInfo;
  } catch (error) {
    logger.error('Error in getLeadById service:', { error, id });
    throw error;
  }
}

/**
 * Get lead statistics grouped by category
 */
export async function getLeadStats(): Promise<{ 
  loans: number; 
  insurance: number; 
  mutualFunds: number; 
  total: number 
}> {
  try {
    // Get all leads to calculate stats
    const { data, error } = await supabase
      .from(LEADS_TABLE)
      .select('category');
    
    if (error) {
      logger.error('Error fetching lead stats from database:', { error });
      throw new Error(`Failed to fetch lead statistics: ${error.message}`);
    }
    
    // Calculate counts
    const leads = data as { category: string }[];
    const stats = {
      loans: leads.filter(lead => lead.category === 'Loans').length,
      insurance: leads.filter(lead => lead.category === 'Insurance').length,
      mutualFunds: leads.filter(lead => lead.category === 'Mutual Funds').length,
      total: leads.length
    };
    
    return stats;
  } catch (error) {
    logger.error('Error in getLeadStats service:', { error });
    throw error;
  }
} 