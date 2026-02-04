/**
 * Shared Service Utilities
 * Provides standardized error handling, caching, validation, and loading state management
 */

// Error types for better error handling
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * Custom error class for service errors
 */
export class ServiceError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, details = null) {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
    this.details = details;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Wrap API calls with standardized error handling
 * @param {Function} apiCall - The API call to wrap
 * @param {Object} options - Options for error handling
 * @returns {Promise<{data: any, error: ServiceError|null}>}
 */
export async function withErrorHandling(apiCall, options = {}) {
  const {
    errorMessage = 'An error occurred',
    retries = 0,
    retryDelay = 1000,
    onRetry = null,
  } = options;

  let lastError = null;
  let attempts = 0;

  while (attempts <= retries) {
    try {
      const data = await apiCall();
      return { data, error: null };
    } catch (error) {
      lastError = normalizeError(error, errorMessage);
      attempts++;

      if (attempts <= retries) {
        if (onRetry) onRetry(attempts, lastError);
        await delay(retryDelay * attempts); // Exponential backoff
      }
    }
  }

  return { data: null, error: lastError };
}

/**
 * Normalize errors to ServiceError format
 */
function normalizeError(error, defaultMessage) {
  if (error instanceof ServiceError) {
    return error;
  }

  const message = error?.message || defaultMessage;

  // Detect error type from message or status
  if (message.includes('Unable to connect') || message.includes('network')) {
    return new ServiceError(message, ErrorTypes.NETWORK);
  }
  if (message.includes('Session expired') || message.includes('Unauthorized')) {
    return new ServiceError(message, ErrorTypes.AUTH);
  }
  if (message.includes('not found') || message.includes('404')) {
    return new ServiceError(message, ErrorTypes.NOT_FOUND);
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return new ServiceError(message, ErrorTypes.RATE_LIMIT);
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return new ServiceError(message, ErrorTypes.VALIDATION);
  }

  return new ServiceError(message, ErrorTypes.UNKNOWN, { originalError: error });
}

/**
 * Simple delay utility
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simple in-memory cache with TTL
 */
export class SimpleCache {
  constructor(defaultTTL = 60000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Create a cached API call
 * @param {Function} apiCall - The API call function
 * @param {string} cacheKey - Key for the cache
 * @param {SimpleCache} cache - Cache instance
 * @param {number} ttl - Time to live in ms
 */
export async function withCache(apiCall, cacheKey, cache, ttl = 60000) {
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return { data: cached, error: null, fromCache: true };
  }

  const result = await withErrorHandling(apiCall);
  if (result.data) {
    cache.set(cacheKey, result.data, ttl);
  }

  return { ...result, fromCache: false };
}

/**
 * Validate input before API call
 * @param {Object} data - Data to validate
 * @param {Object} rules - Validation rules { field: validator }
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateInput(data, rules) {
  const errors = {};
  let valid = true;

  for (const [field, validator] of Object.entries(rules)) {
    const value = data[field];
    const result = validator(value);
    if (!result.valid) {
      valid = false;
      errors[field] = result.error || result.errors;
    }
  }

  return { valid, errors };
}

/**
 * Common validators
 */
export const validators = {
  required: (value) => ({
    valid: value !== null && value !== undefined && value !== '',
    error: 'This field is required',
  }),

  minLength: (min) => (value) => ({
    valid: typeof value === 'string' && value.length >= min,
    error: `Must be at least ${min} characters`,
  }),

  maxLength: (max) => (value) => ({
    valid: typeof value === 'string' && value.length <= max,
    error: `Must be no more than ${max} characters`,
  }),

  positiveNumber: (value) => ({
    valid: typeof value === 'number' && value > 0,
    error: 'Must be a positive number',
  }),

  inRange: (min, max) => (value) => ({
    valid: typeof value === 'number' && value >= min && value <= max,
    error: `Must be between ${min} and ${max}`,
  }),

  isString: (value) => ({
    valid: typeof value === 'string',
    error: 'Must be a string',
  }),

  isArray: (value) => ({
    valid: Array.isArray(value),
    error: 'Must be an array',
  }),

  combine: (...validators) => (value) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) return result;
    }
    return { valid: true };
  },
};

/**
 * Loading state manager for components
 */
export function createLoadingState() {
  return {
    isLoading: false,
    error: null,
    lastUpdated: null,
  };
}

/**
 * Debounce function for rate limiting
 */
export function debounce(fn, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle(fn, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default {
  ErrorTypes,
  ServiceError,
  withErrorHandling,
  withCache,
  SimpleCache,
  validateInput,
  validators,
  createLoadingState,
  debounce,
  throttle,
};
