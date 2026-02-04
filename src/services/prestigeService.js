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

// Cache for prestige data (5 minute TTL)
const prestigeCache = new SimpleCache(300000);

// Event listeners for prestige updates
let prestigeListeners = [];

// Prestige tiers
export const PrestigeTiers = {
  BRONZE: { id: 'bronze', name: 'Bronze', minLevel: 0, color: '#CD7F32' },
  SILVER: { id: 'silver', name: 'Silver', minLevel: 1, color: '#C0C0C0' },
  GOLD: { id: 'gold', name: 'Gold', minLevel: 3, color: '#FFD700' },
  PLATINUM: { id: 'platinum', name: 'Platinum', minLevel: 5, color: '#E5E4E2' },
  DIAMOND: { id: 'diamond', name: 'Diamond', minLevel: 7, color: '#B9F2FF' },
  MASTER: { id: 'master', name: 'Master', minLevel: 10, color: '#FF4500' },
  GRANDMASTER: { id: 'grandmaster', name: 'Grandmaster', minLevel: 15, color: '#9400D3' },
  LEGEND: { id: 'legend', name: 'Legend', minLevel: 20, color: '#FFD700' },
};

// XP requirements per level (exponential curve)
const XP_PER_LEVEL = [
  0, 1000, 2500, 5000, 8500, 13000, 18500, 25000, 32500, 41000, 50000,
];

export const prestigeService = {
  /**
   * Get current user's prestige data
   * @param {Object} options - Options { forceRefresh: boolean }
   * @returns {Promise<{data: Object, error: ServiceError|null, fromCache: boolean}>}
   */
  async getPrestige(options = {}) {
    const { forceRefresh = false } = options;

    if (forceRefresh) {
      prestigeCache.delete('my-prestige');
    }

    return withCache(
      () => api.request('/prestige'),
      'my-prestige',
      prestigeCache,
      300000
    );
  },

  /**
   * Get another player's prestige info
   * @param {string} userId - Player's user ID
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getPlayerPrestige(userId) {
    if (!userId) {
      return {
        data: null,
        error: new ServiceError('User ID is required', ErrorTypes.VALIDATION),
      };
    }

    const cacheKey = `prestige-${userId}`;
    return withCache(
      () => api.request(`/prestige/${userId}`),
      cacheKey,
      prestigeCache,
      120000 // 2 minute cache for other players
    );
  },

  /**
   * Perform a prestige reset (restart at higher tier)
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async performPrestige() {
    const result = await withErrorHandling(
      () => api.request('/prestige/prestige', { method: 'POST' }),
      { errorMessage: 'Failed to prestige' }
    );

    if (result.data) {
      prestigeCache.delete('my-prestige');
      this.notifyListeners({
        type: 'prestige_up',
        newTier: result.data.tier,
        rewards: result.data.rewards,
      });
    }

    return result;
  },

  /**
   * Check if user can prestige
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async canPrestige() {
    return withErrorHandling(
      () => api.request('/prestige/can-prestige'),
      { errorMessage: 'Failed to check prestige eligibility' }
    );
  },

  /**
   * Add XP to the user's prestige progress
   * @param {number} amount - XP amount to add
   * @param {string} source - Source of XP (game, achievement, etc.)
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async addXp(amount, source = 'game') {
    const validation = validateInput(
      { amount },
      {
        amount: validators.combine(
          validators.required,
          validators.positiveNumber,
          validators.inRange(1, 100000)
        ),
      }
    );

    if (!validation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid XP amount',
          ErrorTypes.VALIDATION,
          validation.errors
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/prestige/xp', {
          method: 'POST',
          body: JSON.stringify({ amount, source }),
        }),
      { errorMessage: 'Failed to add XP' }
    );

    if (result.data) {
      prestigeCache.delete('my-prestige');

      // Check for level up
      if (result.data.leveledUp) {
        this.notifyListeners({
          type: 'level_up',
          newLevel: result.data.newLevel,
          rewards: result.data.rewards,
        });
      }
    }

    return result;
  },

  /**
   * Get prestige leaderboard
   * @param {Object} options - Options { limit: number, tier: string }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getLeaderboard(options = {}) {
    const { limit = 50, tier = null } = options;
    const tierParam = tier ? `&tier=${tier}` : '';
    const cacheKey = `prestige-leaderboard-${limit}-${tier || 'all'}`;

    return withCache(
      () => api.request(`/prestige/leaderboard?limit=${limit}${tierParam}`),
      cacheKey,
      prestigeCache,
      60000 // 1 minute cache for leaderboard
    );
  },

  /**
   * Get prestige rewards for a tier
   * @param {string} tierId - Tier ID
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getTierRewards(tierId) {
    if (!tierId || !Object.keys(PrestigeTiers).map(k => k.toLowerCase()).includes(tierId)) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid tier ID',
          ErrorTypes.VALIDATION,
          { validTiers: Object.keys(PrestigeTiers).map(k => k.toLowerCase()) }
        ),
      };
    }

    return withCache(
      () => api.request(`/prestige/rewards/${tierId}`),
      `tier-rewards-${tierId}`,
      prestigeCache,
      3600000 // 1 hour cache for static rewards
    );
  },

  /**
   * Get XP history
   * @param {Object} options - Options { limit: number, days: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getXpHistory(options = {}) {
    const { limit = 50, days = 30 } = options;

    return withErrorHandling(
      () => api.request(`/prestige/history?limit=${limit}&days=${days}`),
      { errorMessage: 'Failed to fetch XP history' }
    );
  },

  /**
   * Calculate XP needed for next level
   * @param {number} currentLevel - Current level
   * @param {number} currentXp - Current XP within level
   * @returns {Object} { xpNeeded, xpForLevel, progress }
   */
  calculateProgress(currentLevel, currentXp) {
    const xpForLevel = XP_PER_LEVEL[Math.min(currentLevel, XP_PER_LEVEL.length - 1)] || 50000;
    const xpNeeded = xpForLevel - currentXp;
    const progress = Math.min(100, (currentXp / xpForLevel) * 100);

    return {
      xpNeeded: Math.max(0, xpNeeded),
      xpForLevel,
      progress,
    };
  },

  /**
   * Get tier for a prestige level
   * @param {number} prestigeLevel - Prestige level
   * @returns {Object} Tier data
   */
  getTierForLevel(prestigeLevel) {
    const tiers = Object.values(PrestigeTiers).reverse();
    for (const tier of tiers) {
      if (prestigeLevel >= tier.minLevel) {
        return tier;
      }
    }
    return PrestigeTiers.BRONZE;
  },

  /**
   * Subscribe to prestige events
   * @param {Function} callback - Callback for prestige events
   * @returns {Function} Unsubscribe function
   */
  onPrestigeEvent(callback) {
    prestigeListeners.push(callback);
    return () => {
      prestigeListeners = prestigeListeners.filter((cb) => cb !== callback);
    };
  },

  /**
   * Notify all listeners of a prestige event
   * @param {Object} event - Event data
   */
  notifyListeners(event) {
    prestigeListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Prestige listener error:', e);
        }
      }
    });
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    prestigeCache.clear();
  },
};
