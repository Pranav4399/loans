// Define main category types
export type CategoryType = 'Loans' | 'Insurance' | 'Mutual Funds';

// Define subcategories for each main category
export type LoanSubcategory = 
  | 'Personal Loan'
  | 'Business Loan'
  | 'Home Loan'
  | 'Loan Against Property'
  | 'Car Loan'
  | 'Working Capital';

export type InsuranceSubcategory = 
  | 'Health Insurance'
  | 'Motor Vehicle Insurance'
  | 'Life Insurance'
  | 'Property Insurance';

export type MutualFundSubcategory = 'General Inquiry';

// Type for subcategories
export type SubcategoryType = LoanSubcategory | InsuranceSubcategory | MutualFundSubcategory;

// Lead information structure
export interface LeadInfo {
  id: string;
  full_name: string;
  contact_number: string;
  category: CategoryType;
  subcategory: SubcategoryType;
  created_at: string;
  status: 'pending' | 'contacted' | 'converted' | 'closed';
} 