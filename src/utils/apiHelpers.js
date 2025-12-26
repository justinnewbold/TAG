/**
 * API Helper utilities for better error handling and retries
 */

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    if (!error.status) return true; // Network error
    return error.status >= 500 && error.status < 600;
  },
};

/**
 * Exponential backoff delay calculator
 */
function getRetryDelay(attempt, baseDelay, maxDelay) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Wrap an async function with retry logic
 */
export async function withRetry(fn, config = {}) {
  const { maxRetries, baseDelay, maxDelay, retryCondition } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      const delay = getRetryDelay(attempt, baseDelay, maxDelay);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Parse API error responses into user-friendly messages
 */
export function parseApiError(error) {
  // Network errors
  if (error.message === 'Failed to fetch' || error.message === 'Network request failed') {
    return {
      message: 'Unable to connect. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      recoverable: true,
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      message: 'Server is temporarily unavailable. Please try again.',
      code: 'SERVER_ERROR',
      recoverable: true,
    };
  }

  // Auth errors
  if (error.status === 401) {
    return {
      message: 'Your session has expired. Please sign in again.',
      code: 'AUTH_ERROR',
      recoverable: false,
    };
  }

  if (error.status === 403) {
    return {
      message: 'You don\'t have permission to do this.',
      code: 'FORBIDDEN',
      recoverable: false,
    };
  }

  // Validation errors
  if (error.status === 400) {
    return {
      message: error.message || 'Invalid request. Please check your input.',
      code: 'VALIDATION_ERROR',
      recoverable: false,
    };
  }

  // Not found
  if (error.status === 404) {
    return {
      message: error.message || 'The requested resource was not found.',
      code: 'NOT_FOUND',
      recoverable: false,
    };
  }

  // Rate limiting
  if (error.status === 429) {
    return {
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
      recoverable: true,
    };
  }

  // Default
  return {
    message: error.message || 'Something went wrong. Please try again.',
    code: 'UNKNOWN_ERROR',
    recoverable: true,
  };
}

/**
 * Create a cancelable request
 */
export function createCancelableRequest(requestFn) {
  const controller = new AbortController();

  const promise = requestFn(controller.signal);

  return {
    promise,
    cancel: () => controller.abort(),
  };
}

/**
 * Debounce function for search/input handlers
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function for frequent updates like location
 */
export function throttle(fn, limit = 1000) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error) {
  const parsed = parseApiError(error);
  return {
    title: getErrorTitle(parsed.code),
    message: parsed.message,
    showRetry: parsed.recoverable,
  };
}

function getErrorTitle(code) {
  const titles = {
    NETWORK_ERROR: 'Connection Problem',
    SERVER_ERROR: 'Server Error',
    AUTH_ERROR: 'Session Expired',
    FORBIDDEN: 'Access Denied',
    VALIDATION_ERROR: 'Invalid Input',
    NOT_FOUND: 'Not Found',
    RATE_LIMITED: 'Slow Down',
    UNKNOWN_ERROR: 'Error',
  };
  return titles[code] || 'Error';
}

export default {
  withRetry,
  parseApiError,
  createCancelableRequest,
  debounce,
  throttle,
  formatErrorForDisplay,
};
