
/**
 * Logger System for EIC Inspection App
 * Provides centralized logging with different levels and Firebase integration
 */

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export class Logger {
  constructor() {
    this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
    this.enableConsole = true;
    this.enableFirestore = true;
    this.maxLocalLogs = 100;
    this.localLogs = [];
  }

  // Set log level
  setLogLevel(level) {
    this.logLevel = level;
  }

  // Enable/disable console logging
  setConsoleLogging(enabled) {
    this.enableConsole = enabled;
  }

  // Enable/disable Firestore logging
  setFirestoreLogging(enabled) {
    this.enableFirestore = enabled;
  }

  // Main logging method
  async log(level, message, data = null, category = 'GENERAL') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      category,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add user context if available
    if (window.eicApp && window.eicApp.currentUser) {
      logEntry.userId = window.eicApp.currentUser.uid;
      logEntry.userEmail = window.eicApp.currentUser.email;
      logEntry.userRole = window.eicApp.currentUserRole;
    }

    // Store locally
    this.addToLocalLogs(logEntry);

    // Console logging
    if (this.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Firestore logging for important events
    if (this.enableFirestore && this.shouldLogToFirestore(level)) {
      try {
        await this.logToFirestore(logEntry);
      } catch (error) {
        console.error('Failed to log to Firestore:', error);
      }
    }
  }

  // Convenience methods
  async debug(message, data = null, category = 'DEBUG') {
    await this.log('DEBUG', message, data, category);
  }

  async info(message, data = null, category = 'INFO') {
    await this.log('INFO', message, data, category);
  }

  async warn(message, data = null, category = 'WARNING') {
    await this.log('WARN', message, data, category);
  }

  async error(message, data = null, category = 'ERROR') {
    await this.log('ERROR', message, data, category);
  }

  // User management specific logging
  async logUserAction(action, targetUserId, details = null) {
    await this.log('INFO', `User action: ${action}`, {
      targetUserId,
      details
    }, 'USER_MANAGEMENT');
  }

  // Authentication logging
  async logAuthEvent(event, details = null) {
    await this.log('INFO', `Auth event: ${event}`, details, 'AUTHENTICATION');
  }

  // System error logging
  async logSystemError(error, context = null) {
    await this.log('ERROR', `System error: ${error.message}`, {
      stack: error.stack,
      context
    }, 'SYSTEM_ERROR');
  }

  // Add to local logs with rotation
  addToLocalLogs(logEntry) {
    this.localLogs.push(logEntry);
    if (this.localLogs.length > this.maxLocalLogs) {
      this.localLogs.shift(); // Remove oldest log
    }
  }

  // Console logging with colors
  logToConsole(logEntry) {
    const colors = {
      DEBUG: 'color: #6B7280',
      INFO: 'color: #3B82F6',
      WARN: 'color: #F59E0B',
      ERROR: 'color: #EF4444'
    };

    const style = colors[logEntry.level] || 'color: #000000';
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.category}]`;
    
    console.log(`%c${prefix} ${logEntry.message}`, style, logEntry.data || '');
  }

  // Determine if should log to Firestore
  shouldLogToFirestore(level) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const logLevelIndex = levels.indexOf(level);
    
    // Only log WARN and ERROR to Firestore by default
    return logLevelIndex >= 2 || level === 'ERROR';
  }

  // Log to Firestore
  async logToFirestore(logEntry) {
    try {
      await addDoc(collection(db, 'logs'), {
        ...logEntry,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Firestore logging failed:', error);
    }
  }

  // Get local logs
  getLocalLogs(level = null, category = null) {
    let logs = this.localLogs;
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    if (category) {
      logs = logs.filter(log => log.category === category);
    }
    
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Clear local logs
  clearLocalLogs() {
    this.localLogs = [];
  }

  // Export logs as JSON
  exportLogs() {
    return JSON.stringify(this.localLogs, null, 2);
  }
}

// Create global logger instance
export const logger = new Logger();
