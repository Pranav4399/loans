export interface LoanApplication {
  id: string;
  created_at: string;
  // Essential Information
  full_name: string;
  phone_number: string;
  email: string;
  loan_type: 'Personal' | 'Business' | 'Education' | 'Home';
  loan_amount: number;
  purpose: string;
  monthly_income: number;
  
  // Optional Information
  employment_status?: 'Salaried' | 'Self-employed' | 'Business Owner';
  current_employer?: string;
  years_employed?: number;
  existing_loans?: boolean;
  cibil_consent?: boolean;
  preferred_tenure?: number;
  preferred_communication?: 'WhatsApp' | 'Email' | 'Both';
  
  // Referral Information
  is_referral?: boolean;
  referrer_id?: string;
  
  // Metadata
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  last_updated: string;
}

export interface Referrer {
  id: string;
  created_at: string;
  // Essential Information
  full_name: string;
  phone_number: string;
  email: string;
  relationship_to_applicant: 'Family' | 'Friend' | 'Colleague' | 'Business Associate' | 'Other';
  // Metadata
  last_updated: string;
}

export interface ConversationState {
  id: string;
  phone_number: string;
  current_step: string;
  form_data: Partial<LoanApplication>;
  referrer_data?: Partial<Referrer>;
  is_referral: boolean;
  created_at: string;
  last_updated: string;
  is_complete: boolean;
}

export interface ConversationData extends Partial<LoanApplication> {
  referrer_data?: Partial<Referrer>;
} 