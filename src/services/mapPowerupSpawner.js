/**
 * Map Power-up Spawner Service
 * Spawns collectible power-ups at real GPS locations
 */

import { getDistance } from '../../shared/utils';

// Power-up types with their properties
export const MAP_POWERUPS = {
  SPEED_BOOST: {
    id: 'speed_boost',
    name: 'Speed Boost',
    icon: '⚡',
    color: '#fbbf24',
    effect: 'speed',
    duration: 15000,
    multiplier: 1.5,
    rarity: 'common',
    spawnWeight: 30,
    collectRadius: 15, // meters
    description: 'Move 50% faster for 15 seconds!',
  },
  INVISIBILITY: {
    id: 'invisibility',
    name: 'Invisibility',
    icon: '👻',
    color: '#a855f7',
    effect: 'invisible',
    duration: 10000,
    rarity: 'rare',
    spawnWeight: 15,
    collectRadius: 15,
    description: 'Become invisible to IT for 10 seconds!',
  },
  FREEZE_RAY: {
    id: 'freeze_ray',
    name: 'Freeze Ray',
    icon: '🥶',
    color: '#06b6d4',
    effect: 'freeze',
    duration: 5000,
    rarity: 'rare',
    spawnWeight: 10,
    collectRadius: 15,
    description: 'Freeze IT in place for 5 seconds!',
  },
  TELEPORT: {
    id: 'teleport',
    name: 'Teleport',
    icon: '🌀',
    color: '#ec4899',
    effect: 'teleport',
    rarity: 'epic',
    spawnWeight: 5,
    collectRadius: 15,
    description: 'Instantly teleport to a random safe location!',
  },
  SHIELD: {
    id: 'shield',
    name: 'Shield',
    icon: '🛡️',
    color: '#22c55e',
    effect: 'shield',
    duration: 8000,
    rarity: 'uncommon',
    spawnWeight: 20,
    collectRadius: 15,
    description: 'Block the next tag attempt!',
  },
  MAGNET: {
    id: 'magnet',
    name: 'Tag Magnet',
    icon: '🧲',
    color: '#ef4444',
    effect: 'magnet',
    duration: 20000,
    range: 30,
    rarity: 'uncommon',
    spawnWeight: 15,
    collectRadius: 15,
    description: 'Increases tag radius by 50% for IT!',
  },
  RADAR: {
    id: 'radar',
    name: 'Radar Pulse',
    icon: '📡',
    color: '#3b82f6',
    effect: 'radar',
    duration: 30000,
    rarity: 'common',
    spawnWeight: 25,
    collectRadius: 15,
    description: 'See all players on the map for 30 seconds!',
  },
  DECOY: {
    id: 'decoy',
    name: 'Decoy',
    icon: '🎭',
    color: '#f97316',
    effect: 'decoy',
    duration: 20000,
    rarity: 'uncommon',
    spawnWeight: 15,
    collectRadius: 15,
    description: 'Create a fake version of yourself on the map!',
  },
};

// Rarity colors
const RARITY_COLORS = {
  common: 'border-gray-400',
  uncommon: 'border-green-400',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-amber-400',
};

const RARITY_GLOW = {
  common: '',
  uncommon: 'shadow-green-400/30',
  rare: 'shadow-blue-400/50',
  epic: 'shadow-purple-400/50 animate-pulse',
  legendary: 'shadow-amber-400/70 animate-pulse',
};

class MapPowerupSpawner {
  constructor() {
    this.activePowerups = new Map(); // id -> powerup data
    this.collectedPowerups = new Set(); // ids collected this game
    this.listeners = new Set();
    this.spawnInterval = null;
    this.gameCenter = null;
    this.gameRadius = 500; // meters
    this.maxPowerups = 8;
    this.spawnIntervalMs = 30000; // spawn check every 30s
    this.nextId = 1;
  }

  /**
   * Start spawning powerups for a game
   */
  startSpawning(center, radius = 500) {
    this.gameCenter = center;
    this.gameRadius = radius;
    this.activePowerups.clear();
    this.collectedPowerups.clear();

    // Initial spawn
    this.spawnPowerups(3);

    // Periodic spawning
    this.spawnInterval = setInterval(() => {
      if (this.activePowerups.size < this.maxPowerups) {
        this.spawnPowerups(1);
      }
    }, this.spawnIntervalMs);
  }

  /**
   * Stop spawning
   */
  stopSpawning() {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
    this.activePowerups.clear();
    this.notifyListeners('clear', null);
  }

  /**
   * Spawn N powerups at random locations
   */
  spawnPowerups(count) {
    for (let i = 0; i < count; i++) {
      const powerup = this.createRandomPowerup();
      if (powerup) {
        this.activePowerups.set(powerup.id, powerup);
        this.notifyListeners('spawn', powerup);
      }
    }
  }

  /**
   * Create a random powerup
   */
  createRandomPowerup() {
    if (!this.gameCenter) return null;

    // Choose powerup type based on weights
    const powerupType = this.weightedRandomPowerup();
    const template = MAP_POWERUPS[powerupType];

    // Generate random position within game area
    const position = this.randomPosition();

    const powerup = {
      id: `powerup_${this.nextId++}`,
      ...template,
      position,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + 120000, // 2 minute lifetime
    };

    return powerup;
  }

  /**
   * Weighted random selection of powerup type
   */
  weightedRandomPowerup() {
    const powerups = Object.entries(MAP_POWERUPS);
    const totalWeight = powerups.reduce((sum, [, p]) => sum + p.spawnWeight, 0);
    let random = Math.random() * totalWeight;

    for (const [key, powerup] of powerups) {
      random -= powerup.spawnWeight;
      if (random <= 0) return key;
    }

    return 'SPEED_BOOST'; // fallback
  }

  /**
   * Generate random position within game area
   */
  randomPosition() {
    const { lat, lng } = this.gameCenter;

    // Random angle and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * this.gameRadius * 0.8; // 80% of radius to keep away from edges

    // Convert to lat/lng offset (approximate)
    const metersPerDegLat = 111320;
    const metersPerDegLng = metersPerDegLat * Math.cos(lat * Math.PI / 180);

    return {
      lat: lat + (distance * Math.sin(angle)) / metersPerDegLat,
      lng: lng + (distance * Math.cos(angle)) / metersPerDegLng,
    };
  }

  /**
   * Check if player can collect any powerups
   */
  checkCollection(playerPosition, playerId) {
    const collected = [];

    for (const [id, powerup] of this.activePowerups) {
      // Check if expired
      if (Date.now() > powerup.expiresAt) {
        this.activePowerups.delete(id);
        this.notifyListeners('expire', powerup);
        continue;
      }

      // Check distance
      const distance = getDistance(playerPosition, powerup.position);
      if (distance <= powerup.collectRadius) {
        collected.push(powerup);
        this.activePowerups.delete(id);
        this.collectedPowerups.add(id);
        this.notifyListeners('collect', { powerup, playerId });
      }
    }

    return collected;
  }

  /**
   * Get all active powerups
   */
  getActivePowerups() {
    // Filter out expired
    const now = Date.now();
    for (const [id, powerup] of this.activePowerups) {
      if (now > powerup.expiresAt) {
        this.activePowerups.delete(id);
        this.notifyListeners('expire', powerup);
      }
    }
    return Array.from(this.activePowerups.values());
  }

  /**
   * Get powerups near a position (for UI optimization)
   */
  getPowerupsNear(position, radiusMeters = 500) {
    return this.getActivePowerups().filter(p => {
      const distance = getDistance(position, p.position);
      return distance <= radiusMeters;
    });
  }

  /**
   * Manually spawn a specific powerup (for testing or special events)
   */
  spawnSpecificPowerup(type, position) {
    const template = MAP_POWERUPS[type];
    if (!template) return null;

    const powerup = {
      id: `powerup_${this.nextId++}`,
      ...template,
      position,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + 120000,
    };

    this.activePowerups.set(powerup.id, powerup);
    this.notifyListeners('spawn', powerup);
    return powerup;
  }

  /**
   * Get time remaining for a powerup
   */
  getTimeRemaining(powerupId) {
    const powerup = this.activePowerups.get(powerupId);
    if (!powerup) return 0;
    return Math.max(0, powerup.expiresAt - Date.now());
  }

  /**
   * Subscribe to powerup events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data));
  }

  /**
   * Get rarity styling
   */
  getRarityClass(rarity) {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common;
  }

  getRarityGlow(rarity) {
    return RARITY_GLOW[rarity] || '';
  }
}

// Singleton
export const mapPowerupSpawner = new MapPowerupSpawner();
export default mapPowerupSpawner;
