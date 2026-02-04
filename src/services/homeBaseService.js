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

// Cache for home base data (5 minute TTL)
const homeBaseCache = new SimpleCache(300000);

// Upgrade types
export const UpgradeTypes = {
  DEFENSE: 'defense',
  STORAGE: 'storage',
  RADAR: 'radar',
  WORKSHOP: 'workshop',
  TRAINING: 'training',
};

// Base status
export const BaseStatus = {
  ACTIVE: 'active',
  UNDER_ATTACK: 'under_attack',
  DAMAGED: 'damaged',
  UPGRADING: 'upgrading',
};

export const homeBaseService = {
  /**
   * Get the current user's home base
   * @param {Object} options - Options { forceRefresh: boolean }
   * @returns {Promise<{data: Object, error: ServiceError|null, fromCache: boolean}>}
   */
  async getMyBase(options = {}) {
    const { forceRefresh = false } = options;

    if (forceRefresh) {
      homeBaseCache.delete('my-base');
    }

    return withCache(
      () => api.request('/home-bases'),
      'my-base',
      homeBaseCache,
      300000 // 5 minute cache
    );
  },

  /**
   * Get another player's home base (public info only)
   * @param {string} userId - Player's user ID
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getPlayerBase(userId) {
    if (!userId) {
      return {
        data: null,
        error: new ServiceError('User ID is required', ErrorTypes.VALIDATION),
      };
    }

    const cacheKey = `base-${userId}`;
    return withCache(
      () => api.request(`/home-bases/${userId}`),
      cacheKey,
      homeBaseCache,
      120000 // 2 minute cache for other players' bases
    );
  },

  /**
   * Claim a location as your home base
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} name - Base name
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async claimBase(lat, lng, name) {
    // Validate GPS coordinates
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

    // Validate name
    const nameValidation = validateInput(
      { name },
      {
        name: validators.combine(
          validators.required,
          validators.minLength(2),
          validators.maxLength(30)
        ),
      }
    );

    if (!nameValidation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid base name',
          ErrorTypes.VALIDATION,
          nameValidation.errors
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/home-bases/claim', {
          method: 'POST',
          body: JSON.stringify({ lat, lng, name: name.trim() }),
        }),
      { errorMessage: 'Failed to claim home base' }
    );

    // Invalidate cache on success
    if (result.data) {
      homeBaseCache.delete('my-base');
    }

    return result;
  },

  /**
   * Relocate your home base
   * @param {number} lat - New latitude
   * @param {number} lng - New longitude
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async relocateBase(lat, lng) {
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

    const result = await withErrorHandling(
      () =>
        api.request('/home-bases/relocate', {
          method: 'POST',
          body: JSON.stringify({ lat, lng }),
        }),
      { errorMessage: 'Failed to relocate home base' }
    );

    if (result.data) {
      homeBaseCache.delete('my-base');
    }

    return result;
  },

  /**
   * Rename your home base
   * @param {string} name - New base name
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async renameBase(name) {
    const validation = validateInput(
      { name },
      {
        name: validators.combine(
          validators.required,
          validators.minLength(2),
          validators.maxLength(30)
        ),
      }
    );

    if (!validation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid base name',
          ErrorTypes.VALIDATION,
          validation.errors
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/home-bases/rename', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim() }),
        }),
      { errorMessage: 'Failed to rename home base' }
    );

    if (result.data) {
      homeBaseCache.delete('my-base');
    }

    return result;
  },

  /**
   * Upgrade your home base
   * @param {string} upgradeId - Type of upgrade
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async upgradeBase(upgradeId) {
    if (!upgradeId) {
      return {
        data: null,
        error: new ServiceError('Upgrade ID is required', ErrorTypes.VALIDATION),
      };
    }

    if (!Object.values(UpgradeTypes).includes(upgradeId)) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid upgrade type',
          ErrorTypes.VALIDATION,
          { validTypes: Object.values(UpgradeTypes) }
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request('/home-bases/upgrade', {
          method: 'POST',
          body: JSON.stringify({ upgradeId }),
        }),
      { errorMessage: 'Failed to upgrade home base' }
    );

    if (result.data) {
      homeBaseCache.delete('my-base');
    }

    return result;
  },

  /**
   * Get available upgrades for your base
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getAvailableUpgrades() {
    return withCache(
      () => api.request('/home-bases/upgrades'),
      'available-upgrades',
      homeBaseCache,
      300000
    );
  },

  /**
   * Repair damaged base
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async repairBase() {
    const result = await withErrorHandling(
      () => api.request('/home-bases/repair', { method: 'POST' }),
      { errorMessage: 'Failed to repair home base' }
    );

    if (result.data) {
      homeBaseCache.delete('my-base');
    }

    return result;
  },

  /**
   * Get nearby bases
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radius - Search radius in meters
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getNearbyBases(lat, lng, radius = 5000) {
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
      () => api.request(`/home-bases/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
      { errorMessage: 'Failed to fetch nearby bases' }
    );
  },

  /**
   * Get base visit history
   * @param {Object} options - Options { limit: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getVisitHistory(options = {}) {
    const { limit = 20 } = options;

    return withErrorHandling(
      () => api.request(`/home-bases/visits?limit=${limit}`),
      { errorMessage: 'Failed to fetch visit history' }
    );
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    homeBaseCache.clear();
  },
};
