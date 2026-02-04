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
import { validateGPSCoordinates } from '../utils/validation';

// Cache for turf war data (30 second TTL for zones, longer for stats)
const turfWarCache = new SimpleCache(30000);

// Event listeners for zone updates
let zoneListeners = [];

// Zone status types
export const ZoneStatus = {
  NEUTRAL: 'neutral',
  CONTESTED: 'contested',
  CONTROLLED: 'controlled',
  FORTIFIED: 'fortified',
};

// Zone upgrade types
export const ZoneUpgrades = {
  WALLS: 'walls',           // Increases capture difficulty
  WATCHTOWER: 'watchtower', // Alerts when enemies approach
  BARRACKS: 'barracks',     // Spawns defensive bonuses
  VAULT: 'vault',           // Increases resource generation
};

export const turfWarService = {
  /**
   * Get zones within map bounds
   * @param {Object} bounds - { minLat, maxLat, minLng, maxLng }
   * @param {Object} options - Options { forceRefresh: boolean }
   * @returns {Promise<{data: Array, error: ServiceError|null, fromCache: boolean}>}
   */
  async getZones(bounds, options = {}) {
    const { forceRefresh = false } = options;

    // Validate bounds if provided
    if (bounds) {
      const { minLat, maxLat, minLng, maxLng } = bounds;
      const minValidation = validateGPSCoordinates(minLat, minLng);
      const maxValidation = validateGPSCoordinates(maxLat, maxLng);

      if (!minValidation.valid || !maxValidation.valid) {
        return {
          data: null,
          error: new ServiceError(
            'Invalid map bounds',
            ErrorTypes.VALIDATION,
            { minErrors: minValidation.errors, maxErrors: maxValidation.errors }
          ),
        };
      }
    }

    const params = bounds
      ? `?minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLng=${bounds.minLng}&maxLng=${bounds.maxLng}`
      : '';

    const cacheKey = bounds
      ? `zones-${bounds.minLat}-${bounds.maxLat}-${bounds.minLng}-${bounds.maxLng}`
      : 'zones-all';

    if (forceRefresh) {
      turfWarCache.delete(cacheKey);
    }

    return withCache(
      () => api.request(`/turf-wars/zones${params}`),
      cacheKey,
      turfWarCache,
      30000
    );
  },

  /**
   * Get a specific zone by ID
   * @param {string} zoneId - Zone ID
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getZone(zoneId) {
    if (!zoneId) {
      return {
        data: null,
        error: new ServiceError('Zone ID is required', ErrorTypes.VALIDATION),
      };
    }

    return withCache(
      () => api.request(`/turf-wars/zones/${zoneId}`),
      `zone-${zoneId}`,
      turfWarCache,
      30000
    );
  },

  /**
   * Capture a zone at a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} clanId - Clan ID capturing the zone
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async captureZone(lat, lng, clanId) {
    // Validate coordinates
    const gpsValidation = validateGPSCoordinates(lat, lng);
    if (!gpsValidation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid coordinates',
          ErrorTypes.VALIDATION,
          gpsValidation.errors
        ),
      };
    }

    // Validate clan ID
    if (!clanId) {
      return {
        data: null,
        error: new ServiceError('Clan ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/turf-wars/zones/capture', {
          method: 'POST',
          body: JSON.stringify({ lat, lng, clanId }),
        }),
      { errorMessage: 'Failed to capture zone' }
    );

    // Invalidate caches and notify on success
    if (result.data) {
      turfWarCache.clear(); // Clear all zone caches
      this.notifyListeners({
        type: 'zone_captured',
        zone: result.data.zone,
        clanId,
        rewards: result.data.rewards,
      });
    }

    return result;
  },

  /**
   * Contest a zone (start capture attempt)
   * @param {string} zoneId - Zone ID to contest
   * @param {string} clanId - Clan ID contesting
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async contestZone(zoneId, clanId) {
    if (!zoneId || !clanId) {
      return {
        data: null,
        error: new ServiceError(
          'Zone ID and Clan ID are required',
          ErrorTypes.VALIDATION
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request(`/turf-wars/zones/${zoneId}/contest`, {
          method: 'POST',
          body: JSON.stringify({ clanId }),
        }),
      { errorMessage: 'Failed to contest zone' }
    );

    if (result.data) {
      turfWarCache.delete(`zone-${zoneId}`);
      this.notifyListeners({
        type: 'zone_contested',
        zoneId,
        clanId,
        contestEndTime: result.data.contestEndTime,
      });
    }

    return result;
  },

  /**
   * Upgrade a controlled zone
   * @param {string} zoneId - Zone ID to upgrade
   * @param {string} upgradeType - Type of upgrade
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async upgradeZone(zoneId, upgradeType = null) {
    if (!zoneId) {
      return {
        data: null,
        error: new ServiceError('Zone ID is required', ErrorTypes.VALIDATION),
      };
    }

    if (upgradeType && !Object.values(ZoneUpgrades).includes(upgradeType)) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid upgrade type',
          ErrorTypes.VALIDATION,
          { validTypes: Object.values(ZoneUpgrades) }
        ),
      };
    }

    const body = upgradeType ? { upgradeType } : {};

    const result = await withErrorHandling(
      () =>
        api.request(`/turf-wars/zones/${zoneId}/upgrade`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      { errorMessage: 'Failed to upgrade zone' }
    );

    if (result.data) {
      turfWarCache.delete(`zone-${zoneId}`);
      this.notifyListeners({
        type: 'zone_upgraded',
        zoneId,
        upgrade: result.data.upgrade,
      });
    }

    return result;
  },

  /**
   * Abandon a controlled zone
   * @param {string} zoneId - Zone ID to abandon
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async abandonZone(zoneId) {
    if (!zoneId) {
      return {
        data: null,
        error: new ServiceError('Zone ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () => api.request(`/turf-wars/zones/${zoneId}/abandon`, { method: 'POST' }),
      { errorMessage: 'Failed to abandon zone' }
    );

    if (result.data) {
      turfWarCache.clear();
      this.notifyListeners({
        type: 'zone_abandoned',
        zoneId,
      });
    }

    return result;
  },

  /**
   * Get clan turf war statistics
   * @param {string} clanId - Clan ID
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getClanStats(clanId) {
    if (!clanId) {
      return {
        data: null,
        error: new ServiceError('Clan ID is required', ErrorTypes.VALIDATION),
      };
    }

    return withCache(
      () => api.request(`/turf-wars/stats/${clanId}`),
      `clan-stats-${clanId}`,
      turfWarCache,
      60000 // 1 minute cache for stats
    );
  },

  /**
   * Get turf war leaderboard
   * @param {Object} options - Options { limit: number, timeframe: string }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getLeaderboard(options = {}) {
    const { limit = 20, timeframe = 'all' } = options;
    const cacheKey = `turf-leaderboard-${limit}-${timeframe}`;

    return withCache(
      () => api.request(`/turf-wars/leaderboard?limit=${limit}&timeframe=${timeframe}`),
      cacheKey,
      turfWarCache,
      120000 // 2 minute cache for leaderboard
    );
  },

  /**
   * Get zone activity history
   * @param {string} zoneId - Zone ID
   * @param {Object} options - Options { limit: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getZoneHistory(zoneId, options = {}) {
    if (!zoneId) {
      return {
        data: null,
        error: new ServiceError('Zone ID is required', ErrorTypes.VALIDATION),
      };
    }

    const { limit = 20 } = options;

    return withErrorHandling(
      () => api.request(`/turf-wars/zones/${zoneId}/history?limit=${limit}`),
      { errorMessage: 'Failed to fetch zone history' }
    );
  },

  /**
   * Get nearby zones for current location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in meters
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getNearbyZones(lat, lng, radius = 1000) {
    const gpsValidation = validateGPSCoordinates(lat, lng);
    if (!gpsValidation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid coordinates',
          ErrorTypes.VALIDATION,
          gpsValidation.errors
        ),
      };
    }

    return withErrorHandling(
      () => api.request(`/turf-wars/zones/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
      { errorMessage: 'Failed to fetch nearby zones' }
    );
  },

  /**
   * Subscribe to zone events
   * @param {Function} callback - Callback for zone events
   * @returns {Function} Unsubscribe function
   */
  onZoneEvent(callback) {
    zoneListeners.push(callback);
    return () => {
      zoneListeners = zoneListeners.filter((cb) => cb !== callback);
    };
  },

  /**
   * Notify all listeners of a zone event
   * @param {Object} event - Event data
   */
  notifyListeners(event) {
    zoneListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Turf war listener error:', e);
        }
      }
    });
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    turfWarCache.clear();
  },
};
