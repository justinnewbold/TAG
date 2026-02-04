import { api } from './api';
import { socketService } from './socket';
import {
  withErrorHandling,
  withCache,
  SimpleCache,
  validateInput,
  validators,
  ServiceError,
  ErrorTypes,
} from '../utils/serviceUtils';

// Cache for kill feed data (15 second TTL for real-time feel)
const killFeedCache = new SimpleCache(15000);

// Event listeners for real-time feed updates
let feedListeners = [];

// Maximum feed items to keep in memory
const MAX_FEED_ITEMS = 100;

// In-memory feed buffer for offline support
let feedBuffer = [];

// Event types
export const FeedEventTypes = {
  TAG: 'tag',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  BOUNTY_CLAIMED: 'bounty_claimed',
  ACHIEVEMENT: 'achievement',
  POWERUP_USED: 'powerup_used',
  ZONE_CAPTURED: 'zone_captured',
  STREAK: 'streak',
};

export const killFeedService = {
  /**
   * Get global kill feed
   * @param {Object} options - Options { limit: number, since: timestamp, forceRefresh: boolean }
   * @returns {Promise<{data: Array, error: ServiceError|null, fromCache: boolean}>}
   */
  async getGlobalFeed(options = {}) {
    const { limit = 25, since = 0, forceRefresh = false } = options;
    const cacheKey = `global-feed-${limit}-${since}`;

    if (forceRefresh) {
      killFeedCache.delete(cacheKey);
    }

    return withCache(
      () => api.request(`/kill-feed?limit=${limit}&since=${since}`),
      cacheKey,
      killFeedCache,
      15000
    );
  },

  /**
   * Get kill feed for a specific game
   * @param {string} gameId - Game ID
   * @param {Object} options - Options { limit: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getGameFeed(gameId, options = {}) {
    if (!gameId) {
      return {
        data: null,
        error: new ServiceError('Game ID is required', ErrorTypes.VALIDATION),
      };
    }

    const { limit = 25 } = options;
    const cacheKey = `game-feed-${gameId}-${limit}`;

    return withCache(
      () => api.request(`/kill-feed/game/${gameId}?limit=${limit}`),
      cacheKey,
      killFeedCache,
      10000 // 10 second cache for game feed
    );
  },

  /**
   * Get personal feed (events involving current user)
   * @param {Object} options - Options { limit: number }
   * @returns {Promise<{data: Array, error: ServiceError|null}>}
   */
  async getPersonalFeed(options = {}) {
    const { limit = 25 } = options;

    return withCache(
      () => api.request(`/kill-feed/personal?limit=${limit}`),
      `personal-feed-${limit}`,
      killFeedCache,
      30000
    );
  },

  /**
   * Post an event to the kill feed
   * @param {Object} event - Event data { type, data, gameId }
   * @returns {Promise<{data: Object, error: ServiceError|null}>}
   */
  async postEvent(event) {
    // Validate event
    const validation = validateInput(
      event,
      {
        type: validators.combine(
          validators.required,
          (v) => ({
            valid: Object.values(FeedEventTypes).includes(v),
            error: `Invalid event type. Must be one of: ${Object.values(FeedEventTypes).join(', ')}`,
          })
        ),
      }
    );

    if (!validation.valid) {
      return {
        data: null,
        error: new ServiceError(
          'Invalid event parameters',
          ErrorTypes.VALIDATION,
          validation.errors
        ),
      };
    }

    const eventWithTimestamp = {
      ...event,
      timestamp: Date.now(),
    };

    // Optimistically add to local buffer
    this.addToBuffer(eventWithTimestamp);

    const result = await withErrorHandling(
      () =>
        api.request('/kill-feed', {
          method: 'POST',
          body: JSON.stringify(eventWithTimestamp),
        }),
      { errorMessage: 'Failed to post event' }
    );

    // Invalidate caches on success
    if (result.data) {
      killFeedCache.clear();
    }

    return result;
  },

  /**
   * Add event to local buffer and notify listeners
   * @param {Object} event - Event data
   */
  addToBuffer(event) {
    const eventWithId = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      isLocal: true,
    };

    feedBuffer.unshift(eventWithId);

    // Keep buffer size manageable
    if (feedBuffer.length > MAX_FEED_ITEMS) {
      feedBuffer = feedBuffer.slice(0, MAX_FEED_ITEMS);
    }

    // Notify listeners
    this.emitToListeners(eventWithId);
  },

  /**
   * Get events from local buffer
   * @param {number} limit - Max events to return
   * @returns {Array} Feed events
   */
  getBufferedEvents(limit = 25) {
    return feedBuffer.slice(0, limit);
  },

  /**
   * Subscribe to real-time feed events
   * @param {Function} callback - Callback for feed events
   * @returns {Function} Unsubscribe function
   */
  onFeedEvent(callback) {
    feedListeners.push(callback);
    return () => {
      feedListeners = feedListeners.filter((cb) => cb !== callback);
    };
  },

  /**
   * Emit event to all listeners
   * @param {Object} event - Event data
   */
  emitToListeners(event) {
    feedListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Kill feed listener error:', e);
        }
      }
    });
  },

  /**
   * Connect to real-time feed via socket
   * @param {string} gameId - Optional game ID to subscribe to
   */
  subscribeToRealTime(gameId = null) {
    if (socketService.isConnected()) {
      socketService.emit('subscribe:killfeed', { gameId });
    }
  },

  /**
   * Unsubscribe from real-time feed
   * @param {string} gameId - Optional game ID to unsubscribe from
   */
  unsubscribeFromRealTime(gameId = null) {
    if (socketService.isConnected()) {
      socketService.emit('unsubscribe:killfeed', { gameId });
    }
  },

  /**
   * Format event for display
   * @param {Object} event - Event data
   * @returns {Object} Formatted event with display text
   */
  formatEvent(event) {
    const { type, data } = event;

    let text = '';
    let icon = '';

    switch (type) {
      case FeedEventTypes.TAG:
        text = `${data.taggerName} tagged ${data.taggedName}`;
        icon = 'target';
        break;
      case FeedEventTypes.GAME_START:
        text = `Game "${data.gameName}" has started`;
        icon = 'play';
        break;
      case FeedEventTypes.GAME_END:
        text = `${data.winnerName} won the game!`;
        icon = 'trophy';
        break;
      case FeedEventTypes.BOUNTY_CLAIMED:
        text = `${data.hunterName} claimed bounty on ${data.targetName}`;
        icon = 'coins';
        break;
      case FeedEventTypes.ACHIEVEMENT:
        text = `${data.playerName} earned "${data.achievementName}"`;
        icon = 'award';
        break;
      case FeedEventTypes.POWERUP_USED:
        text = `${data.playerName} used ${data.powerupName}`;
        icon = 'zap';
        break;
      case FeedEventTypes.ZONE_CAPTURED:
        text = `${data.clanName} captured ${data.zoneName}`;
        icon = 'flag';
        break;
      case FeedEventTypes.STREAK:
        text = `${data.playerName} is on a ${data.count} tag streak!`;
        icon = 'flame';
        break;
      default:
        text = 'Unknown event';
        icon = 'info';
    }

    return {
      ...event,
      displayText: text,
      icon,
    };
  },

  /**
   * Clear local buffer
   */
  clearBuffer() {
    feedBuffer = [];
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    killFeedCache.clear();
    feedBuffer = [];
  },
};
