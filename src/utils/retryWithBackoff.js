/**
 * Retry Logic with Exponential Backoff
 * Phase 1: Implements retry logic for all API/database calls
 */

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true;
    if (error.status >= 500) return true;
    if (error.message?.includes('network')) return true;
    if (error.message?.includes('timeout')) return true;
    if (error.code === 'ECONNRESET') return true;
    if (error.code === 'ETIMEDOUT') return true;
    return false;
  },
  onRetry: null, // Callback for retry attempts
};

/**
 * Execute a function with retry and exponential backoff
 * @param {Function} fn - Async function to execute
 * @param {Object} config - Retry configuration
 * @returns {Promise<any>} - Result of the function
 */
export async function retryWithBackoff(fn, config = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };
  let lastError;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= options.maxRetries || !options.retryCondition(error)) {
        throw error;
      }

      // Call retry callback if provided
      if (options.onRetry) {
        options.onRetry({
          error,
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          nextDelay: delay,
        });
      }

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 * @param {Function} fn - Async function to wrap
 * @param {Object} config - Retry configuration
 * @returns {Function} - Wrapped function with retry logic
 */
export function withRetry(fn, config = {}) {
  return async (...args) => {
    return retryWithBackoff(() => fn(...args), config);
  };
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  // For critical operations that must succeed
  critical: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },

  // For regular API calls
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },

  // For background operations
  background: {
    maxRetries: 10,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
  },

  // For real-time operations (quick failures)
  realtime: {
    maxRetries: 2,
    initialDelay: 200,
    maxDelay: 1000,
    backoffMultiplier: 2,
  },
};

/**
 * Circuit breaker for preventing cascading failures
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'closed'; // 'closed' | 'open' | 'half-open'
  }

  async execute(fn) {
    if (this.state === 'open') {
      // Check if we should try again
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }

  reset() {
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'closed';
  }
}

export { CircuitBreaker };
export default retryWithBackoff;
