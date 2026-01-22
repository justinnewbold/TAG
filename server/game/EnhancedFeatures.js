/**
 * Enhanced Game Features - Server-side support
 *
 * Handles:
 * - Ghost Trail (delayed locations)
 * - Territories
 * - Ambush Points
 * - Taunts & Pings
 * - Momentum tracking
 * - Showdown detection
 * - Weather effects
 * - Revenge timers
 */

import { getDistance } from '../shared/utils.js';

export class EnhancedFeatures {
  constructor() {
    // Location history for ghost trails: { playerId: [{ lat, lng, timestamp }] }
    this.locationHistory = new Map();

    // Player territories: { playerId: [Territory] }
    this.territories = new Map();

    // Ambush points: { playerId: [AmbushPoint] }
    this.ambushPoints = new Map();

    // Momentum data: { playerId: MomentumData }
    this.momentum = new Map();

    // Active showdowns: { key: ShowdownState }
    this.showdowns = new Map();

    // Revenge timers: { `${taggerId}_${taggedId}`: expiresAt }
    this.revengeCooldowns = new Map();

    // Taunt cooldowns: { `${playerId}_taunt`: timestamp }
    this.actionCooldowns = new Map();

    // Configuration
    this.config = {
      ghostTrail: {
        delayTime: 45000, // 45 seconds
        maxHistory: 50,
        trailDuration: 120000, // 2 minutes
      },
      territory: {
        claimTime: 600000, // 10 minutes
        radius: 100,
        warningRadius: 200,
        maxPerPlayer: 5,
      },
      ambush: {
        maxPerPlayer: 3,
        triggerRadius: 50,
        duration: 14400000, // 4 hours
        cooldown: 300000, // 5 min between same trigger
      },
      momentum: {
        decayRate: 1, // per minute
        maxMomentum: 100,
      },
      showdown: {
        triggerDistance: 100,
        exitDistance: 150,
      },
      revenge: {
        defaultCooldown: 60000, // 1 minute
      },
      taunt: {
        cooldown: 60000,
        maxPerGame: 10,
      },
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // ==================== GHOST TRAIL ====================

  /**
   * Record player location for ghost trail
   */
  recordLocation(playerId, location) {
    if (!location?.lat || !location?.lng) return;

    const history = this.locationHistory.get(playerId) || [];

    history.push({
      lat: location.lat,
      lng: location.lng,
      timestamp: Date.now(),
    });

    // Trim to max
    while (history.length > this.config.ghostTrail.maxHistory) {
      history.shift();
    }

    this.locationHistory.set(playerId, history);
  }

  /**
   * Get delayed location (what IT sees)
   */
  getDelayedLocation(playerId) {
    const history = this.locationHistory.get(playerId);
    if (!history || history.length === 0) return null;

    const targetTime = Date.now() - this.config.ghostTrail.delayTime;

    // Find closest point to target time
    let closest = null;
    let closestDiff = Infinity;

    for (const point of history) {
      if (point.timestamp <= targetTime) {
        const diff = targetTime - point.timestamp;
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = point;
        }
      }
    }

    return closest || history[0];
  }

  /**
   * Get ghost trail for map display
   */
  getGhostTrail(playerId) {
    const history = this.locationHistory.get(playerId);
    if (!history) return [];

    const now = Date.now();
    return history
      .filter((p) => now - p.timestamp <= this.config.ghostTrail.trailDuration)
      .map((p) => ({
        ...p,
        age: now - p.timestamp,
        opacity: Math.max(0.1, 1 - (now - p.timestamp) / this.config.ghostTrail.trailDuration),
      }));
  }

  // ==================== TERRITORIES ====================

  /**
   * Start claiming a territory
   */
  startTerritoryClaim(playerId, location, name) {
    const playerTerritories = this.territories.get(playerId) || [];

    if (playerTerritories.length >= this.config.territory.maxPerPlayer) {
      return { error: 'Maximum territories reached' };
    }

    return {
      claimId: `claim_${playerId}_${Date.now()}`,
      startedAt: Date.now(),
      location,
      name: name || `Zone ${playerTerritories.length + 1}`,
    };
  }

  /**
   * Complete a territory claim
   */
  completeTerritoryClaim(playerId, claimId, location, name) {
    const playerTerritories = this.territories.get(playerId) || [];

    const territory = {
      id: `territory_${playerId}_${Date.now()}`,
      playerId,
      name,
      center: location,
      radius: this.config.territory.radius,
      warningRadius: this.config.territory.warningRadius,
      createdAt: Date.now(),
    };

    playerTerritories.push(territory);
    this.territories.set(playerId, playerTerritories);

    return territory;
  }

  /**
   * Check if IT is in any player's territory (for warnings)
   */
  checkTerritoryWarnings(playerId, itLocation) {
    const playerTerritories = this.territories.get(playerId) || [];
    const warnings = [];

    for (const territory of playerTerritories) {
      const distance = getDistance(
        itLocation.lat,
        itLocation.lng,
        territory.center.lat,
        territory.center.lng
      );

      if (distance <= territory.warningRadius) {
        warnings.push({
          territory,
          distance,
          severity: distance <= territory.radius ? 'critical' : 'warning',
        });
      }
    }

    return warnings;
  }

  // ==================== AMBUSH POINTS ====================

  /**
   * Place an ambush point
   */
  placeAmbush(playerId, location, options = {}) {
    const playerPoints = this.ambushPoints.get(playerId) || [];

    if (playerPoints.length >= this.config.ambush.maxPerPlayer) {
      return { error: 'Maximum ambush points reached' };
    }

    const ambush = {
      id: `ambush_${playerId}_${Date.now()}`,
      playerId,
      location,
      name: options.name || `Point ${playerPoints.length + 1}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.ambush.duration,
      triggerRadius: this.config.ambush.triggerRadius,
      triggerCount: 0,
      lastTriggered: null,
    };

    playerPoints.push(ambush);
    this.ambushPoints.set(playerId, playerPoints);

    return { success: true, ambush };
  }

  /**
   * Check if IT triggers any ambush points
   */
  checkAmbushTriggers(itPlayerId, itLocation) {
    const triggered = [];
    const now = Date.now();

    for (const [playerId, points] of this.ambushPoints) {
      if (playerId === itPlayerId) continue;

      for (const point of points) {
        if (now > point.expiresAt) continue;
        if (point.lastTriggered && now - point.lastTriggered < this.config.ambush.cooldown)
          continue;

        const distance = getDistance(
          itLocation.lat,
          itLocation.lng,
          point.location.lat,
          point.location.lng
        );

        if (distance <= point.triggerRadius) {
          point.triggerCount++;
          point.lastTriggered = now;

          triggered.push({
            playerId,
            ambush: point,
            distance,
            timestamp: now,
          });
        }
      }
    }

    return triggered;
  }

  // ==================== MOMENTUM ====================

  /**
   * Update player momentum based on movement
   */
  updateMomentum(playerId, location) {
    let data = this.momentum.get(playerId);

    if (!data) {
      data = {
        momentum: 20,
        lastLocation: location,
        lastUpdate: Date.now(),
      };
      this.momentum.set(playerId, data);
      return data;
    }

    if (!data.lastLocation) {
      data.lastLocation = location;
      data.lastUpdate = Date.now();
      return data;
    }

    const distance = getDistance(
      data.lastLocation.lat,
      data.lastLocation.lng,
      location.lat,
      location.lng
    );

    // Gain momentum from movement
    data.momentum = Math.min(this.config.momentum.maxMomentum, data.momentum + distance * 0.5);
    data.lastLocation = location;
    data.lastUpdate = Date.now();

    return data;
  }

  /**
   * Get GPS update multiplier based on momentum
   */
  getGPSMultiplier(playerId) {
    const data = this.momentum.get(playerId);
    if (!data) return 1.0;

    if (data.momentum >= 85) return 0.4;
    if (data.momentum >= 60) return 0.6;
    if (data.momentum >= 30) return 0.8;
    if (data.momentum >= 10) return 1.0;
    return 1.5; // Stationary - easier to track
  }

  // ==================== SHOWDOWN ====================

  /**
   * Check if showdown should be triggered
   */
  checkShowdown(itPlayerId, targetPlayerId, distance) {
    const key = [itPlayerId, targetPlayerId].sort().join('_vs_');
    const existing = this.showdowns.get(key);

    if (existing) {
      if (distance > this.config.showdown.exitDistance) {
        this.showdowns.delete(key);
        return { ended: true, showdown: existing };
      }
      existing.distance = distance;
      existing.lastUpdate = Date.now();
      return { active: true, showdown: existing };
    }

    if (distance <= this.config.showdown.triggerDistance) {
      const showdown = {
        id: `showdown_${Date.now()}`,
        itPlayerId,
        targetPlayerId,
        distance,
        startedAt: Date.now(),
        lastUpdate: Date.now(),
      };
      this.showdowns.set(key, showdown);
      return { started: true, showdown };
    }

    return { active: false };
  }

  // ==================== REVENGE TIMER ====================

  /**
   * Set revenge cooldown after a tag
   */
  setRevengeCooldown(taggerId, taggedId, duration = null) {
    const cooldownDuration = duration || this.config.revenge.defaultCooldown;
    const key = `${taggerId}_${taggedId}`;
    this.revengeCooldowns.set(key, Date.now() + cooldownDuration);
  }

  /**
   * Check if revenge is on cooldown
   */
  isRevengeOnCooldown(taggerId, taggedId) {
    const key = `${taggerId}_${taggedId}`;
    const expiresAt = this.revengeCooldowns.get(key);

    if (!expiresAt) return { onCooldown: false };
    if (Date.now() >= expiresAt) {
      this.revengeCooldowns.delete(key);
      return { onCooldown: false };
    }

    return {
      onCooldown: true,
      remainingTime: expiresAt - Date.now(),
      expiresAt,
    };
  }

  // ==================== TAUNTS & PINGS ====================

  /**
   * Process taunt action
   */
  processTaunt(fromPlayerId, toPlayerId, gameId) {
    const cooldownKey = `${fromPlayerId}_taunt_${gameId}`;
    const lastTaunt = this.actionCooldowns.get(cooldownKey);

    if (lastTaunt && Date.now() - lastTaunt < this.config.taunt.cooldown) {
      return {
        success: false,
        error: 'On cooldown',
        remainingTime: this.config.taunt.cooldown - (Date.now() - lastTaunt),
      };
    }

    this.actionCooldowns.set(cooldownKey, Date.now());

    return {
      success: true,
      taunt: {
        id: `taunt_${Date.now()}`,
        fromPlayerId,
        toPlayerId,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Create decoy ping
   */
  createDecoy(playerId, location, gameId) {
    return {
      id: `decoy_${Date.now()}`,
      playerId,
      location,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30000, // 30 seconds
    };
  }

  /**
   * Create SOS alert
   */
  createSOS(playerId, location, gameId) {
    return {
      id: `sos_${Date.now()}`,
      playerId,
      location,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000, // 1 minute
    };
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up expired data
   */
  cleanup() {
    const now = Date.now();

    // Cleanup old location history
    for (const [playerId, history] of this.locationHistory) {
      const cutoff = now - this.config.ghostTrail.trailDuration - this.config.ghostTrail.delayTime;
      const filtered = history.filter((p) => p.timestamp > cutoff);
      if (filtered.length === 0) {
        this.locationHistory.delete(playerId);
      } else {
        this.locationHistory.set(playerId, filtered);
      }
    }

    // Cleanup expired ambush points
    for (const [playerId, points] of this.ambushPoints) {
      const active = points.filter((p) => p.expiresAt > now);
      if (active.length === 0) {
        this.ambushPoints.delete(playerId);
      } else {
        this.ambushPoints.set(playerId, active);
      }
    }

    // Cleanup expired revenge cooldowns
    for (const [key, expiresAt] of this.revengeCooldowns) {
      if (now >= expiresAt) {
        this.revengeCooldowns.delete(key);
      }
    }

    // Apply momentum decay
    for (const [playerId, data] of this.momentum) {
      const minutesSinceUpdate = (now - data.lastUpdate) / 60000;
      if (minutesSinceUpdate > 1) {
        data.momentum = Math.max(0, data.momentum - this.config.momentum.decayRate * minutesSinceUpdate);
      }
    }
  }

  /**
   * Clear all data for a player
   */
  clearPlayer(playerId) {
    this.locationHistory.delete(playerId);
    this.territories.delete(playerId);
    this.ambushPoints.delete(playerId);
    this.momentum.delete(playerId);

    // Clear showdowns involving this player
    for (const [key] of this.showdowns) {
      if (key.includes(playerId)) {
        this.showdowns.delete(key);
      }
    }
  }

  /**
   * Destroy service
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.locationHistory.clear();
    this.territories.clear();
    this.ambushPoints.clear();
    this.momentum.clear();
    this.showdowns.clear();
    this.revengeCooldowns.clear();
  }
}

export const enhancedFeatures = new EnhancedFeatures();
export default enhancedFeatures;
