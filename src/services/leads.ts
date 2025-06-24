import { LEADS_TABLE, supabaseAdmin } from '../config/supabase';
import { LeadInfo } from '../types/database';
import { formatPhoneNumber } from './webhook';


// Define the query options interface
export interface LeadQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
}

/**
 * Get all leads with optional filtering, pagination, and search
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
    
    // Build the query
    let query = supabaseAdmin
      .from(LEADS_TABLE)
      .select('*', { count: 'exact' });
    
    // Apply filters
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
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }
    
    return {
      leads: data as LeadInfo[],
      total: count || 0
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get a specific lead by ID
 */
export async function getLeadById(id: string): Promise<LeadInfo> {
  try {
    const { data, error } = await supabaseAdmin
      .from(LEADS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found error
        throw new Error('Lead not found');
      }
      
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }
    
    return data as LeadInfo;
  } catch (error) {
    throw error;
  }
}

/**
 * Update a lead's information
 */
export async function updateLead(id: string, updates: Partial<LeadInfo>): Promise<LeadInfo> {
  try {
    // First check if the lead exists
    await getLeadById(id);
    
    // Perform the update
    const { data, error } = await supabaseAdmin
      .from(LEADS_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }
    
    return data as LeadInfo;
  } catch (error) {
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
    const { data, error } = await supabaseAdmin
      .from(LEADS_TABLE)
      .select('category');
    
    if (error) {
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
    throw error;
  }
}

// Create a new lead in the database
export async function createLead(leadData: Omit<LeadInfo, 'id' | 'created_at' | 'status'>): Promise<LeadInfo> {
  const formattedPhone = formatPhoneNumber(leadData.contact_number);
  
  const { data, error } = await supabaseAdmin
    .from(LEADS_TABLE)
    .insert([{
      ...leadData,
      contact_number: formattedPhone,
      created_at: new Date().toISOString(),
      status: 'pending'
    }])
    .select()
    .single();

  if (error) {
    console.error('=== LEADS ERROR: Failed to create lead ===', { 
      error,
      formattedPhone,
      leadData: JSON.stringify(leadData)
    });
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  console.log('=== LEADS DEBUG: Lead created successfully ===', { 
    id: data.id,
    category: data.category,
    subcategory: data.subcategory
  });
  
  return data;
}