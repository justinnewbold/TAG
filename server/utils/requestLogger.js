/**
 * Request logging middleware
 * Logs all HTTP requests with timing, status, and user info
 */

import { logger } from './logger.js';

/**
 * Express middleware for request logging
 * Logs method, path, status, duration, and user ID
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);

  // Attach request ID for tracing
  req.requestId = requestId;

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')?.substring(0, 50),
    };

    // Add user ID if authenticated
    if (req.user?.id) {
      logData.userId = req.user.id;
    }

    // Add query params for GET requests (sanitized)
    if (req.method === 'GET' && Object.keys(req.query).length > 0) {
      logData.query = Object.keys(req.query).join(',');
    }

    // Choose log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else if (duration > 1000) {
      logger.warn('Slow request', logData);
    } else {
      logger.info('Request', logData);
    }
  });

  next();
}

/**
 * Skip logging for specific paths (health checks, static assets)
 */
export function requestLoggerWithSkip(skipPaths = ['/health', '/api/health']) {
  return (req, res, next) => {
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    return requestLogger(req, res, next);
  };
}

export default requestLogger;
