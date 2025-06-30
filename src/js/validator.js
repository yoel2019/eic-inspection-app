
/**
 * Validation System for EIC Inspection App
 * Provides comprehensive validation for user inputs and data
 */

export class Validator {
  constructor() {
    this.rules = {};
    this.messages = {};
    this.setupDefaultRules();
    this.setupDefaultMessages();
  }

  // Setup default validation rules
  setupDefaultRules() {
    this.rules = {
      required: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      minLength: (value, min) => value && value.length >= min,
      maxLength: (value, max) => value && value.length <= max,
      password: (value) => value && value.length >= 6 && /^(?=.*[a-zA-Z])(?=.*\d)/.test(value),
      strongPassword: (value) => value && value.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value),
      alphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value),
      alpha: (value) => /^[a-zA-Z]+$/.test(value),
      numeric: (value) => /^\d+$/.test(value),
      phone: (value) => /^[\+]?[1-9][\d]{0,15}$/.test(value),
      url: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      role: (value) => ['employee', 'manager', 'admin', 'superadmin'].includes(value),
      customRole: async (value) => {
        // Validate against Firebase roles collection
        try {
          const { db } = await import('./firebase-config.js');
          const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js");
          const roleRef = doc(db, "roles", value);
          const roleSnap = await getDoc(roleRef);
          return roleSnap.exists() && roleSnap.data().isActive !== false;
        } catch (error) {
          console.error('Role validation error:', error);
          return false;
        }
      }
    };
  }

  // Setup default error messages
  setupDefaultMessages() {
    this.messages = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      minLength: 'Must be at least {min} characters long',
      maxLength: 'Must be no more than {max} characters long',
      password: 'Password must be at least 6 characters and contain letters and numbers',
      strongPassword: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
      alphanumeric: 'Only letters and numbers are allowed',
      alpha: 'Only letters are allowed',
      numeric: 'Only numbers are allowed',
      phone: 'Please enter a valid phone number',
      url: 'Please enter a valid URL',
      role: 'Invalid role selected',
      customRole: 'Invalid or inactive role selected'
    };
  }

  // Add custom validation rule
  addRule(name, rule, message) {
    this.rules[name] = rule;
    this.messages[name] = message;
  }

  // Validate single field
  async validateField(value, rules, fieldName = 'Field') {
    const errors = [];
    
    for (const rule of rules) {
      let ruleName, ruleParams;
      
      if (typeof rule === 'string') {
        ruleName = rule;
        ruleParams = [];
      } else if (typeof rule === 'object') {
        ruleName = rule.rule;
        ruleParams = rule.params || [];
      }
      
      if (!this.rules[ruleName]) {
        console.warn(`Validation rule '${ruleName}' not found`);
        continue;
      }
      
      try {
        const isValid = await this.rules[ruleName](value, ...ruleParams);
        
        if (!isValid) {
          let message = this.messages[ruleName] || `${fieldName} is invalid`;
          
          // Replace placeholders in message
          if (ruleParams.length > 0) {
            ruleParams.forEach((param, index) => {
              const placeholder = Object.keys(rule.params || {})[index] || `param${index}`;
              message = message.replace(`{${placeholder}}`, param);
            });
          }
          
          errors.push({
            field: fieldName,
            rule: ruleName,
            message: message
          });
        }
      } catch (error) {
        console.error(`Validation error for rule '${ruleName}':`, error);
        errors.push({
          field: fieldName,
          rule: ruleName,
          message: `Validation failed for ${fieldName}`
        });
      }
    }
    
    return errors;
  }

  // Validate multiple fields
  async validateFields(data, schema) {
    const allErrors = [];
    
    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = data[fieldName];
      const fieldErrors = await this.validateField(value, rules, fieldName);
      allErrors.push(...fieldErrors);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      errorsByField: this.groupErrorsByField(allErrors)
    };
  }

  // Group errors by field name
  groupErrorsByField(errors) {
    return errors.reduce((grouped, error) => {
      if (!grouped[error.field]) {
        grouped[error.field] = [];
      }
      grouped[error.field].push(error);
      return grouped;
    }, {});
  }

  // User-specific validation schemas
  getUserValidationSchema() {
    return {
      email: ['required', 'email'],
      displayName: ['required', { rule: 'minLength', params: [2] }, { rule: 'maxLength', params: [50] }],
      role: ['required', 'customRole'],
      password: ['required', 'password']
    };
  }

  getUserUpdateValidationSchema() {
    return {
      displayName: ['required', { rule: 'minLength', params: [2] }, { rule: 'maxLength', params: [50] }],
      role: ['required', 'customRole']
    };
  }

  // Role-specific validation schemas
  getRoleValidationSchema() {
    return {
      name: ['required', { rule: 'minLength', params: [2] }, { rule: 'maxLength', params: [30] }],
      description: ['required', { rule: 'minLength', params: [10] }, { rule: 'maxLength', params: [200] }]
    };
  }

  // Sanitize input data
  sanitizeInput(value, type = 'string') {
    if (value === null || value === undefined) {
      return '';
    }
    
    switch (type) {
      case 'string':
        return value.toString().trim();
      case 'email':
        return value.toString().toLowerCase().trim();
      case 'number':
        return parseInt(value) || 0;
      case 'float':
        return parseFloat(value) || 0.0;
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  // Sanitize object data
  sanitizeData(data, schema) {
    const sanitized = {};
    
    for (const [key, type] of Object.entries(schema)) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = this.sanitizeInput(data[key], type);
      }
    }
    
    return sanitized;
  }

  // Check password strength
  checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    let strength = 'Very Weak';
    if (score >= 4) strength = 'Strong';
    else if (score >= 3) strength = 'Medium';
    else if (score >= 2) strength = 'Weak';
    
    return {
      score,
      strength,
      checks,
      isValid: score >= 3
    };
  }

  // Validate file upload
  validateFile(file, options = {}) {
    const errors = [];
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
      maxFiles = 1
    } = options;
    
    if (!file) {
      errors.push('No file selected');
      return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create global validator instance
export const validator = new Validator();
