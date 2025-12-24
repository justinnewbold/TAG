/**
 * Centralized Error Logging Service
 * Provides consistent error handling and optional remote logging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Set to WARN in production, DEBUG in development
const CURRENT_LOG_LEVEL = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

// Store recent errors for debugging (circular buffer)
const MAX_STORED_ERRORS = 50;
let errorBuffer = [];

class ErrorLogger {
  constructor() {
    this._setupGlobalErrorHandlers();
  }

  /**
   * Set up global error handlers for uncaught errors
   */
  _setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Handle uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.error('Uncaught error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack,
      });
      return false; // Let the default handler run too
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason?.message || event.reason,
        stack: event.reason?.stack,
      });
    };
  }

  /**
   * Format log message with timestamp
   */
  _formatMessage(level, message, context) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return { prefix, message, context };
  }

  /**
   * Store error in buffer for later retrieval
   */
  _storeError(level, message, context) {
    const entry = {
      level,
      message,
      context,
      timestamp: Date.now(),
    };

    errorBuffer.push(entry);
    if (errorBuffer.length > MAX_STORED_ERRORS) {
      errorBuffer.shift();
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message, context = {}) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.DEBUG) return;

    const { prefix } = this._formatMessage('DEBUG', message, context);
    console.debug(`${prefix} ${message}`, context);
  }

  /**
   * Log info message
   */
  info(message, context = {}) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.INFO) return;

    const { prefix } = this._formatMessage('INFO', message, context);
    console.info(`${prefix} ${message}`, context);
  }

  /**
   * Log warning message
   */
  warn(message, context = {}) {
    if (CURRENT_LOG_LEVEL > LOG_LEVELS.WARN) return;

    const { prefix } = this._formatMessage('WARN', message, context);
    console.warn(`${prefix} ${message}`, context);
    this._storeError('WARN', message, context);
  }

  /**
   * Log error message
   */
  error(message, context = {}) {
    const { prefix } = this._formatMessage('ERROR', message, context);
    console.error(`${prefix} ${message}`, context);
    this._storeError('ERROR', message, context);

    // In production, this could send to a remote logging service
    if (!import.meta.env.DEV && import.meta.env.VITE_ERROR_ENDPOINT) {
      this._sendToRemote({ level: 'ERROR', message, context });
    }
  }

  /**
   * Capture an exception with full stack trace
   */
  captureException(error, additionalContext = {}) {
    this.error(error.message || 'Unknown error', {
      name: error.name,
      stack: error.stack,
      ...additionalContext,
    });
  }

  /**
   * Send error to remote logging service (optional)
   */
  async _sendToRemote(data) {
    try {
      const endpoint = import.meta.env.VITE_ERROR_ENDPOINT;
      if (!endpoint) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      // Silently fail - don't cause more errors
      console.debug('Failed to send error to remote', e);
    }
  }

  /**
   * Get recent errors from buffer
   */
  getRecentErrors(count = 10) {
    return errorBuffer.slice(-count);
  }

  /**
   * Clear error buffer
   */
  clearErrors() {
    errorBuffer = [];
  }

  /**
   * Create a scoped logger with a prefix
   */
  scope(prefix) {
    return {
      debug: (msg, ctx) => this.debug(`[${prefix}] ${msg}`, ctx),
      info: (msg, ctx) => this.info(`[${prefix}] ${msg}`, ctx),
      warn: (msg, ctx) => this.warn(`[${prefix}] ${msg}`, ctx),
      error: (msg, ctx) => this.error(`[${prefix}] ${msg}`, ctx),
      captureException: (err, ctx) => this.captureException(err, { scope: prefix, ...ctx }),
    };
  }
}

export const logger = new ErrorLogger();

// Create scoped loggers for different parts of the app
export const apiLogger = logger.scope('API');
export const socketLogger = logger.scope('Socket');
export const gameLogger = logger.scope('Game');
export const locationLogger = logger.scope('Location');
