// Validation utilities for chatbot inputs
export const validators = {
  /**
   * Validates a phone number in E.164 format
   * Example: +919876543210, +14155552671
   */
  phoneNumber: (value: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(value);
  },

  /**
   * Validates a full name with at least first and last names
   * Example: "John Smith", "Mary Jane Wilson"
   */
  fullName: (value: string): boolean => {
    const nameParts = value.trim().split(/\s+/);
    return nameParts.length >= 2 && nameParts.every(part => part.length >= 2);
  }
}; 