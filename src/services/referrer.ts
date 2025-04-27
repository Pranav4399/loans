import { supabase } from '../config/supabase';
import { Referrer } from '../types/database';
import logger from '../config/logger';

/**
 * Create a new referrer in the database
 */
export async function createReferrer(referrerData: Omit<Referrer, 'id' | 'created_at' | 'last_updated'>): Promise<Referrer> {
  logger.info('Creating new referrer:', { referrerData });
  const { data, error } = await supabase
    .from('referrers')
    .insert([referrerData])
    .select()
    .single();

  if (error) {
    logger.error('Error creating referrer:', { error, referrerData });
    throw new Error(`Failed to create referrer: ${error.message}`);
  }

  logger.info('Successfully created referrer:', { data });
  return data;
}

/**
 * Get a referrer by phone number
 */
export async function getReferrerByPhone(phoneNumber: string): Promise<Referrer | null> {
  logger.info('Fetching referrer by phone:', { phoneNumber });
  const { data, error } = await supabase
    .from('referrers')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    logger.error('Error fetching referrer:', { error, phoneNumber });
    throw new Error(`Failed to fetch referrer: ${error.message}`);
  }

  if (!data) {
    logger.info('No referrer found for phone number:', { phoneNumber });
  } else {
    logger.info('Successfully fetched referrer:', { data });
  }
  return data;
}

/**
 * Get a referrer by ID
 */
export async function getReferrerById(id: string): Promise<Referrer | null> {
  logger.info('Fetching referrer by ID:', { id });
  const { data, error } = await supabase
    .from('referrers')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Error fetching referrer:', { error, id });
    throw new Error(`Failed to fetch referrer: ${error.message}`);
  }

  if (!data) {
    logger.info('No referrer found for ID:', { id });
  } else {
    logger.info('Successfully fetched referrer:', { data });
  }
  return data;
}

/**
 * Update a referrer's information
 */
export async function updateReferrer(id: string, updates: Partial<Omit<Referrer, 'id' | 'created_at'>>): Promise<Referrer> {
  logger.info('Updating referrer:', { id, updates });
  const { data, error } = await supabase
    .from('referrers')
    .update({ ...updates, last_updated: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating referrer:', { error, id, updates });
    throw new Error(`Failed to update referrer: ${error.message}`);
  }

  logger.info('Successfully updated referrer:', { data });
  return data;
}

/**
 * Get all loan applications referred by a specific referrer
 */
export async function getReferrerApplications(referrerId: string) {
  logger.info('Fetching applications for referrer:', { referrerId });
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('referrer_id', referrerId)
    .eq('is_referral', true);

  if (error) {
    logger.error('Error fetching referrer applications:', { error, referrerId });
    throw new Error(`Failed to fetch referrer applications: ${error.message}`);
  }

  logger.info('Successfully fetched referrer applications:', { 
    referrerId, 
    applicationCount: data.length 
  });
  return data;
}

/**
 * Check if a phone number belongs to an existing referrer
 */
export async function isExistingReferrer(phoneNumber: string): Promise<boolean> {
  logger.info('Checking if referrer exists:', { phoneNumber });
  const referrer = await getReferrerByPhone(phoneNumber);
  const exists = referrer !== null;
  
  logger.info('Referrer existence check result:', { 
    phoneNumber, 
    exists 
  });
  return exists;
} 