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

// Cache for contract data (1 minute TTL)
const contractCache = new SimpleCache(60000);

// Contract types for validation
export const ContractTypes = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  SPECIAL: 'special',
  SEASONAL: 'seasonal',
};

// Contract difficulty levels
export const ContractDifficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  LEGENDARY: 'legendary',
};

export const contractService = {
  /**
   * Get all available contracts for the user
   * @param {Object} options - Options { type: string, forceRefresh: boolean }
   * @returns {Promise<{data: Array, error: ServiceError|null, fromCache: boolean}>}
   */
  async getContracts(options = {}) {
    const { type = null, forceRefresh = false } = options;
    const cacheKey = type ? `contracts-${type}` : 'contracts-all';

    if (forceRefresh) {
      contractCache.delete(cacheKey);
    }

    const endpoint = type ? `/contracts?type=${type}` : '/contracts';

    return withCache(
      () => api.request(endpoint),
      cacheKey,
      contractCache,
      60000
    );
  },

  /**
   * Get active contracts (in-progress)
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getActiveContracts() {
    return withCache(
      () => api.request('/contracts/active'),
      'contracts-active',
      contractCache,
      30000 // 30 second cache for active contracts
    );
  },

  /**
   * Accept a contract
   * @param {string} contractId - Contract ID to accept
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async acceptContract(contractId) {
    if (!contractId) {
      return {
        data: null,
        error: new ServiceError('Contract ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () => api.request(`/contracts/${contractId}/accept`, { method: 'POST' }),
      { errorMessage: 'Failed to accept contract' }
    );

    // Invalidate caches on success
    if (result.data) {
      contractCache.delete('contracts-all');
      contractCache.delete('contracts-active');
    }

    return result;
  },

  /**
   * Update progress on a contract
   * @param {string} contractId - Contract ID
   * @param {number} progress - Current progress value
   * @param {boolean} completed - Whether the contract is completed
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async updateProgress(contractId, progress, completed = false) {
    // Validate input
    const validation = validateInput(
      { contractId, progress },
      {
        contractId: validators.required,
        progress: validators.combine(
          validators.required,
          (v) => ({ valid: typeof v === 'number' && v >= 0, error: 'Progress must be a non-negative number' })
        ),
      }
    );

    if (!validation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid progress parameters',
          ErrorTypes.VALIDATION,
          validation.errors
        ),
      };
    }

    const result = await withErrorHandling(
      () =>
        api.request(`/contracts/${contractId}/progress`, {
          method: 'POST',
          body: JSON.stringify({ progress, completed }),
        }),
      { errorMessage: 'Failed to update contract progress' }
    );

    // Invalidate active contracts cache on success
    if (result.data) {
      contractCache.delete('contracts-active');
    }

    return result;
  },

  /**
   * Claim rewards for a completed contract
   * @param {string} contractId - Contract ID to claim
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async claimReward(contractId) {
    if (!contractId) {
      return {
        data: null,
        error: new ServiceError('Contract ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () => api.request(`/contracts/${contractId}/claim`, { method: 'POST' }),
      { errorMessage: 'Failed to claim contract reward' }
    );

    // Invalidate caches on success
    if (result.data) {
      contractCache.delete('contracts-all');
      contractCache.delete('contracts-active');
    }

    return result;
  },

  /**
   * Abandon a contract
   * @param {string} contractId - Contract ID to abandon
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async abandonContract(contractId) {
    if (!contractId) {
      return {
        data: null,
        error: new ServiceError('Contract ID is required', ErrorTypes.VALIDATION),
      };
    }

    const result = await withErrorHandling(
      () => api.request(`/contracts/${contractId}/abandon`, { method: 'POST' }),
      { errorMessage: 'Failed to abandon contract' }
    );

    // Invalidate caches on success
    if (result.data) {
      contractCache.delete('contracts-active');
    }

    return result;
  },

  /**
   * Get contract history
   * @param {Object} options - Options { limit: number, offset: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getContractHistory(options = {}) {
    const { limit = 20, offset = 0 } = options;

    return withErrorHandling(
      () => api.request(`/contracts/history?limit=${limit}&offset=${offset}`),
      { errorMessage: 'Failed to fetch contract history' }
    );
  },

  /**
   * Get contract statistics
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async getContractStats() {
    return withCache(
      () => api.request('/contracts/stats'),
      'contract-stats',
      contractCache,
      120000 // 2 minute cache for stats
    );
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    contractCache.clear();
  },
};
