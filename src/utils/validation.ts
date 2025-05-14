// Validation utilities for chatbot inputs
export const validators = {
  /**
   * Validates a phone number
   * Allows both E.164 format (e.g., +919876543210) and 
   * plain numbers without country code (e.g., 9876543210)
   */
  phoneNumber: (value: string): boolean => {
    // Allow E.164 format (with + country code)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    
    // Allow plain numbers (at least 6 digits)
    const plainNumberRegex = /^\d{6,15}$/;
    
    return e164Regex.test(value) || plainNumberRegex.test(value);
  },

  /**
   * Validates a name with first name only
   * Last name is optional and can be any length if provided
   */
  fullName: (value: string): boolean => {
    const trimmedValue = value.trim();
    
    // At least one character required
    if (trimmedValue.length < 1) {
      return false;
    }
    
    // No validation for length of individual parts
    return true;
  }
}; 