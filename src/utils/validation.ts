// Validation utilities for loan application fields
export const validators = {
  // Basic validators
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phoneNumber: (value: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(value);
  },

  number: (value: string): boolean => {
    const numberRegex = /^\d+$/;
    return numberRegex.test(value) && Number(value) > 0;
  },

  // Name validation
  fullName: (value: string): boolean => {
    const nameParts = value.trim().split(/\s+/);
    return nameParts.length >= 2 && nameParts.every(part => part.length >= 2);
  },

  // Loan type validation (1-4)
  loanType: (value: string): boolean => {
    return ['1', '2', '3', '4'].includes(value);
  },

  // Loan amount validation (reasonable range)
  loanAmount: (value: string): boolean => {
    const amount = Number(value);
    return !isNaN(amount) && amount >= 10000 && amount <= 10000000; // Between 10K and 1Cr
  },

  // Purpose validation
  purpose: (value: string): boolean => {
    // At least 10 chars, only letters, numbers, spaces, and basic punctuation
    const purposeRegex = /^[A-Za-z0-9\s.,!?-]{10,100}$/;
    return purposeRegex.test(value);
  },

  // Monthly income validation (reasonable range)
  monthlyIncome: (value: string): boolean => {
    const income = Number(value);
    return !isNaN(income) && income >= 10000 && income <= 1000000; // Between 10K and 10L per month
  },

  // Employment status validation (1-3)
  employmentStatus: (value: string): boolean => {
    return ['1', '2', '3'].includes(value);
  },

  // Current employer validation
  currentEmployer: (value: string): boolean => {
    // At least 2 chars, letters, numbers, spaces, and basic punctuation
    const employerRegex = /^[A-Za-z0-9\s.,&-]{2,50}$/;
    return employerRegex.test(value);
  },

  // Years employed validation
  yearsEmployed: (value: string): boolean => {
    const years = Number(value);
    return !isNaN(years) && years > 0 && years <= 50; // Between 1 and 50 years
  },

  // Yes/No validation
  yesNo: (value: string): boolean => {
    return ['yes', 'no'].includes(value.toLowerCase());
  },

  // Preferred tenure validation
  preferredTenure: (value: string): boolean => {
    const months = Number(value);
    return !isNaN(months) && months >= 3 && months <= 360; // Between 3 months and 30 years
  },

  // Communication preference validation (1-3)
  communicationPreference: (value: string): boolean => {
    return ['1', '2', '3'].includes(value);
  }
}; 