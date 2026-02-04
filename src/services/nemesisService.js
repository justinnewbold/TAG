import { api } from './api';
import {
  withErrorHandling,
  withCache,
  SimpleCache,
  ServiceError,
  ErrorTypes,
} from '../utils/serviceUtils';

// Cache for nemesis data (2 minute TTL)
const nemesisCache = new SimpleCache(120000);

// Event listeners for nemesis updates
let nemesisListeners = [];

// Rivalry intensity levels
export const RivalryIntensity = {
  MILD: 'mild',           // 3-5 encounters
  MODERATE: 'moderate',   // 6-10 encounters
  INTENSE: 'intense',     // 11-20 encounters
  LEGENDARY: 'legendary', // 20+ encounters
};

export const nemesisService = {
  /**
   * Get all rivalries for the current user
   * @param {Object} options - Options { forceRefresh: boolean }
   * @returns {Promise<{data: Array, error: ServiceError|null, fromCache: boolean}>}
   */
  async getRivalries(options = {}) {
    const { forceRefresh = false } = options;

    if (forceRefresh) {
      nemesisCache.delete('rivalries');
    }

    return withCache(
      () => api.request('/nemesis'),
      'rivalries',
      nemesisCache,
      120000
    );
  },

  /**
   * Get detailed info about a specific rivalry
   * @param {string} rivalId - The rival player's ID
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getRivalryDetails(rivalId) {
    if (!rivalId) {
      return {
        data: null,
        error: new ServiceError('Rival ID is required', ErrorTypes.VALIDATION),
      };
    }

    const cacheKey = `rivalry-${rivalId}`;
    return withCache(
      () => api.request(`/nemesis/${rivalId}`),
      cacheKey,
      nemesisCache,
      60000 // 1 minute cache for individual rivalry
    );
  },

  /**
   * Record a new encounter between two players
   * @param {string} taggerId - ID of the player who tagged
   * @param {string} taggedId - ID of the player who was tagged
   * @param {Object} context - Additional context { gameId, location, tagTime }
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async recordEncounter(taggerId, taggedId, context = {}) {
    if (!taggerId || !taggedId) {
      return {
        data: null,
        error: new ServiceError(
          'Both tagger and tagged IDs are required',
          ErrorTypes.VALIDATION
        ),
      };
    }

    if (taggerId === taggedId) {
      return {
        data: null,
        error: new ServiceError(
          'Cannot record encounter with yourself',
          ErrorTypes.VALIDATION
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/nemesis/encounter', {
          method: 'POST',
          body: JSON.stringify({
            taggerId,
            taggedId,
            gameId: context.gameId,
            location: context.location,
            tagTime: context.tagTime,
            timestamp: Date.now(),
          }),
        }),
      { errorMessage: 'Failed to record encounter' }
    );

    // Invalidate cache and notify listeners on success
    if (result.data) {
      nemesisCache.delete('rivalries');
      nemesisCache.delete(`rivalry-${taggerId}`);
      nemesisCache.delete(`rivalry-${taggedId}`);

      this.notifyListeners({
        type: 'encounter_recorded',
        encounter: result.data,
        isNewRivalry: result.data.isNewRivalry,
        intensityChange: result.data.intensityChange,
      });
    }

    return result;
  },

  /**
   * Get the top nemesis (most encounters)
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getTopNemesis() {
    return withCache(
      () => api.request('/nemesis/top'),
      'top-nemesis',
      nemesisCache,
      60000
    );
  },

  /**
   * Get nemesis leaderboard (players with most rivalries)
   * @param {Object} options - Options { limit: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getNemesisLeaderboard(options = {}) {
    const { limit = 20 } = options;

    return withCache(
      () => api.request(`/nemesis/leaderboard?limit=${limit}`),
      `nemesis-leaderboard-${limit}`,
      nemesisCache,
      300000 // 5 minute cache for leaderboard
    );
  },

  /**
   * Get encounter history with a specific player
   * @param {string} rivalId - The rival player's ID
   * @param {Object} options - Options { limit: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getEncounterHistory(rivalId, options = {}) {
    if (!rivalId) {
      return {
        data: null,
        error: new ServiceError('Rival ID is required', ErrorTypes.VALIDATION),
      };
    }

    const { limit = 20 } = options;

    return withErrorHandling(
      () => api.request(`/nemesis/${rivalId}/history?limit=${limit}`),
      { errorMessage: 'Failed to fetch encounter history' }
    );
  },

  /**
   * Get nemesis statistics for current user
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getNemesisStats() {
    return withCache(
      () => api.request('/nemesis/stats'),
      'nemesis-stats',
      nemesisCache,
      120000
    );
  },

  /**
   * Calculate rivalry intensity based on encounter count
   * @param {number} encounters - Number of encounters
   * @returns {string} Rivalry intensity level
   */
  calculateIntensity(encounters) {
    if (encounters >= 20) return RivalryIntensity.LEGENDARY;
    if (encounters >= 11) return RivalryIntensity.INTENSE;
    if (encounters >= 6) return RivalryIntensity.MODERATE;
    return RivalryIntensity.MILD;
  },

  /**
   * Subscribe to nemesis events
   * @param {Function} callback - Callback for nemesis events
   * @returns {Function} Unsubscribe function
   */
  onNemesisEvent(callback) {
    nemesisListeners.push(callback);
    return () => {
      nemesisListeners = nemesisListeners.filter((cb) => cb !== callback);
    };
  },

  /**
   * Notify all listeners of a nemesis event
   * @param {Object} event - Event data
   */
  notifyListeners(event) {
    nemesisListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Nemesis listener error:', e);
        }
      }
    });
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    nemesisCache.clear();
  },
};
