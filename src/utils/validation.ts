// Validation functions
export const validators = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^\+[1-9]\d{1,14}$/.test(value),
  number: (value: string) => !isNaN(Number(value)) && Number(value) > 0,
}; 