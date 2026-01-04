/**
 * Cache Service with AsyncStorage-like API
 * Phase 1: Implements caching for user profile data
 */

const CACHE_PREFIX = 'tag_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.storageAvailable = this.checkStorageAvailable();
  }

  /**
   * Check if localStorage is available
   */
  checkStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate cache key
   */
  getKey(key) {
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in ms (default 5 minutes)
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    const cacheKey = this.getKey(key);
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, cacheData);

    // Store in localStorage if available
    if (this.storageAvailable) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (e) {
        // Storage quota exceeded, clear old entries
        this.clearExpired();
      }
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  async get(key) {
    const cacheKey = this.getKey(key);

    // Check memory cache first
    let cacheData = this.memoryCache.get(cacheKey);

    // Fall back to localStorage
    if (!cacheData && this.storageAvailable) {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          cacheData = JSON.parse(stored);
          // Restore to memory cache
          this.memoryCache.set(cacheKey, cacheData);
        }
      } catch (e) {
        // Invalid JSON or access error
        this.remove(key);
        return null;
      }
    }

    if (!cacheData) return null;

    // Check if expired
    const isExpired = Date.now() - cacheData.timestamp > cacheData.ttl;
    if (isExpired) {
      this.remove(key);
      return null;
    }

    return cacheData.value;
  }

  /**
   * Remove a value from cache
   * @param {string} key - Cache key
   */
  async remove(key) {
    const cacheKey = this.getKey(key);
    this.memoryCache.delete(cacheKey);

    if (this.storageAvailable) {
      localStorage.removeItem(cacheKey);
    }
  }

  /**
   * Check if a key exists and is valid
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  async has(key) {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Clear all cached data
   */
  async clear() {
    this.memoryCache.clear();

    if (this.storageAvailable) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired() {
    const now = Date.now();

    // Clear from memory cache
    for (const [key, data] of this.memoryCache) {
      if (now - data.timestamp > data.ttl) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from localStorage
    if (this.storageAvailable) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
      keys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (now - data.timestamp > data.ttl) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Get or set pattern - returns cached value or fetches and caches new value
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch value if not cached
   * @param {number} ttl - Time to live
   */
  async getOrSet(key, fetchFn, ttl = DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {RegExp|string} pattern - Pattern to match
   */
  async invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Clear from memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from localStorage
    if (this.storageAvailable) {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX) && regex.test(k))
        .forEach(k => localStorage.removeItem(k));
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache keys for common data
export const CacheKeys = {
  USER_PROFILE: (userId) => `user_profile_${userId}`,
  USER_STATS: (userId) => `user_stats_${userId}`,
  USER_ACHIEVEMENTS: (userId) => `user_achievements_${userId}`,
  GAME_LIST: 'game_list',
  FRIENDS_LIST: (userId) => `friends_${userId}`,
  LEADERBOARD: (type, period) => `leaderboard_${type}_${period}`,
  SETTINGS: (userId) => `settings_${userId}`,
  CHALLENGES: 'daily_challenges',
  NOTIFICATIONS: (userId) => `notifications_${userId}`,
};

// TTL constants
export const CacheTTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

export default cacheService;
