
/**
 * Sistema de validación centralizado para EIC Inspection App
 * Proporciona validaciones reutilizables para formularios y datos
 */

class Validator {
  constructor() {
    this.rules = new Map();
    this.messages = new Map();
    this.setupDefaultRules();
    this.setupDefaultMessages();
  }

  /**
   * Configurar reglas de validación por defecto
   */
  setupDefaultRules() {
    // Reglas básicas
    this.addRule('required', (value) => {
      return value !== null && value !== undefined && value !== '';
    });

    this.addRule('email', (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    this.addRule('minLength', (value, min) => {
      return value && value.length >= min;
    });

    this.addRule('maxLength', (value, max) => {
      return !value || value.length <= max;
    });

    this.addRule('numeric', (value) => {
      return !isNaN(value) && !isNaN(parseFloat(value));
    });

    this.addRule('integer', (value) => {
      return Number.isInteger(Number(value));
    });

    this.addRule('positive', (value) => {
      return Number(value) > 0;
    });

    this.addRule('date', (value) => {
      return !isNaN(Date.parse(value));
    });

    this.addRule('futureDate', (value) => {
      const date = new Date(value);
      return date > new Date();
    });

    this.addRule('pastDate', (value) => {
      const date = new Date(value);
      return date < new Date();
    });

    // Reglas específicas para EIC
    this.addRule('establishmentName', (value) => {
      return value && value.length >= 2 && value.length <= 100;
    });

    this.addRule('inspectorId', (value) => {
      return value && value.length > 0;
    });

    this.addRule('role', (value) => {
      const validRoles = ['inspector', 'admin', 'superadmin'];
      return validRoles.includes(value);
    });

    this.addRule('phoneNumber', (value) => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    });

    this.addRule('url', (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Configurar mensajes de error por defecto
   */
  setupDefaultMessages() {
    this.addMessage('required', 'Este campo es obligatorio');
    this.addMessage('email', 'Debe ser un email válido');
    this.addMessage('minLength', 'Debe tener al menos {min} caracteres');
    this.addMessage('maxLength', 'No puede tener más de {max} caracteres');
    this.addMessage('numeric', 'Debe ser un número válido');
    this.addMessage('integer', 'Debe ser un número entero');
    this.addMessage('positive', 'Debe ser un número positivo');
    this.addMessage('date', 'Debe ser una fecha válida');
    this.addMessage('futureDate', 'Debe ser una fecha futura');
    this.addMessage('pastDate', 'Debe ser una fecha pasada');
    this.addMessage('establishmentName', 'El nombre del establecimiento debe tener entre 2 y 100 caracteres');
    this.addMessage('inspectorId', 'Debe seleccionar un inspector');
    this.addMessage('role', 'Debe ser un rol válido (inspector, admin, superadmin)');
    this.addMessage('phoneNumber', 'Debe ser un número de teléfono válido');
    this.addMessage('url', 'Debe ser una URL válida');
  }

  /**
   * Añadir una nueva regla de validación
   */
  addRule(name, validator) {
    this.rules.set(name, validator);
  }

  /**
   * Añadir un mensaje de error personalizado
   */
  addMessage(rule, message) {
    this.messages.set(rule, message);
  }

  /**
   * Validar un valor contra una regla específica
   */
  validateRule(value, rule, params = {}) {
    const validator = this.rules.get(rule);
    if (!validator) {
      throw new Error(`Regla de validación '${rule}' no encontrada`);
    }

    try {
      return validator(value, ...Object.values(params));
    } catch (error) {
      console.error(`Error en validación '${rule}':`, error);
      return false;
    }
  }

  /**
   * Validar un campo con múltiples reglas
   */
  validateField(value, rules, fieldName = 'campo') {
    const errors = [];

    for (const rule of rules) {
      let ruleName, params = {};

      if (typeof rule === 'string') {
        ruleName = rule;
      } else if (typeof rule === 'object') {
        ruleName = rule.rule;
        params = rule.params || {};
      }

      if (!this.validateRule(value, ruleName, params)) {
        const message = this.formatMessage(ruleName, params, fieldName);
        errors.push(message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validar un objeto completo con esquema de validación
   */
  validate(data, schema) {
    const results = {};
    let isValid = true;

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = this.getNestedValue(data, fieldName);
      const result = this.validateField(value, rules, fieldName);
      
      results[fieldName] = result;
      
      if (!result.isValid) {
        isValid = false;
      }
    }

    return {
      isValid,
      fields: results,
      errors: this.flattenErrors(results)
    };
  }

  /**
   * Validar formulario HTML
   */
  validateForm(formElement, schema) {
    const formData = new FormData(formElement);
    const data = {};

    // Convertir FormData a objeto
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const result = this.validate(data, schema);

    // Mostrar errores en el formulario
    this.displayFormErrors(formElement, result.fields);

    return result;
  }

  /**
   * Mostrar errores en formulario HTML
   */
  displayFormErrors(formElement, fieldResults) {
    // Limpiar errores anteriores
    formElement.querySelectorAll('.error-message').forEach(el => el.remove());
    formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    for (const [fieldName, result] of Object.entries(fieldResults)) {
      const field = formElement.querySelector(`[name="${fieldName}"]`);
      
      if (field && !result.isValid) {
        // Añadir clase de error
        field.classList.add('error');

        // Crear elemento de mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-red-500 text-sm mt-1';
        errorDiv.textContent = result.errors[0]; // Mostrar primer error

        // Insertar después del campo
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
      }
    }
  }

  /**
   * Formatear mensaje de error con parámetros
   */
  formatMessage(rule, params, fieldName) {
    let message = this.messages.get(rule) || `Error de validación en ${rule}`;
    
    // Reemplazar parámetros en el mensaje
    for (const [key, value] of Object.entries(params)) {
      message = message.replace(`{${key}}`, value);
    }

    // Reemplazar nombre del campo
    message = message.replace('{field}', fieldName);

    return message;
  }

  /**
   * Obtener valor anidado de un objeto
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Aplanar errores para fácil acceso
   */
  flattenErrors(fieldResults) {
    const errors = [];
    
    for (const [fieldName, result] of Object.entries(fieldResults)) {
      if (!result.isValid) {
        errors.push(...result.errors.map(error => ({
          field: fieldName,
          message: error
        })));
      }
    }

    return errors;
  }

  /**
   * Esquemas de validación predefinidos para EIC
   */
  getSchemas() {
    return {
      // Esquema para crear usuario
      createUser: {
        email: ['required', 'email'],
        role: ['required', 'role'],
        name: ['required', { rule: 'minLength', params: { min: 2 } }]
      },

      // Esquema para inspección
      inspection: {
        establishmentName: ['required', 'establishmentName'],
        inspectorId: ['required', 'inspectorId'],
        date: ['required', 'date'],
        address: ['required', { rule: 'minLength', params: { min: 5 } }],
        contactPhone: ['phoneNumber']
      },

      // Esquema para login
      login: {
        email: ['required', 'email'],
        password: ['required', { rule: 'minLength', params: { min: 6 } }]
      },

      // Esquema para reporte
      report: {
        title: ['required', { rule: 'minLength', params: { min: 3 } }],
        dateFrom: ['required', 'date'],
        dateTo: ['required', 'date']
      }
    };
  }

  /**
   * Validación en tiempo real para campos
   */
  setupRealtimeValidation(formElement, schema) {
    for (const fieldName of Object.keys(schema)) {
      const field = formElement.querySelector(`[name="${fieldName}"]`);
      
      if (field) {
        field.addEventListener('blur', () => {
          const value = field.value;
          const rules = schema[fieldName];
          const result = this.validateField(value, rules, fieldName);
          
          // Mostrar resultado inmediatamente
          this.displayFieldResult(field, result);
        });

        field.addEventListener('input', () => {
          // Limpiar errores mientras el usuario escribe
          this.clearFieldErrors(field);
        });
      }
    }
  }

  /**
   * Mostrar resultado de validación para un campo específico
   */
  displayFieldResult(field, result) {
    this.clearFieldErrors(field);

    if (!result.isValid) {
      field.classList.add('error');
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message text-red-500 text-sm mt-1';
      errorDiv.textContent = result.errors[0];
      
      field.parentNode.insertBefore(errorDiv, field.nextSibling);
    } else {
      field.classList.remove('error');
      field.classList.add('valid');
    }
  }

  /**
   * Limpiar errores de un campo específico
   */
  clearFieldErrors(field) {
    field.classList.remove('error', 'valid');
    
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  }

  /**
   * Validar datos de inspección específicos
   */
  validateInspectionData(inspectionData) {
    const schema = this.getSchemas().inspection;
    
    // Validaciones adicionales específicas para inspecciones
    const customValidations = {
      // Validar que la fecha no sea futura
      dateNotFuture: () => {
        const inspectionDate = new Date(inspectionData.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Final del día
        
        return inspectionDate <= today;
      },

      // Validar que el checklist tenga al menos una respuesta
      checklistNotEmpty: () => {
        return inspectionData.checklist && 
               Object.keys(inspectionData.checklist).length > 0;
      }
    };

    const result = this.validate(inspectionData, schema);

    // Añadir validaciones personalizadas
    if (!customValidations.dateNotFuture()) {
      result.errors.push({
        field: 'date',
        message: 'La fecha de inspección no puede ser futura'
      });
      result.isValid = false;
    }

    if (!customValidations.checklistNotEmpty()) {
      result.errors.push({
        field: 'checklist',
        message: 'Debe completar al menos un elemento del checklist'
      });
      result.isValid = false;
    }

    return result;
  }
}

// Crear instancia global del validador
const validator = new Validator();

export default validator;
