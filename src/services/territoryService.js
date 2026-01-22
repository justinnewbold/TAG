/**
 * Territory Claiming Service
 *
 * Players can "claim" zones by staying in them for a period of time.
 * Claimed territories give early warning when IT enters.
 * Chain territories to create "safe corridors" through the map.
 * Perfect for long-distance games - claim your home, work, gym, etc.
 */

import { getDistance } from '../../shared/utils.js';

class TerritoryService {
  constructor() {
    // Player territories: { playerId: [Territory] }
    this.territories = new Map();

    // Active claiming progress: { claimId: ClaimProgress }
    this.claimProgress = new Map();

    // Configuration
    this.config = {
      // Time to claim a territory (ms)
      claimTime: 600000, // 10 minutes

      // Territory radius (meters)
      territoryRadius: 100,

      // Maximum territories per player
      maxTerritoriesPerPlayer: 5,

      // Early warning radius (how far out to alert)
      warningRadius: 200, // meters

      // Minimum distance between territories
      minTerritoryDistance: 200,

      // Territory decay time (ms) - how long until unclaimed
      decayTime: 86400000 * 3, // 3 days

      // Boost in friendly territory
      friendlyBoost: {
        warningTime: 60000, // 1 minute early warning
        speedBonus: 1.1, // 10% faster
      },
    };

    // Event listeners
    this.listeners = new Map();

    // Cleanup interval
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Start claiming a territory at a location
   */
  startClaim(playerId, location, name = null) {
    if (!location?.lat || !location?.lng) return null;

    // Check max territories
    const playerTerritories = this.territories.get(playerId) || [];
    if (playerTerritories.length >= this.config.maxTerritoriesPerPlayer) {
      return { error: 'Maximum territories reached' };
    }

    // Check minimum distance from existing territories
    for (const territory of playerTerritories) {
      const distance = getDistance(
        location.lat,
        location.lng,
        territory.center.lat,
        territory.center.lng
      );
      if (distance < this.config.minTerritoryDistance) {
        return { error: 'Too close to existing territory' };
      }
    }

    // Create claim progress
    const claimId = `claim_${playerId}_${Date.now()}`;
    const claim = {
      id: claimId,
      playerId,
      center: { lat: location.lat, lng: location.lng },
      name: name || `Zone ${playerTerritories.length + 1}`,
      startedAt: Date.now(),
      progress: 0,
      lastUpdate: Date.now(),
    };

    this.claimProgress.set(claimId, claim);

    return { claimId, claim };
  }

  /**
   * Update claim progress (call periodically while in location)
   */
  updateClaimProgress(claimId, currentLocation) {
    const claim = this.claimProgress.get(claimId);
    if (!claim) return null;

    // Check if still in claiming area
    const distance = getDistance(
      currentLocation.lat,
      currentLocation.lng,
      claim.center.lat,
      claim.center.lng
    );

    if (distance > this.config.territoryRadius) {
      // Moved out of claim area - pause progress
      return {
        status: 'paused',
        reason: 'Moved out of territory area',
        progress: claim.progress,
      };
    }

    // Calculate progress
    const elapsed = Date.now() - claim.startedAt;
    claim.progress = Math.min(1, elapsed / this.config.claimTime);
    claim.lastUpdate = Date.now();

    // Check if claim is complete
    if (claim.progress >= 1) {
      return this.completeClaim(claimId);
    }

    return {
      status: 'claiming',
      progress: claim.progress,
      timeRemaining: this.config.claimTime - elapsed,
    };
  }

  /**
   * Complete a territory claim
   */
  completeClaim(claimId) {
    const claim = this.claimProgress.get(claimId);
    if (!claim) return null;

    // Create the territory
    const territory = {
      id: `territory_${claim.playerId}_${Date.now()}`,
      playerId: claim.playerId,
      name: claim.name,
      center: claim.center,
      radius: this.config.territoryRadius,
      warningRadius: this.config.warningRadius,
      createdAt: Date.now(),
      lastVisited: Date.now(),
      visitCount: 1,
      icon: '🏠',
    };

    // Add to player's territories
    const playerTerritories = this.territories.get(claim.playerId) || [];
    playerTerritories.push(territory);
    this.territories.set(claim.playerId, playerTerritories);

    // Remove claim progress
    this.claimProgress.delete(claimId);

    // Emit event
    this.emit('territoryClaimed', {
      playerId: claim.playerId,
      territory,
    });

    return {
      status: 'complete',
      territory,
    };
  }

  /**
   * Cancel a claim in progress
   */
  cancelClaim(claimId) {
    this.claimProgress.delete(claimId);
  }

  /**
   * Check if a player is in their territory
   */
  isInTerritory(playerId, location) {
    const playerTerritories = this.territories.get(playerId) || [];

    for (const territory of playerTerritories) {
      const distance = getDistance(
        location.lat,
        location.lng,
        territory.center.lat,
        territory.center.lng
      );

      if (distance <= territory.radius) {
        return {
          inTerritory: true,
          territory,
          distance,
        };
      }
    }

    return { inTerritory: false };
  }

  /**
   * Check if IT is approaching any of a player's territories
   * Returns early warning info
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
          severity:
            distance <= territory.radius
              ? 'critical'
              : distance <= territory.radius * 1.5
                ? 'high'
                : 'medium',
        });
      }
    }

    return warnings;
  }

  /**
   * Get all territories for a player
   */
  getPlayerTerritories(playerId) {
    return this.territories.get(playerId) || [];
  }

  /**
   * Get all territories (for map display)
   */
  getAllTerritories() {
    const all = [];
    for (const [playerId, territories] of this.territories) {
      for (const territory of territories) {
        all.push({ ...territory, playerId });
      }
    }
    return all;
  }

  /**
   * Get territories near a location (for any player)
   */
  getTerritoriesNear(location, radius = 500) {
    const nearby = [];

    for (const [playerId, territories] of this.territories) {
      for (const territory of territories) {
        const distance = getDistance(
          location.lat,
          location.lng,
          territory.center.lat,
          territory.center.lng
        );

        if (distance <= radius) {
          nearby.push({ ...territory, playerId, distance });
        }
      }
    }

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Record a visit to territory (extends decay)
   */
  visitTerritory(territoryId, playerId) {
    const playerTerritories = this.territories.get(playerId);
    if (!playerTerritories) return;

    const territory = playerTerritories.find((t) => t.id === territoryId);
    if (territory) {
      territory.lastVisited = Date.now();
      territory.visitCount++;
    }
  }

  /**
   * Remove a territory
   */
  removeTerritory(territoryId, playerId) {
    const playerTerritories = this.territories.get(playerId);
    if (!playerTerritories) return false;

    const index = playerTerritories.findIndex((t) => t.id === territoryId);
    if (index === -1) return false;

    playerTerritories.splice(index, 1);
    this.territories.set(playerId, playerTerritories);

    this.emit('territoryRemoved', { playerId, territoryId });
    return true;
  }

  /**
   * Rename a territory
   */
  renameTerritory(territoryId, playerId, newName) {
    const playerTerritories = this.territories.get(playerId);
    if (!playerTerritories) return false;

    const territory = playerTerritories.find((t) => t.id === territoryId);
    if (territory) {
      territory.name = newName;
      return true;
    }
    return false;
  }

  /**
   * Set territory icon
   */
  setTerritoryIcon(territoryId, playerId, icon) {
    const playerTerritories = this.territories.get(playerId);
    if (!playerTerritories) return false;

    const territory = playerTerritories.find((t) => t.id === territoryId);
    if (territory) {
      territory.icon = icon;
      return true;
    }
    return false;
  }

  /**
   * Check for connected territories (corridors)
   */
  getConnectedTerritories(playerId) {
    const playerTerritories = this.territories.get(playerId) || [];
    if (playerTerritories.length < 2) return [];

    const connections = [];
    const connectionDistance = this.config.territoryRadius * 3;

    for (let i = 0; i < playerTerritories.length; i++) {
      for (let j = i + 1; j < playerTerritories.length; j++) {
        const distance = getDistance(
          playerTerritories[i].center.lat,
          playerTerritories[i].center.lng,
          playerTerritories[j].center.lat,
          playerTerritories[j].center.lng
        );

        if (distance <= connectionDistance) {
          connections.push({
            from: playerTerritories[i],
            to: playerTerritories[j],
            distance,
          });
        }
      }
    }

    return connections;
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
   * Clean up decayed territories
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [playerId, territories] of this.territories) {
        const active = territories.filter(
          (t) => now - t.lastVisited < this.config.decayTime
        );

        if (active.length !== territories.length) {
          this.territories.set(playerId, active);

          const removed = territories.length - active.length;
          this.emit('territoriesDecayed', { playerId, count: removed });
        }
      }
    }, 3600000); // Check every hour
  }

  /**
   * Export territories for persistence
   */
  exportTerritories(playerId) {
    return this.territories.get(playerId) || [];
  }

  /**
   * Import territories from persistence
   */
  importTerritories(playerId, territories) {
    this.territories.set(playerId, territories);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.territories.clear();
    this.claimProgress.clear();
    this.listeners.clear();
  }
}

export const territoryService = new TerritoryService();
export default territoryService;
