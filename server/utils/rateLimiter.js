/**
 * Server-side Rate Limiting Utility
 * Phase 1: Implements rate limiting for game creation (5 per hour per user)
 */

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map();

// Rate limit configurations
export const RateLimitConfigs = {
  GAME_CREATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Too many games created. Please wait before creating another game.',
  },
  TAG_ATTEMPT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many tag attempts. Please slow down.',
  },
  LOCATION_UPDATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    message: 'Too many location updates.',
  },
  CHAT_MESSAGE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Too many messages. Please wait.',
  },
  FRIEND_REQUEST: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Too many friend requests. Please wait.',
  },
  REPORT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many reports. Please wait.',
  },
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests. Please slow down.',
  },
  AUTH_ATTEMPT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts. Please wait.',
  },
};

/**
 * Rate limiter class
 */
class RateLimiter {
  constructor() {
    this.store = rateLimitStore;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate a unique key for rate limiting
   */
  getKey(userId, actionType) {
    return `${userId}:${actionType}`;
  }

  /**
   * Check if request is within rate limit
   * @param {string} userId - User ID
   * @param {string} actionType - Action type (e.g., 'GAME_CREATION')
   * @param {Object} customConfig - Optional custom config to override defaults
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number, error?: string }
   */
  check(userId, actionType, customConfig = null) {
    const config = customConfig || RateLimitConfigs[actionType] || RateLimitConfigs.API_GENERAL;
    const key = this.getKey(userId, actionType);
    const now = Date.now();

    let entry = this.store.get(key);

    // Initialize or reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        error: config.message,
      };
    }

    // Increment and save
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a user/action
   */
  reset(userId, actionType) {
    const key = this.getKey(userId, actionType);
    this.store.delete(key);
  }

  /**
   * Get current status for a user/action
   */
  getStatus(userId, actionType) {
    const config = RateLimitConfigs[actionType] || RateLimitConfigs.API_GENERAL;
    const key = this.getKey(userId, actionType);
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return {
        count: 0,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetTime + 60000) { // Add 1 minute buffer
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(actionType, customConfig = null) {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const result = rateLimiter.check(userId, actionType, customConfig);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit',
      (customConfig || RateLimitConfigs[actionType] || RateLimitConfigs.API_GENERAL).maxRequests
    );
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: result.error,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

/**
 * Check rate limit and throw error if exceeded (for non-middleware use)
 */
export function checkRateLimit(userId, actionType) {
  const result = rateLimiter.check(userId, actionType);
  if (!result.allowed) {
    const error = new Error(result.error);
    error.code = 'RATE_LIMIT_EXCEEDED';
    error.retryAfter = result.retryAfter;
    throw error;
  }
  return result;
}

export default rateLimiter;
