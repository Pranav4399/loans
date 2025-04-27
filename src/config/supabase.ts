import { createClient } from '@supabase/supabase-js';
import { LoanApplication, ConversationState } from '../types/database';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials in environment variables');
}

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Database table names
export const TABLES = {
  LOAN_APPLICATIONS: 'loan_applications',
  CONVERSATION_STATES: 'conversation_states',
} as const;

// Helper functions for loan applications
export async function createLoanApplication(data: Partial<LoanApplication>) {
  const { data: result, error } = await supabase
    .from(TABLES.LOAN_APPLICATIONS)
    .insert([{ ...data, status: 'pending', last_updated: new Date().toISOString() }])
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateLoanApplication(id: string, data: Partial<LoanApplication>) {
  const { data: result, error } = await supabase
    .from(TABLES.LOAN_APPLICATIONS)
    .update({ ...data, last_updated: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

// Helper functions for conversation states
export async function getConversationState(phone_number: string) {
  const { data, error } = await supabase
    .from(TABLES.CONVERSATION_STATES)
    .select()
    .eq('phone_number', phone_number)
    .eq('is_complete', false)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return data;
}

export async function updateConversationState(
  phone_number: string,
  data: Partial<ConversationState>
) {
  const { data: existing } = await supabase
    .from(TABLES.CONVERSATION_STATES)
    .select()
    .eq('phone_number', phone_number)
    .eq('is_complete', false)
    .single();

  if (!existing) {
    const { data: result, error } = await supabase
      .from(TABLES.CONVERSATION_STATES)
      .insert([{
        phone_number,
        ...data,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_complete: false,
      }])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  const { data: result, error } = await supabase
    .from(TABLES.CONVERSATION_STATES)
    .update({
      ...data,
      last_updated: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

// Get loan application status
export async function getLoanApplicationStatus(id: string) {
  const { data, error } = await supabase
    .from(TABLES.LOAN_APPLICATIONS)
    .select('id, status, last_updated')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Get loan applications by phone number
export async function getLoanApplicationsByPhone(phone_number: string) {
  const { data, error } = await supabase
    .from(TABLES.LOAN_APPLICATIONS)
    .select('*')
    .eq('phone_number', phone_number)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Clean up incomplete conversations older than 24 hours
export async function cleanupIncompleteConversations() {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { error } = await supabase
    .from(TABLES.CONVERSATION_STATES)
    .delete()
    .eq('is_complete', false)
    .lt('last_updated', oneDayAgo.toISOString());

  if (error) throw error;
} 