/**
 * Centralized error handling utilities
 * Provides consistent error responses and error classes
 */

import { logger } from './logger.js';

// Custom error classes for different error types
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Express error handling middleware
 * Should be the last middleware in the chain
 */
export const errorMiddleware = (err, req, res, next) => {
  // Log the error
  logger.error('Request error', {
    ...logger.withRequest(req),
    error: err.message,
    code: err.code,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build error response
  const response = {
    error: {
      message: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      code: err.code || 'INTERNAL_ERROR',
    }
  };

  // Add field info for validation errors
  if (err.field) {
    response.error.field = err.field;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 for unmatched routes
 */
export const notFoundMiddleware = (req, res, next) => {
  next(new NotFoundError('Endpoint'));
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  asyncHandler,
  errorMiddleware,
  notFoundMiddleware,
};
