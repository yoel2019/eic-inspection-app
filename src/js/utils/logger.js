
/**
 * Sistema de logging centralizado para EIC Inspection App
 * Proporciona logging estructurado con diferentes niveles
 */

class Logger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
    
    this.currentLevel = this.levels.INFO;
    this.logs = [];
    this.maxLogs = 1000; // Máximo número de logs en memoria
  }

  /**
   * Configura el nivel mínimo de logging
   * @param {string} level - Nivel de logging (DEBUG, INFO, WARN, ERROR, CRITICAL)
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }

  /**
   * Registra un mensaje de log
   * @param {string} level - Nivel del mensaje
   * @param {string} message - Mensaje a registrar
   * @param {Object} data - Datos adicionales
   * @param {string} component - Componente que genera el log
   */
  log(level, message, data = {}, component = 'SYSTEM') {
    const levelValue = this.levels[level];
    
    if (levelValue < this.currentLevel) {
      return; // No registrar si está por debajo del nivel mínimo
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      user: window.eicApp?.currentUser?.email || 'anonymous',
      userRole: window.eicApp?.currentUserRole || 'unknown',
      sessionId: this.getSessionId(),
      url: window.location.href
    };

    // Añadir a logs en memoria
    this.logs.push(logEntry);
    
    // Mantener solo los últimos maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output a consola con formato
    this.outputToConsole(logEntry);

    // Enviar errores críticos a sistema de monitoreo
    if (levelValue >= this.levels.ERROR) {
      this.reportError(logEntry);
    }

    // Guardar en localStorage para debugging
    this.saveToLocalStorage(logEntry);
  }

  /**
   * Métodos de conveniencia para diferentes niveles
   */
  debug(message, data, component) {
    this.log('DEBUG', message, data, component);
  }

  info(message, data, component) {
    this.log('INFO', message, data, component);
  }

  warn(message, data, component) {
    this.log('WARN', message, data, component);
  }

  error(message, data, component) {
    this.log('ERROR', message, data, component);
  }

  critical(message, data, component) {
    this.log('CRITICAL', message, data, component);
  }

  /**
   * Output formateado a consola
   */
  outputToConsole(logEntry) {
    const { level, timestamp, component, message, data } = logEntry;
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const prefix = `[${timeStr}] [${level}] [${component}]`;
    
    const styles = {
      DEBUG: 'color: #888',
      INFO: 'color: #2196F3',
      WARN: 'color: #FF9800',
      ERROR: 'color: #F44336',
      CRITICAL: 'color: #F44336; font-weight: bold; background: #ffebee'
    };

    if (Object.keys(data).length > 0) {
      console.groupCollapsed(`%c${prefix} ${message}`, styles[level]);
      console.log('Data:', data);
      console.log('Full log entry:', logEntry);
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${message}`, styles[level]);
    }
  }

  /**
   * Reportar errores críticos
   */
  reportError(logEntry) {
    // En producción, aquí se enviaría a un servicio de monitoreo
    // como Sentry, LogRocket, etc.
    
    if (window.gtag) {
      // Enviar a Google Analytics si está disponible
      window.gtag('event', 'exception', {
        description: `${logEntry.component}: ${logEntry.message}`,
        fatal: logEntry.level === 'CRITICAL'
      });
    }

    // Guardar en Firestore para análisis posterior
    this.saveErrorToFirestore(logEntry);
  }

  /**
   * Guardar error en Firestore
   */
  async saveErrorToFirestore(logEntry) {
    try {
      if (window.eicApp?.db) {
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js');
        
        await addDoc(collection(window.eicApp.db, 'error_logs'), {
          ...logEntry,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to save error to Firestore:', error);
    }
  }

  /**
   * Guardar en localStorage para debugging
   */
  saveToLocalStorage(logEntry) {
    try {
      const key = `eic_logs_${new Date().toDateString()}`;
      const existingLogs = JSON.parse(localStorage.getItem(key) || '[]');
      existingLogs.push(logEntry);
      
      // Mantener solo los últimos 100 logs por día
      if (existingLogs.length > 100) {
        existingLogs.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('Failed to save log to localStorage:', error);
    }
  }

  /**
   * Obtener ID de sesión único
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  /**
   * Obtener logs filtrados
   */
  getLogs(filters = {}) {
    let filteredLogs = [...this.logs];

    if (filters.level) {
      const minLevel = this.levels[filters.level];
      filteredLogs = filteredLogs.filter(log => this.levels[log.level] >= minLevel);
    }

    if (filters.component) {
      filteredLogs = filteredLogs.filter(log => log.component === filters.component);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    return filteredLogs;
  }

  /**
   * Exportar logs como JSON
   */
  exportLogs(filters = {}) {
    const logs = this.getLogs(filters);
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `eic_logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  /**
   * Limpiar logs antiguos
   */
  clearOldLogs(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoffDate);
    
    // Limpiar localStorage también
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('eic_logs_')) {
        const logDate = new Date(key.replace('eic_logs_', ''));
        if (logDate < cutoffDate) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Obtener estadísticas de logs
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byComponent: {},
      last24Hours: 0,
      errors: 0
    };

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    this.logs.forEach(log => {
      // Por nivel
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Por componente
      stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
      
      // Últimas 24 horas
      if (new Date(log.timestamp) >= last24Hours) {
        stats.last24Hours++;
      }
      
      // Errores
      if (this.levels[log.level] >= this.levels.ERROR) {
        stats.errors++;
      }
    });

    return stats;
  }
}

// Crear instancia global del logger
const logger = new Logger();

// Configurar nivel basado en entorno
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
  logger.setLevel('DEBUG');
} else {
  logger.setLevel('INFO');
}

// Capturar errores globales de JavaScript
window.addEventListener('error', (event) => {
  logger.error('JavaScript Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  }, 'GLOBAL');
});

// Capturar promesas rechazadas
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', {
    reason: event.reason,
    stack: event.reason?.stack
  }, 'GLOBAL');
});

export default logger;
