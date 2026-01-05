/**
 * Points of Interest (POI) Service
 * Special map locations with bonuses, objectives, and safe houses
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// POI Types
export const POI_TYPES = {
  // Bonus locations
  POWER_UP_SPAWN: {
    id: 'power_up_spawn',
    name: 'Power-Up Spawn',
    icon: '⚡',
    color: '#FFD700',
    description: 'Power-ups spawn here periodically',
    radius: 20,
  },
  XP_BOOST: {
    id: 'xp_boost',
    name: 'XP Boost Zone',
    icon: '✨',
    color: '#9966FF',
    description: 'Earn 2x XP while in this area',
    radius: 50,
  },
  COIN_CACHE: {
    id: 'coin_cache',
    name: 'Coin Cache',
    icon: '💰',
    color: '#FFD700',
    description: 'Collect coins from this location',
    radius: 15,
  },

  // Objective locations
  CAPTURE_POINT: {
    id: 'capture_point',
    name: 'Capture Point',
    icon: '🚩',
    color: '#FF4444',
    description: 'Capture and hold for points',
    radius: 30,
    captureTime: 30000, // 30 seconds to capture
  },
  FLAG_BASE: {
    id: 'flag_base',
    name: 'Flag Base',
    icon: '🏴',
    color: '#4444FF',
    description: 'Capture the flag and return it here',
    radius: 25,
  },
  CHECKPOINT: {
    id: 'checkpoint',
    name: 'Checkpoint',
    icon: '✅',
    color: '#44FF44',
    description: 'Pass through all checkpoints to win',
    radius: 20,
  },

  // Safe houses
  SAFE_HOUSE: {
    id: 'safe_house',
    name: 'Safe House',
    icon: '🏠',
    color: '#00FFFF',
    description: 'Temporary immunity zone - requires unlock',
    radius: 40,
    cooldown: 300000, // 5 minute cooldown after use
    maxStay: 60000, // Max 1 minute stay
  },
  HOSPITAL: {
    id: 'hospital',
    name: 'Hospital',
    icon: '🏥',
    color: '#FF6B6B',
    description: 'Heal and remove negative effects',
    radius: 35,
  },

  // Special locations
  MYSTERY_BOX: {
    id: 'mystery_box',
    name: 'Mystery Box',
    icon: '🎁',
    color: '#FF69B4',
    description: 'Random reward - could be anything!',
    radius: 10,
    respawnTime: 180000, // 3 minutes
  },
  TELEPORTER: {
    id: 'teleporter',
    name: 'Teleporter',
    icon: '🌀',
    color: '#00CED1',
    description: 'Teleport to another random teleporter',
    radius: 15,
    cooldown: 120000, // 2 minute cooldown
  },
  LOOKOUT_TOWER: {
    id: 'lookout_tower',
    name: 'Lookout Tower',
    icon: '🗼',
    color: '#DDA0DD',
    description: 'See all players for 30 seconds',
    radius: 20,
    duration: 30000,
    cooldown: 180000,
  },
};

// POI Status
export const POI_STATUS = {
  AVAILABLE: 'available',
  CAPTURED: 'captured',
  CONTESTED: 'contested',
  COOLDOWN: 'cooldown',
  LOCKED: 'locked',
};

class POIService {
  constructor() {
    this.cache = cacheService;
    this.activePOIs = new Map();
    this.playerCooldowns = new Map();
    this.listeners = new Map();
  }

  /**
   * Load POIs for a game
   */
  async loadGamePOIs(gameId) {
    const cacheKey = `game_pois_${gameId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.setActivePOIs(cached);
      return cached;
    }

    try {
      const data = await api.request(`/games/${gameId}/pois`);
      await this.cache.set(cacheKey, data.pois, CacheTTL.SHORT);
      this.setActivePOIs(data.pois);
      return data.pois;
    } catch (error) {
      console.error('Failed to load game POIs:', error);
      return [];
    }
  }

  /**
   * Set active POIs
   */
  setActivePOIs(pois) {
    this.activePOIs.clear();
    for (const poi of pois) {
      this.activePOIs.set(poi.id, {
        ...poi,
        status: poi.status || POI_STATUS.AVAILABLE,
        capturedBy: poi.capturedBy || null,
        captureProgress: poi.captureProgress || 0,
      });
    }
  }

  /**
   * Get all active POIs
   */
  getActivePOIs() {
    return Array.from(this.activePOIs.values());
  }

  /**
   * Get POI by ID
   */
  getPOI(poiId) {
    return this.activePOIs.get(poiId);
  }

  /**
   * Get POIs near a location
   */
  getPOIsNearLocation(lat, lng, maxDistance = 500) {
    const pois = [];

    for (const poi of this.activePOIs.values()) {
      const distance = this.calculateDistance(lat, lng, poi.lat, poi.lng);
      if (distance <= maxDistance) {
        pois.push({
          ...poi,
          distance,
        });
      }
    }

    return pois.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if player is in POI
   */
  isPlayerInPOI(poiId, playerLat, playerLng) {
    const poi = this.activePOIs.get(poiId);
    if (!poi) return false;

    const distance = this.calculateDistance(playerLat, playerLng, poi.lat, poi.lng);
    const poiType = POI_TYPES[poi.type.toUpperCase()];
    const radius = poi.radius || poiType?.radius || 20;

    return distance <= radius;
  }

  /**
   * Get all POIs player is currently in
   */
  getPOIsPlayerIsIn(playerLat, playerLng) {
    const inPOIs = [];

    for (const poi of this.activePOIs.values()) {
      if (this.isPlayerInPOI(poi.id, playerLat, playerLng)) {
        inPOIs.push(poi);
      }
    }

    return inPOIs;
  }

  /**
   * Interact with POI
   */
  async interactWithPOI(poiId, playerId) {
    const poi = this.activePOIs.get(poiId);
    if (!poi) {
      throw new Error('POI not found');
    }

    // Check cooldown
    const cooldownKey = `${playerId}_${poiId}`;
    const cooldown = this.playerCooldowns.get(cooldownKey);
    if (cooldown && Date.now() < cooldown) {
      throw new Error('POI is on cooldown');
    }

    try {
      const data = await api.request(`/games/pois/${poiId}/interact`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      // Update local state
      if (data.poi) {
        this.activePOIs.set(poiId, data.poi);
      }

      // Set cooldown if applicable
      if (data.cooldownUntil) {
        this.playerCooldowns.set(cooldownKey, data.cooldownUntil);
      }

      this.emit('poi_interaction', { poiId, result: data });

      return data;
    } catch (error) {
      console.error('Failed to interact with POI:', error);
      throw error;
    }
  }

  /**
   * Start capturing a capture point
   */
  async startCapture(poiId, playerId) {
    const poi = this.activePOIs.get(poiId);
    if (!poi || poi.type !== 'capture_point') {
      throw new Error('Invalid capture point');
    }

    try {
      const data = await api.request(`/games/pois/${poiId}/capture/start`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      // Update local state
      this.activePOIs.set(poiId, {
        ...poi,
        status: POI_STATUS.CONTESTED,
        capturingPlayer: playerId,
        captureStartTime: Date.now(),
      });

      this.emit('capture_start', { poiId, playerId });

      return data;
    } catch (error) {
      console.error('Failed to start capture:', error);
      throw error;
    }
  }

  /**
   * Complete capture of a point
   */
  async completeCapture(poiId, playerId) {
    try {
      const data = await api.request(`/games/pois/${poiId}/capture/complete`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      const poi = this.activePOIs.get(poiId);
      if (poi) {
        this.activePOIs.set(poiId, {
          ...poi,
          status: POI_STATUS.CAPTURED,
          capturedBy: playerId,
          captureTime: Date.now(),
        });
      }

      this.emit('capture_complete', { poiId, playerId });

      return data;
    } catch (error) {
      console.error('Failed to complete capture:', error);
      throw error;
    }
  }

  /**
   * Pick up flag
   */
  async pickUpFlag(poiId, playerId) {
    try {
      const data = await api.request(`/games/pois/${poiId}/flag/pickup`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      this.emit('flag_pickup', { poiId, playerId });

      return data;
    } catch (error) {
      console.error('Failed to pick up flag:', error);
      throw error;
    }
  }

  /**
   * Drop flag
   */
  async dropFlag(playerId) {
    try {
      const data = await api.request('/games/flag/drop', {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      this.emit('flag_drop', { playerId, location: data.location });

      return data;
    } catch (error) {
      console.error('Failed to drop flag:', error);
      throw error;
    }
  }

  /**
   * Score flag (return to base)
   */
  async scoreFlag(playerId) {
    try {
      const data = await api.request('/games/flag/score', {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      this.emit('flag_score', { playerId, team: data.team });

      return data;
    } catch (error) {
      console.error('Failed to score flag:', error);
      throw error;
    }
  }

  /**
   * Enter safe house
   */
  async enterSafeHouse(poiId, playerId) {
    const poi = this.activePOIs.get(poiId);
    if (!poi || poi.type !== 'safe_house') {
      throw new Error('Invalid safe house');
    }

    // Check if safe house needs unlocking
    if (poi.status === POI_STATUS.LOCKED) {
      throw new Error('Safe house is locked');
    }

    try {
      const data = await api.request(`/games/pois/${poiId}/safehouse/enter`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      this.emit('safehouse_enter', { poiId, playerId, expiresAt: data.expiresAt });

      return data;
    } catch (error) {
      console.error('Failed to enter safe house:', error);
      throw error;
    }
  }

  /**
   * Unlock safe house
   */
  async unlockSafeHouse(poiId, playerId) {
    try {
      const data = await api.request(`/games/pois/${poiId}/safehouse/unlock`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      const poi = this.activePOIs.get(poiId);
      if (poi) {
        this.activePOIs.set(poiId, {
          ...poi,
          status: POI_STATUS.AVAILABLE,
          unlockedBy: playerId,
        });
      }

      this.emit('safehouse_unlock', { poiId, playerId });

      return data;
    } catch (error) {
      console.error('Failed to unlock safe house:', error);
      throw error;
    }
  }

  /**
   * Use teleporter
   */
  async useTeleporter(poiId, playerId) {
    try {
      const data = await api.request(`/games/pois/${poiId}/teleport`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      // Set cooldown
      const cooldownKey = `${playerId}_${poiId}`;
      this.playerCooldowns.set(cooldownKey, Date.now() + POI_TYPES.TELEPORTER.cooldown);

      this.emit('teleport', { from: poiId, to: data.destination, playerId });

      return data;
    } catch (error) {
      console.error('Failed to use teleporter:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get POI type info
   */
  getPOITypeInfo(typeId) {
    return POI_TYPES[typeId.toUpperCase()] || null;
  }

  // ============ EVENT EMITTER ============

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.activePOIs.clear();
    this.playerCooldowns.clear();
  }
}

// Singleton
export const poiService = new POIService();
export default poiService;
