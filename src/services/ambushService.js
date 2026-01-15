/**
 * Ambush Points Service
 *
 * Drop invisible "traps" on the map that alert you when IT crosses them.
 * Limited to 3 active at a time. Set one at your normal route home,
 * get notified "IT crossed your ambush at Main St" - plan escape before they arrive!
 * Strategic depth: Where do you place your limited traps?
 */

import { getDistance } from '../../shared/utils.js';

class AmbushService {
  constructor() {
    // Player ambush points: { playerId: [AmbushPoint] }
    this.ambushPoints = new Map();

    // Triggered alerts history: [TriggerEvent]
    this.triggerHistory = [];

    // Configuration
    this.config = {
      // Maximum active ambush points per player
      maxPointsPerPlayer: 3,

      // Trigger radius (meters) - how close IT must get
      triggerRadius: 50,

      // Point duration (ms) - how long until point expires
      pointDuration: 14400000, // 4 hours

      // Alert cooldown - don't alert again for same point
      alertCooldown: 300000, // 5 minutes

      // Naming options
      defaultNames: ['Alpha', 'Bravo', 'Charlie'],

      // Icons for ambush points
      icons: ['🎯', '⚠️', '👁️', '📍', '🚩'],
    };

    // Event listeners
    this.listeners = new Map();

    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Place a new ambush point
   */
  placeAmbush(playerId, location, options = {}) {
    const { name = null, icon = '🎯', notes = '' } = options;

    if (!location?.lat || !location?.lng) {
      return { success: false, error: 'Invalid location' };
    }

    // Get existing points
    const playerPoints = this.ambushPoints.get(playerId) || [];

    // Check max limit
    if (playerPoints.length >= this.config.maxPointsPerPlayer) {
      return {
        success: false,
        error: `Maximum ${this.config.maxPointsPerPlayer} ambush points allowed`,
        suggestion: 'Remove an existing point to place a new one',
      };
    }

    // Check for duplicate locations
    for (const point of playerPoints) {
      const distance = getDistance(
        location.lat,
        location.lng,
        point.location.lat,
        point.location.lng
      );
      if (distance < this.config.triggerRadius) {
        return {
          success: false,
          error: 'Too close to existing ambush point',
        };
      }
    }

    // Create new point
    const pointNumber = playerPoints.length + 1;
    const ambushPoint = {
      id: `ambush_${playerId}_${Date.now()}`,
      playerId,
      location: { lat: location.lat, lng: location.lng },
      name: name || this.config.defaultNames[playerPoints.length] || `Point ${pointNumber}`,
      icon,
      notes,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.pointDuration,
      triggerRadius: this.config.triggerRadius,
      triggerCount: 0,
      lastTriggered: null,
      isActive: true,
    };

    playerPoints.push(ambushPoint);
    this.ambushPoints.set(playerId, playerPoints);

    this.emit('ambushPlaced', { playerId, ambushPoint });

    return { success: true, ambushPoint };
  }

  /**
   * Check if IT has triggered any ambush points
   * Call this with IT's location to check all players' ambush points
   */
  checkTriggers(itPlayerId, itLocation) {
    const triggered = [];
    const now = Date.now();

    for (const [playerId, points] of this.ambushPoints) {
      // Don't trigger own ambush points
      if (playerId === itPlayerId) continue;

      for (const point of points) {
        if (!point.isActive) continue;

        // Check if expired
        if (now > point.expiresAt) {
          point.isActive = false;
          continue;
        }

        // Check cooldown
        if (point.lastTriggered && now - point.lastTriggered < this.config.alertCooldown) {
          continue;
        }

        // Check distance
        const distance = getDistance(
          itLocation.lat,
          itLocation.lng,
          point.location.lat,
          point.location.lng
        );

        if (distance <= point.triggerRadius) {
          // Triggered!
          point.triggerCount++;
          point.lastTriggered = now;

          const triggerEvent = {
            id: `trigger_${Date.now()}`,
            ambushPoint: point,
            playerId: point.playerId,
            itPlayerId,
            distance,
            timestamp: now,
          };

          triggered.push(triggerEvent);
          this.triggerHistory.push(triggerEvent);

          // Emit event
          this.emit('ambushTriggered', triggerEvent);
        }
      }
    }

    return triggered;
  }

  /**
   * Get all ambush points for a player
   */
  getPlayerAmbushPoints(playerId) {
    const points = this.ambushPoints.get(playerId) || [];
    return points.filter((p) => p.isActive && Date.now() < p.expiresAt);
  }

  /**
   * Get ambush point by ID
   */
  getAmbushPoint(ambushId) {
    for (const [, points] of this.ambushPoints) {
      const point = points.find((p) => p.id === ambushId);
      if (point) return point;
    }
    return null;
  }

  /**
   * Remove an ambush point
   */
  removeAmbush(playerId, ambushId) {
    const playerPoints = this.ambushPoints.get(playerId);
    if (!playerPoints) return { success: false, error: 'No points found' };

    const index = playerPoints.findIndex((p) => p.id === ambushId);
    if (index === -1) return { success: false, error: 'Point not found' };

    const removed = playerPoints.splice(index, 1)[0];
    this.ambushPoints.set(playerId, playerPoints);

    this.emit('ambushRemoved', { playerId, ambushPoint: removed });

    return { success: true, removed };
  }

  /**
   * Move an ambush point to a new location
   */
  moveAmbush(playerId, ambushId, newLocation) {
    const playerPoints = this.ambushPoints.get(playerId);
    if (!playerPoints) return { success: false, error: 'No points found' };

    const point = playerPoints.find((p) => p.id === ambushId);
    if (!point) return { success: false, error: 'Point not found' };

    point.location = { lat: newLocation.lat, lng: newLocation.lng };
    point.lastTriggered = null; // Reset trigger cooldown

    this.emit('ambushMoved', { playerId, ambushPoint: point });

    return { success: true, ambushPoint: point };
  }

  /**
   * Rename an ambush point
   */
  renameAmbush(playerId, ambushId, newName) {
    const playerPoints = this.ambushPoints.get(playerId);
    if (!playerPoints) return false;

    const point = playerPoints.find((p) => p.id === ambushId);
    if (point) {
      point.name = newName;
      return true;
    }
    return false;
  }

  /**
   * Update ambush point notes
   */
  updateNotes(playerId, ambushId, notes) {
    const playerPoints = this.ambushPoints.get(playerId);
    if (!playerPoints) return false;

    const point = playerPoints.find((p) => p.id === ambushId);
    if (point) {
      point.notes = notes;
      return true;
    }
    return false;
  }

  /**
   * Get trigger history for a player
   */
  getTriggerHistory(playerId, limit = 10) {
    return this.triggerHistory
      .filter((t) => t.playerId === playerId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get remaining points a player can place
   */
  getRemainingPoints(playerId) {
    const active = this.getPlayerAmbushPoints(playerId);
    return this.config.maxPointsPerPlayer - active.length;
  }

  /**
   * Extend an ambush point's duration
   */
  extendDuration(playerId, ambushId, additionalTime) {
    const playerPoints = this.ambushPoints.get(playerId);
    if (!playerPoints) return false;

    const point = playerPoints.find((p) => p.id === ambushId);
    if (point) {
      point.expiresAt += additionalTime;
      return true;
    }
    return false;
  }

  /**
   * Get time remaining for an ambush point
   */
  getTimeRemaining(ambushId) {
    const point = this.getAmbushPoint(ambushId);
    if (!point) return 0;
    return Math.max(0, point.expiresAt - Date.now());
  }

  /**
   * Clear all ambush points for a player (e.g., on game end)
   */
  clearPlayerAmbushPoints(playerId) {
    this.ambushPoints.delete(playerId);
    this.emit('ambushPointsCleared', { playerId });
  }

  /**
   * Event handling
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  /**
   * Cleanup expired points
   */
  cleanup() {
    const now = Date.now();

    for (const [playerId, points] of this.ambushPoints) {
      const activePoints = points.filter((p) => p.expiresAt > now);

      if (activePoints.length !== points.length) {
        this.ambushPoints.set(playerId, activePoints);
      }
    }

    // Cleanup old trigger history (keep last hour)
    const oneHourAgo = now - 3600000;
    this.triggerHistory = this.triggerHistory.filter(
      (t) => t.timestamp > oneHourAgo
    );
  }

  /**
   * Export for persistence
   */
  exportAmbushPoints(playerId) {
    return this.getPlayerAmbushPoints(playerId);
  }

  /**
   * Import from persistence
   */
  importAmbushPoints(playerId, points) {
    // Validate and filter expired points
    const now = Date.now();
    const validPoints = points.filter((p) => p.expiresAt > now);
    this.ambushPoints.set(playerId, validPoints);
  }

  /**
   * Destroy service
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.ambushPoints.clear();
    this.triggerHistory = [];
    this.listeners.clear();
  }
}

export const ambushService = new AmbushService();
export default ambushService;
