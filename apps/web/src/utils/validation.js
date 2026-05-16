// Centralized validation utilities
export const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone) => {
    // Georgian phone number validation
    const phoneRegex = /^(\+995|995|0)?[5-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  personalNumber: (number) => {
    const cleanedNumber = number.replace(/\s/g, '');
    return /^\d{11}$/.test(cleanedNumber);
  },

  required: (value) => {
    return value && value.trim().length > 0;
  },

  minLength: (value, min) => {
    return value && value.length >= min;
  },

  maxLength: (value, max) => {
    return value && value.length <= max;
  },

  age: (birthDate, minAge = 18) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minAge;
    }
    return age >= minAge;
  }
};

// Form validation helper
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = data[field];
    
    fieldRules.forEach(rule => {
      if (typeof rule === 'function') {
        const result = rule(value);
        if (result !== true) {
          errors[field] = result;
        }
      } else if (typeof rule === 'object') {
        const { validator, message } = rule;
        if (!validator(value)) {
          errors[field] = message;
        }
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Common validation rules
export const commonRules = {
  firstName: [
    { validator: validators.required, message: 'First name is required' }
  ],
  lastName: [
    { validator: validators.required, message: 'Last name is required' }
  ],
  email: [
    { validator: validators.required, message: 'Email is required' },
    { validator: validators.email, message: 'Please enter a valid email' }
  ],
  phone: [
    { validator: validators.required, message: 'Phone number is required' },
    { validator: validators.phone, message: 'Please enter a valid Georgian phone number' }
  ],
  personalNumber: [
    { validator: validators.required, message: 'Personal number is required' },
    { validator: validators.personalNumber, message: 'Personal number must be 11 digits' }
  ],
  dateOfBirth: [
    { validator: validators.required, message: 'Date of birth is required' },
    { validator: (value) => validators.age(value), message: 'You must be at least 18 years old' }
  ]
};

