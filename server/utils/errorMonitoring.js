/**
 * Error Monitoring and Tracking Service
 * Provides structured error handling, correlation IDs, and alerting
 */

import crypto from 'crypto';
import { logger } from './logger.js';

// Error storage for analysis (in production, this would go to Sentry/DataDog)
const recentErrors = [];
const MAX_STORED_ERRORS = 1000;
const errorCounts = new Map(); // errorType -> count in last hour

// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRatePerMinute: 50,
  sameErrorCount: 10,
  criticalErrorTypes: ['DATABASE_ERROR', 'AUTH_FAILURE', 'PAYMENT_ERROR'],
};

// Alert callbacks
const alertCallbacks = new Set();

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Structured error class with additional metadata
 */
export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'INTERNAL_ERROR';
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational !== false;
    this.context = options.context || {};
    this.correlationId = options.correlationId;
    this.timestamp = Date.now();
    this.stack = options.stack || this.stack;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      correlationId: this.correlationId,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: this.stack,
        context: this.context,
      }),
    };
  }
}

// Pre-defined error types
export const ErrorTypes = {
  // Client errors (4xx)
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', statusCode: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', statusCode: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', statusCode: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', statusCode: 404 },
  CONFLICT: { code: 'CONFLICT', statusCode: 409 },
  RATE_LIMITED: { code: 'RATE_LIMITED', statusCode: 429 },

  // Server errors (5xx)
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', statusCode: 500 },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', statusCode: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', statusCode: 503 },

  // Game-specific errors
  GAME_NOT_FOUND: { code: 'GAME_NOT_FOUND', statusCode: 404 },
  GAME_FULL: { code: 'GAME_FULL', statusCode: 409 },
  GAME_ALREADY_STARTED: { code: 'GAME_ALREADY_STARTED', statusCode: 409 },
  NOT_IN_GAME: { code: 'NOT_IN_GAME', statusCode: 400 },
  INVALID_TAG: { code: 'INVALID_TAG', statusCode: 400 },
  TAG_COOLDOWN: { code: 'TAG_COOLDOWN', statusCode: 429 },
};

/**
 * Create an AppError from a type
 */
export function createError(type, message, context = {}) {
  const errorType = ErrorTypes[type] || ErrorTypes.INTERNAL_ERROR;
  return new AppError(message, {
    ...errorType,
    context,
  });
}

/**
 * Track an error
 */
export function trackError(error, context = {}) {
  const errorRecord = {
    id: generateCorrelationId(),
    timestamp: Date.now(),
    message: error.message,
    code: error.code || 'UNKNOWN',
    stack: error.stack,
    context: {
      ...context,
      ...error.context,
    },
    isOperational: error.isOperational !== false,
  };

  // Store error
  recentErrors.unshift(errorRecord);
  if (recentErrors.length > MAX_STORED_ERRORS) {
    recentErrors.pop();
  }

  // Update error counts
  const countKey = error.code || 'UNKNOWN';
  const currentCount = errorCounts.get(countKey) || 0;
  errorCounts.set(countKey, currentCount + 1);

  // Log the error
  logger.error('Error tracked', {
    correlationId: errorRecord.id,
    code: errorRecord.code,
    message: errorRecord.message,
    context: errorRecord.context,
  });

  // Check if we need to alert
  checkAlertThresholds(errorRecord);

  return errorRecord.id;
}

/**
 * Check if error thresholds are exceeded
 */
function checkAlertThresholds(errorRecord) {
  const code = errorRecord.code;

  // Check for critical error types
  if (ALERT_THRESHOLDS.criticalErrorTypes.includes(code)) {
    triggerAlert('critical_error', {
      code,
      message: errorRecord.message,
      correlationId: errorRecord.id,
    });
  }

  // Check for repeated errors
  const count = errorCounts.get(code) || 0;
  if (count >= ALERT_THRESHOLDS.sameErrorCount) {
    triggerAlert('repeated_error', {
      code,
      count,
      message: `Error "${code}" occurred ${count} times`,
    });
    // Reset count after alert
    errorCounts.set(code, 0);
  }

  // Check error rate
  const recentMinute = recentErrors.filter(e => e.timestamp > Date.now() - 60000);
  if (recentMinute.length >= ALERT_THRESHOLDS.errorRatePerMinute) {
    triggerAlert('high_error_rate', {
      count: recentMinute.length,
      message: `${recentMinute.length} errors in the last minute`,
    });
  }
}

/**
 * Trigger an alert
 */
function triggerAlert(type, data) {
  const alert = {
    type,
    timestamp: Date.now(),
    data,
  };

  logger.warn('ALERT TRIGGERED', alert);

  // Call registered alert callbacks
  for (const callback of alertCallbacks) {
    try {
      callback(alert);
    } catch (e) {
      logger.error('Alert callback failed', { error: e.message });
    }
  }
}

/**
 * Register an alert callback
 */
export function onAlert(callback) {
  alertCallbacks.add(callback);
  return () => alertCallbacks.delete(callback);
}

/**
 * Express error handling middleware
 */
export function errorHandlerMiddleware(err, req, res, next) {
  // Generate correlation ID if not present
  const correlationId = req.correlationId || generateCorrelationId();

  // Convert to AppError if needed
  const appError = err instanceof AppError
    ? err
    : new AppError(err.message || 'Internal server error', {
        code: err.code || 'INTERNAL_ERROR',
        statusCode: err.statusCode || 500,
        isOperational: false,
        context: { originalError: err.name },
        correlationId,
      });

  appError.correlationId = correlationId;

  // Track the error
  trackError(appError, {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Send response
  res.status(appError.statusCode).json(appError.toJSON());
}

/**
 * Correlation ID middleware
 */
export function correlationMiddleware(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
}

/**
 * Async handler wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Get error statistics
 */
export function getErrorStats() {
  const now = Date.now();
  const lastHour = recentErrors.filter(e => e.timestamp > now - 3600000);
  const lastMinute = recentErrors.filter(e => e.timestamp > now - 60000);

  // Group by error code
  const byCode = {};
  for (const error of lastHour) {
    byCode[error.code] = (byCode[error.code] || 0) + 1;
  }

  return {
    totalErrors: recentErrors.length,
    errorsLastHour: lastHour.length,
    errorsLastMinute: lastMinute.length,
    byCode,
    recentErrors: recentErrors.slice(0, 10).map(e => ({
      id: e.id,
      code: e.code,
      message: e.message,
      timestamp: e.timestamp,
    })),
  };
}

/**
 * Clear old error counts (run periodically)
 */
function cleanupErrorCounts() {
  errorCounts.clear();
}

// Cleanup error counts every hour
setInterval(cleanupErrorCounts, 3600000);

export default {
  AppError,
  ErrorTypes,
  createError,
  trackError,
  onAlert,
  errorHandlerMiddleware,
  correlationMiddleware,
  asyncHandler,
  generateCorrelationId,
  getErrorStats,
};
