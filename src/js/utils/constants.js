
/**
 * Constantes globales para EIC Inspection App
 * Centraliza valores constantes utilizados en toda la aplicación
 */

// Roles de usuario
export const USER_ROLES = {
  INSPECTOR: 'inspector',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
};

// Permisos por rol
export const ROLE_PERMISSIONS = {
  [USER_ROLES.INSPECTOR]: [
    'view_own_inspections',
    'create_inspection',
    'edit_own_inspection',
    'view_own_reports'
  ],
  [USER_ROLES.ADMIN]: [
    'view_own_inspections',
    'create_inspection',
    'edit_own_inspection',
    'view_own_reports',
    'view_all_inspections',
    'view_all_reports',
    'manage_users',
    'view_dashboard',
    'export_reports'
  ],
  [USER_ROLES.SUPERADMIN]: [
    'view_own_inspections',
    'create_inspection',
    'edit_own_inspection',
    'view_own_reports',
    'view_all_inspections',
    'view_all_reports',
    'manage_users',
    'view_dashboard',
    'export_reports',
    'manage_roles',
    'system_configuration',
    'view_logs',
    'manage_system'
  ]
};

// Estados de inspección
export const INSPECTION_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Tipos de establecimiento
export const ESTABLISHMENT_TYPES = {
  RESTAURANT: 'restaurant',
  CAFETERIA: 'cafeteria',
  FOOD_TRUCK: 'food_truck',
  BAKERY: 'bakery',
  GROCERY_STORE: 'grocery_store',
  WAREHOUSE: 'warehouse',
  PROCESSING_PLANT: 'processing_plant',
  OTHER: 'other'
};

// Categorías de checklist
export const CHECKLIST_CATEGORIES = {
  FOOD_SAFETY: 'food_safety',
  HYGIENE: 'hygiene',
  EQUIPMENT: 'equipment',
  STORAGE: 'storage',
  DOCUMENTATION: 'documentation',
  STAFF_TRAINING: 'staff_training',
  PEST_CONTROL: 'pest_control',
  WASTE_MANAGEMENT: 'waste_management'
};

// Niveles de cumplimiento
export const COMPLIANCE_LEVELS = {
  EXCELLENT: 'excellent',      // 90-100%
  GOOD: 'good',               // 75-89%
  SATISFACTORY: 'satisfactory', // 60-74%
  NEEDS_IMPROVEMENT: 'needs_improvement', // 40-59%
  POOR: 'poor'                // 0-39%
};

// Colores para niveles de cumplimiento
export const COMPLIANCE_COLORS = {
  [COMPLIANCE_LEVELS.EXCELLENT]: '#10B981',      // Verde
  [COMPLIANCE_LEVELS.GOOD]: '#84CC16',           // Verde claro
  [COMPLIANCE_LEVELS.SATISFACTORY]: '#F59E0B',   // Amarillo
  [COMPLIANCE_LEVELS.NEEDS_IMPROVEMENT]: '#F97316', // Naranja
  [COMPLIANCE_LEVELS.POOR]: '#EF4444'            // Rojo
};

// Tipos de notificación
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Configuración de SweetAlert2
export const SWAL_CONFIG = {
  [NOTIFICATION_TYPES.SUCCESS]: {
    icon: 'success',
    confirmButtonColor: '#10B981',
    timer: 3000,
    timerProgressBar: true
  },
  [NOTIFICATION_TYPES.ERROR]: {
    icon: 'error',
    confirmButtonColor: '#EF4444',
    timer: 5000,
    timerProgressBar: true
  },
  [NOTIFICATION_TYPES.WARNING]: {
    icon: 'warning',
    confirmButtonColor: '#F59E0B',
    timer: 4000,
    timerProgressBar: true
  },
  [NOTIFICATION_TYPES.INFO]: {
    icon: 'info',
    confirmButtonColor: '#3B82F6',
    timer: 3000,
    timerProgressBar: true
  }
};

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MOBILE_PAGE_SIZE: 10
};

// Límites de archivos
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_FILES: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
};

// Configuración de fechas
export const DATE_CONFIG = {
  FORMAT: 'YYYY-MM-DD',
  DISPLAY_FORMAT: 'DD/MM/YYYY',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  LOCALE: 'es-ES'
};

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifique su conexión a internet.',
  PERMISSION_DENIED: 'No tiene permisos para realizar esta acción.',
  INVALID_DATA: 'Los datos proporcionados no son válidos.',
  USER_NOT_FOUND: 'Usuario no encontrado.',
  INSPECTION_NOT_FOUND: 'Inspección no encontrada.',
  SAVE_ERROR: 'Error al guardar los datos.',
  LOAD_ERROR: 'Error al cargar los datos.',
  AUTH_ERROR: 'Error de autenticación.',
  VALIDATION_ERROR: 'Error de validación en los datos.',
  SERVER_ERROR: 'Error interno del servidor.'
};

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Datos guardados correctamente.',
  UPDATE_SUCCESS: 'Datos actualizados correctamente.',
  DELETE_SUCCESS: 'Elemento eliminado correctamente.',
  CREATE_SUCCESS: 'Elemento creado correctamente.',
  LOGIN_SUCCESS: 'Sesión iniciada correctamente.',
  LOGOUT_SUCCESS: 'Sesión cerrada correctamente.',
  EXPORT_SUCCESS: 'Reporte exportado correctamente.'
};

// Configuración de la aplicación
export const APP_CONFIG = {
  NAME: 'EIC Inspection App',
  VERSION: '1.0.0',
  DESCRIPTION: 'Sistema de Inspección de Establecimientos de Comida',
  AUTHOR: 'EIC Development Team',
  CONTACT_EMAIL: 'support@eic-app.com',
  GITHUB_REPO: 'https://github.com/yoel2019/eic-inspection-app'
};

// URLs de la aplicación
export const APP_URLS = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INSPECTIONS: '/inspections',
  REPORTS: '/reports',
  USERS: '/users',
  PROFILE: '/profile',
  SETTINGS: '/settings'
};

// Configuración de Firebase Collections
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  INSPECTIONS: 'inspections',
  REPORTS: 'reports',
  ERROR_LOGS: 'error_logs',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings'
};

// Configuración de localStorage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'eic_user_preferences',
  DRAFT_INSPECTION: 'eic_draft_inspection',
  LAST_LOGIN: 'eic_last_login',
  THEME: 'eic_theme',
  LANGUAGE: 'eic_language'
};

// Configuración de temas
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// Idiomas soportados
export const LANGUAGES = {
  ES: 'es',
  EN: 'en'
};

// Configuración de exportación
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json'
};

// Configuración de gráficos
export const CHART_CONFIG = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#10B981',
    WARNING: '#F59E0B',
    DANGER: '#EF4444',
    INFO: '#6B7280'
  },
  ANIMATION_DURATION: 750,
  RESPONSIVE: true
};

// Configuración de validación
export const VALIDATION_CONFIG = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  ESTABLISHMENT_NAME_MIN_LENGTH: 2,
  ESTABLISHMENT_NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// Configuración de timeouts
export const TIMEOUTS = {
  API_REQUEST: 30000,      // 30 segundos
  FILE_UPLOAD: 60000,      // 1 minuto
  AUTH_CHECK: 5000,        // 5 segundos
  NOTIFICATION: 3000,      // 3 segundos
  DEBOUNCE: 300           // 300ms
};

// Configuración de retry
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2
};

// Eventos personalizados de la aplicación
export const APP_EVENTS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  INSPECTION_CREATED: 'inspection:created',
  INSPECTION_UPDATED: 'inspection:updated',
  INSPECTION_DELETED: 'inspection:deleted',
  REPORT_GENERATED: 'report:generated',
  ERROR_OCCURRED: 'error:occurred',
  DATA_LOADED: 'data:loaded'
};

// Configuración de métricas
export const METRICS = {
  PERFORMANCE_MARKS: {
    APP_START: 'app-start',
    APP_READY: 'app-ready',
    DATA_LOADED: 'data-loaded',
    VIEW_RENDERED: 'view-rendered'
  },
  ANALYTICS_EVENTS: {
    PAGE_VIEW: 'page_view',
    INSPECTION_CREATED: 'inspection_created',
    REPORT_GENERATED: 'report_generated',
    USER_ACTION: 'user_action',
    ERROR_OCCURRED: 'error_occurred'
  }
};

// Configuración de desarrollo
export const DEV_CONFIG = {
  DEBUG_MODE: window.location.hostname === 'localhost',
  MOCK_DATA: false,
  ENABLE_LOGGING: true,
  SHOW_PERFORMANCE_METRICS: true
};

// Utilidades para trabajar con constantes
export const UTILS = {
  /**
   * Verificar si un usuario tiene un permiso específico
   */
  hasPermission(userRole, permission) {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
  },

  /**
   * Obtener color para nivel de cumplimiento
   */
  getComplianceColor(percentage) {
    if (percentage >= 90) return COMPLIANCE_COLORS[COMPLIANCE_LEVELS.EXCELLENT];
    if (percentage >= 75) return COMPLIANCE_COLORS[COMPLIANCE_LEVELS.GOOD];
    if (percentage >= 60) return COMPLIANCE_COLORS[COMPLIANCE_LEVELS.SATISFACTORY];
    if (percentage >= 40) return COMPLIANCE_COLORS[COMPLIANCE_LEVELS.NEEDS_IMPROVEMENT];
    return COMPLIANCE_COLORS[COMPLIANCE_LEVELS.POOR];
  },

  /**
   * Obtener nivel de cumplimiento basado en porcentaje
   */
  getComplianceLevel(percentage) {
    if (percentage >= 90) return COMPLIANCE_LEVELS.EXCELLENT;
    if (percentage >= 75) return COMPLIANCE_LEVELS.GOOD;
    if (percentage >= 60) return COMPLIANCE_LEVELS.SATISFACTORY;
    if (percentage >= 40) return COMPLIANCE_LEVELS.NEEDS_IMPROVEMENT;
    return COMPLIANCE_LEVELS.POOR;
  },

  /**
   * Formatear fecha según configuración
   */
  formatDate(date, format = DATE_CONFIG.DISPLAY_FORMAT) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year);
  },

  /**
   * Verificar si un archivo es válido
   */
  isValidFile(file) {
    return FILE_LIMITS.ALLOWED_TYPES.includes(file.type) &&
           file.size <= FILE_LIMITS.MAX_SIZE_MB * 1024 * 1024;
  }
};

export default {
  USER_ROLES,
  ROLE_PERMISSIONS,
  INSPECTION_STATUS,
  ESTABLISHMENT_TYPES,
  CHECKLIST_CATEGORIES,
  COMPLIANCE_LEVELS,
  COMPLIANCE_COLORS,
  NOTIFICATION_TYPES,
  SWAL_CONFIG,
  PAGINATION,
  FILE_LIMITS,
  DATE_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  APP_CONFIG,
  APP_URLS,
  FIREBASE_COLLECTIONS,
  STORAGE_KEYS,
  THEMES,
  LANGUAGES,
  EXPORT_FORMATS,
  CHART_CONFIG,
  VALIDATION_CONFIG,
  TIMEOUTS,
  RETRY_CONFIG,
  APP_EVENTS,
  METRICS,
  DEV_CONFIG,
  UTILS
};
