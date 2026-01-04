/**
 * Power-up Service
 * Phase 4: Complete power-up system implementation
 */

import { api } from './api';
import { socketService } from './socket';
import { POWERUP_TYPES } from '../../shared/constants';

// Power-up spawn configurations
export const SPAWN_CONFIG = {
  INTERVAL_MIN: 60000, // 1 minute
  INTERVAL_MAX: 180000, // 3 minutes
  RADIUS_FROM_CENTER: 500, // meters
  MAX_ACTIVE_SPAWNS: 5,
  PICKUP_RADIUS: 10, // meters
};

class PowerupService {
  constructor() {
    this.activeSpawns = new Map(); // spawnId -> spawn data
    this.cooldowns = new Map(); // powerupType -> expiresAt
    this.pickupCallbacks = [];
  }

  /**
   * Get all power-up types
   */
  getPowerupTypes() {
    return Object.values(POWERUP_TYPES);
  }

  /**
   * Get power-up by ID
   */
  getPowerupById(id) {
    return POWERUP_TYPES[id.toUpperCase()] || null;
  }

  /**
   * Check if a power-up is on cooldown
   */
  isOnCooldown(powerupType) {
    const expiresAt = this.cooldowns.get(powerupType);
    if (!expiresAt) return false;
    return Date.now() < expiresAt;
  }

  /**
   * Get remaining cooldown time
   */
  getCooldownRemaining(powerupType) {
    const expiresAt = this.cooldowns.get(powerupType);
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  }

  /**
   * Set cooldown for a power-up type
   */
  setCooldown(powerupType, durationMs) {
    this.cooldowns.set(powerupType, Date.now() + durationMs);
  }

  /**
   * Activate a power-up
   */
  async activatePowerup(powerupInstanceId, gameId) {
    try {
      const result = await api.request(`/games/${gameId}/powerups/activate`, {
        method: 'POST',
        body: JSON.stringify({ powerupInstanceId }),
      });

      if (result.success) {
        // Emit socket event for real-time sync
        socketService.emit('powerup:activate', {
          gameId,
          powerupInstanceId,
          effect: result.effect,
          duration: result.duration,
        });

        // Set cooldown if applicable
        if (result.cooldown) {
          this.setCooldown(result.powerupType, result.cooldown);
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to activate power-up:', error);
      throw error;
    }
  }

  /**
   * Pick up a spawned power-up
   */
  async pickupSpawn(spawnId, gameId, playerLocation) {
    try {
      const result = await api.request(`/games/${gameId}/powerups/pickup`, {
        method: 'POST',
        body: JSON.stringify({
          spawnId,
          location: playerLocation,
        }),
      });

      if (result.success) {
        this.activeSpawns.delete(spawnId);

        // Notify callbacks
        this.pickupCallbacks.forEach(cb => cb(result.powerup));
      }

      return result;
    } catch (error) {
      console.error('Failed to pickup power-up:', error);
      throw error;
    }
  }

  /**
   * Register for pickup notifications
   */
  onPickup(callback) {
    this.pickupCallbacks.push(callback);
    return () => {
      const index = this.pickupCallbacks.indexOf(callback);
      if (index > -1) this.pickupCallbacks.splice(index, 1);
    };
  }

  /**
   * Check if player can pickup a spawn
   */
  canPickup(spawnLocation, playerLocation) {
    if (!spawnLocation || !playerLocation) return false;

    const distance = this.calculateDistance(
      spawnLocation.lat, spawnLocation.lng,
      playerLocation.lat, playerLocation.lng
    );

    return distance <= SPAWN_CONFIG.PICKUP_RADIUS;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get active spawns for a game
   */
  async getActiveSpawns(gameId) {
    try {
      const result = await api.request(`/games/${gameId}/powerups/spawns`);

      // Update local cache
      this.activeSpawns.clear();
      result.spawns.forEach(spawn => {
        this.activeSpawns.set(spawn.id, spawn);
      });

      return result.spawns;
    } catch (error) {
      console.error('Failed to get active spawns:', error);
      return [];
    }
  }

  /**
   * Handle spawn event from socket
   */
  handleSpawnEvent(spawn) {
    this.activeSpawns.set(spawn.id, spawn);
  }

  /**
   * Handle despawn event from socket
   */
  handleDespawnEvent(spawnId) {
    this.activeSpawns.delete(spawnId);
  }

  /**
   * Get power-up effect description
   */
  getEffectDescription(effect, duration) {
    const descriptions = {
      speed_boost: `Move faster for ${duration / 1000}s`,
      invisibility: `Hidden from map for ${duration / 1000}s`,
      shield: `Cannot be tagged for ${duration / 1000}s`,
      radar: `See all players for ${duration / 1000}s`,
      freeze_area: `Slow nearby players for ${duration / 1000}s`,
      decoy: `Fake position shown for ${duration / 1000}s`,
      teleport: `Teleport to random safe location`,
      trap: `Place a freeze trap`,
    };
    return descriptions[effect] || 'Unknown effect';
  }

  /**
   * Get rarity color
   */
  getRarityColor(rarity) {
    const colors = {
      common: 'text-gray-400',
      uncommon: 'text-green-400',
      rare: 'text-blue-400',
      epic: 'text-purple-400',
      legendary: 'text-yellow-400',
    };
    return colors[rarity] || 'text-white';
  }

  /**
   * Get rarity background color
   */
  getRarityBgColor(rarity) {
    const colors = {
      common: 'bg-gray-500/20',
      uncommon: 'bg-green-500/20',
      rare: 'bg-blue-500/20',
      epic: 'bg-purple-500/20',
      legendary: 'bg-yellow-500/20',
    };
    return colors[rarity] || 'bg-white/10';
  }

  /**
   * Clear all data (for logout/reset)
   */
  clear() {
    this.activeSpawns.clear();
    this.cooldowns.clear();
    this.pickupCallbacks = [];
  }
}

// Singleton instance
export const powerupService = new PowerupService();
export default powerupService;
