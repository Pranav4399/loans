import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber } from '../services/webhook';
import { ConversationState } from '../types/chat';
import logger from './logger';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials in environment variables');
}

// Initialize Supabase client with anonymous key (limited permissions)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Supabase admin client with service role key (full access)
export const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

// Database table names
export const LEADS_TABLE = 'leads';
export const CONVERSATION_STATES_TABLE = 'conversation_states';

// Get conversation state by phone number
export async function getConversationState(phoneNumber: string): Promise<ConversationState | null> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  const { data, error } = await supabaseAdmin
    .from(CONVERSATION_STATES_TABLE)
    .select('*')
    .eq('phone_number', formattedPhone)
    .eq('is_complete', false)
    .order('last_updated', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Error getting conversation state:', { error, phoneNumber });
    throw new Error(`Failed to get conversation state: ${error.message}`);
  }

  return data;
}

// Create new conversation state
export async function createConversationState(phoneNumber: string): Promise<ConversationState> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const now = new Date().toISOString();
  
  const newState = {
    phone_number: formattedPhone,
    current_step: 'start',
    form_data: {},
    created_at: now,
    last_updated: now,
    is_complete: false
  };
  
  const { data, error } = await supabaseAdmin
    .from(CONVERSATION_STATES_TABLE)
    .insert([newState])
    .select()
    .single();

  if (error) {
    logger.error('Error creating conversation state:', { error, phoneNumber });
    throw new Error(`Failed to create conversation state: ${error.message}`);
  }
  
  logger.info('Created new conversation state:', { id: data.id, phoneNumber });
  return data;
}

// Update conversation state
export async function updateConversationState(updates: Partial<ConversationState>): Promise<ConversationState> {
  if (!updates.phone_number) {
    throw new Error('Phone number is required for updating conversation state');
  }
  
  const formattedPhone = formatPhoneNumber(updates.phone_number);
  const now = new Date().toISOString();
  
  // Get current state first
  const currentState = await getConversationState(formattedPhone);
  
  if (!currentState) {
    // Create new state if none exists
    return createConversationState(formattedPhone);
  }
  
  // Prepare updates
  const updatedData = {
    ...updates,
    phone_number: formattedPhone,
    last_updated: now
  };
  
  // If form_data is being updated, merge with existing data
  if (updates.form_data) {
    updatedData.form_data = {
      ...currentState.form_data,
      ...updates.form_data
    };
  }
  
  // Update in database
  const { data, error } = await supabaseAdmin
    .from(CONVERSATION_STATES_TABLE)
    .update(updatedData)
    .eq('id', currentState.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating conversation state:', { error, updates });
    throw new Error(`Failed to update conversation state: ${error.message}`);
  }
  
  logger.info('Updated conversation state:', { 
    id: data.id, 
    current_step: data.current_step
  });
  
  return data;
} 