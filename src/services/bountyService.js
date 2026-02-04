import { api } from './api';
import {
  withErrorHandling,
  withCache,
  SimpleCache,
  validateInput,
  validators,
  ServiceError,
  ErrorTypes,
} from '../utils/serviceUtils';

// Cache for bounty data (30 second TTL for active bounties)
const bountyCache = new SimpleCache(30000);

// Event listeners for real-time updates
let bountyListeners = [];

export const bountyService = {
  /**
   * Get all active bounties
   * @param {Object} options - Options { forceRefresh: boolean }
   * @returns {Promise<{data: Array, error: ServiceError|null, fromCache: boolean}>}
   */
  async getActiveBounties(options = {}) {
    const { forceRefresh = false } = options;

    if (forceRefresh) {
      bountyCache.delete('active-bounties');
    }

    return withCache(
      () => api.request('/bounties'),
      'active-bounties',
      bountyCache,
      30000
    );
  },

  /**
   * Get bounties targeting a specific user
   * @param {string} userId - Target user ID
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getTargetBounties(userId) {
    if (!userId) {
      return {
        data: null,
        error: new ServiceError('User ID is required', ErrorTypes.VALIDATION),
      };
    }

    return withErrorHandling(
      () => api.request(`/bounties/target/${userId}`),
      { errorMessage: 'Failed to fetch target bounties' }
    );
  },

  /**
   * Place a bounty on a player
   * @param {string} targetId - Target player ID
   * @param {number} amount - Bounty amount
   * @param {string} reason - Reason for the bounty (optional)
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async placeBounty(targetId, amount, reason = '') {
    // Validate input
    const validation = validateInput(
      { targetId, amount, reason },
      {
        targetId: validators.required,
        amount: validators.combine(
          validators.required,
          validators.positiveNumber,
          validators.inRange(10, 10000)
        ),
        reason: validators.maxLength(200),
      }
    );

    if (!validation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid bounty parameters',
          ErrorTypes.VALIDATION,
          validation.errors
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/bounties', {
          method: 'POST',
          body: JSON.stringify({ targetId, amount, reason: reason.trim() }),
        }),
      { errorMessage: 'Failed to place bounty' }
    );

    // Invalidate cache on success
    if (result.data) {
      bountyCache.delete('active-bounties');
      this.notifyListeners({ type: 'bounty_placed', bounty: result.data });
    }

    return result;
  },

  /**
   * Claim a bounty after tagging the target
   * @param {string} bountyId - Bounty ID to claim
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async claimBounty(bountyId) {
    if (!bountyId) {
      return {
        data: null,
        error: new ServiceError('Bounty ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () => api.request(`/bounties/claim/${bountyId}`, { method: 'POST' }),
      { errorMessage: 'Failed to claim bounty' }
    );

    // Invalidate cache and notify on success
    if (result.data) {
      bountyCache.delete('active-bounties');
      this.notifyListeners({ type: 'bounty_claimed', bountyId, reward: result.data });
    }

    return result;
  },

  /**
   * Cancel a bounty you placed
   * @param {string} bountyId - Bounty ID to cancel
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async cancelBounty(bountyId) {
    if (!bountyId) {
      return {
        data: null,
        error: new ServiceError('Bounty ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () => api.request(`/bounties/${bountyId}`, { method: 'DELETE' }),
      { errorMessage: 'Failed to cancel bounty' }
    );

    // Invalidate cache on success
    if (result.data) {
      bountyCache.delete('active-bounties');
      this.notifyListeners({ type: 'bounty_cancelled', bountyId });
    }

    return result;
  },

  /**
   * Get bounty hunter leaderboard
   * @param {Object} options - Options { limit: number, forceRefresh: boolean }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getLeaderboard(options = {}) {
    const { limit = 50, forceRefresh = false } = options;
    const cacheKey = `bounty-leaderboard-${limit}`;

    if (forceRefresh) {
      bountyCache.delete(cacheKey);
    }

    return withCache(
      () => api.request(`/bounties/leaderboard?limit=${limit}`),
      cacheKey,
      bountyCache,
      60000 // 1 minute cache for leaderboard
    );
  },

  /**
   * Get bounty statistics for current user
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getMyBountyStats() {
    return withErrorHandling(
      () => api.request('/bounties/stats'),
      { errorMessage: 'Failed to fetch bounty stats' }
    );
  },

  /**
   * Subscribe to bounty events
   * @param {Function} callback - Callback for bounty events
   * @returns {Function} Unsubscribe function
   */
  onBountyEvent(callback) {
    bountyListeners.push(callback);
    return () => {
      bountyListeners = bountyListeners.filter((cb) => cb !== callback);
    };
  },

  /**
   * Notify all listeners of a bounty event
   * @param {Object} event - Event data
   */
  notifyListeners(event) {
    bountyListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        // Prevent listener errors from breaking other listeners
        if (import.meta.env.DEV) {
          console.error('Bounty listener error:', e);
        }
      }
    });
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    bountyCache.clear();
  },
};
