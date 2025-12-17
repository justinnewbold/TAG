// Simple structured logger with error tracking
// Replace with Sentry, DataDog, or other services in production

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];
const isProduction = process.env.NODE_ENV === 'production';

function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    // JSON format for log aggregation in production
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...context,
    });
  }

  // Human-readable format for development
  const contextStr = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
}

export const logger = {
  error(message, context = {}) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatLog('error', message, context));

      // Track error metrics (can be expanded)
      this._trackError(message, context);
    }
  },

  warn(message, context = {}) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, context));
    }
  },

  info(message, context = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatLog('info', message, context));
    }
  },

  debug(message, context = {}) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatLog('debug', message, context));
    }
  },

  // Track errors for potential alerting
  _errors: [],
  _errorWindow: 60 * 1000, // 1 minute window
  _maxErrors: 100, // Max errors to track

  _trackError(message, context) {
    const now = Date.now();

    // Clean old errors
    this._errors = this._errors.filter(e => now - e.timestamp < this._errorWindow);

    // Add new error
    if (this._errors.length < this._maxErrors) {
      this._errors.push({
        timestamp: now,
        message,
        context,
      });
    }

    // Alert if error rate is high
    if (this._errors.length >= 10) {
      console.error(formatLog('error', 'HIGH ERROR RATE DETECTED', {
        errorCount: this._errors.length,
        windowMs: this._errorWindow,
      }));
    }
  },

  // Get error stats for health check
  getErrorStats() {
    const now = Date.now();
    this._errors = this._errors.filter(e => now - e.timestamp < this._errorWindow);
    return {
      recentErrors: this._errors.length,
      windowMs: this._errorWindow,
    };
  },

  // Request context helper
  withRequest(req) {
    return {
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
    };
  },

  // Socket context helper
  withSocket(socket) {
    return {
      userId: socket.user?.id,
      socketId: socket.id,
    };
  },
};

// Capture unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  // Give time for log to flush before exit
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || String(reason),
    stack: reason?.stack,
  });
});

export default logger;
