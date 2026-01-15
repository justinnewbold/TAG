/**
 * Game Cache Service
 * Caches game state for offline viewing
 */

const CACHE_KEY = 'tag-game-cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

class GameCacheService {
  constructor() {
    this.cache = this._loadCache();
  }

  _loadCache() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (!stored) return {};

      const cache = JSON.parse(stored);

      // Clean expired entries
      const now = Date.now();
      Object.keys(cache).forEach(key => {
        if (now - cache[key].cachedAt > CACHE_EXPIRY) {
          delete cache[key];
        }
      });

      return cache;
    } catch {
      return {};
    }
  }

  _saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (e) {
      // Storage full - clear old entries
      const keys = Object.keys(this.cache);
      if (keys.length > 5) {
        // Sort by cachedAt and remove oldest
        keys.sort((a, b) => this.cache[a].cachedAt - this.cache[b].cachedAt);
        delete this.cache[keys[0]];
        this._saveCache();
      }
    }
  }

  /**
   * Cache a game state
   */
  cacheGame(game) {
    if (!game?.id) return;

    this.cache[game.id] = {
      game: {
        id: game.id,
        code: game.code,
        status: game.status,
        hostName: game.hostName,
        itPlayerId: game.itPlayerId,
        startedAt: game.startedAt,
        settings: game.settings,
        players: game.players?.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isIt: p.isIt,
          location: p.location,
          lastUpdate: p.lastUpdate,
          team: p.team,
          isFrozen: p.isFrozen,
          isEliminated: p.isEliminated,
        })),
        tags: game.tags?.slice(-20), // Keep last 20 tags
      },
      cachedAt: Date.now(),
    };

    this._saveCache();
  }

  /**
   * Get cached game state
   */
  getCachedGame(gameId) {
    const entry = this.cache[gameId];
    if (!entry) return null;

    // Check expiry
    if (Date.now() - entry.cachedAt > CACHE_EXPIRY) {
      delete this.cache[gameId];
      this._saveCache();
      return null;
    }

    return {
      ...entry.game,
      _cached: true,
      _cachedAt: entry.cachedAt,
    };
  }

  /**
   * Get cached game by code
   */
  getCachedGameByCode(code) {
    const entry = Object.values(this.cache).find(e => e.game.code === code);
    if (!entry) return null;

    // Check expiry
    if (Date.now() - entry.cachedAt > CACHE_EXPIRY) {
      delete this.cache[entry.game.id];
      this._saveCache();
      return null;
    }

    return {
      ...entry.game,
      _cached: true,
      _cachedAt: entry.cachedAt,
    };
  }

  /**
   * Update player location in cache
   */
  updatePlayerLocation(gameId, playerId, location) {
    const entry = this.cache[gameId];
    if (!entry) return;

    const player = entry.game.players?.find(p => p.id === playerId);
    if (player) {
      player.location = location;
      player.lastUpdate = Date.now();
      entry.cachedAt = Date.now();
      this._saveCache();
    }
  }

  /**
   * Clear cache for a specific game
   */
  clearGame(gameId) {
    delete this.cache[gameId];
    this._saveCache();
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache = {};
    this._saveCache();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      gameCount: Object.keys(this.cache).length,
      oldestCache: Math.min(...Object.values(this.cache).map(e => e.cachedAt)),
    };
  }
}

// Singleton instance
export const gameCache = new GameCacheService();

export default gameCache;
