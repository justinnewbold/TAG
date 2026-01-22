/**
 * Taunt & Ping Service
 *
 * One-tap actions to mess with other players:
 * - Taunt: Send a haptic "buzz" + sound to a player (limited uses)
 * - Decoy Ping: Make a fake "I'm here!" blip appear elsewhere
 * - SOS Ping: Alert allies you're being chased
 * Creates psychological gameplay without complexity.
 */

class TauntPingService {
  constructor() {
    // Cooldowns and usage tracking
    this.cooldowns = new Map(); // { `${playerId}_${actionType}`: timestamp }
    this.usageCount = new Map(); // { `${playerId}_${actionType}`: count }

    // Active decoys: [{ id, playerId, location, expiresAt }]
    this.activeDecoys = [];

    // SOS alerts: [{ id, playerId, location, timestamp }]
    this.activeSOSAlerts = [];

    // Configuration
    this.config = {
      taunt: {
        cooldown: 60000, // 1 minute between taunts
        maxPerGame: 10, // Max taunts per game
        range: 1000, // Max range to taunt (meters)
        vibrationPattern: [100, 50, 100, 50, 200], // Recipient vibration
      },
      decoy: {
        cooldown: 120000, // 2 minutes between decoys
        maxPerGame: 5,
        duration: 30000, // Decoy visible for 30 seconds
        maxDistance: 500, // Max distance from player for decoy placement
      },
      sos: {
        cooldown: 30000, // 30 seconds between SOS
        maxPerGame: 20,
        duration: 60000, // SOS visible for 1 minute
        alertRadius: 1000, // Radius to alert allies
      },
      poke: {
        cooldown: 30000, // 30 seconds
        maxPerGame: 15,
        range: 2000,
        vibrationPattern: [50, 50, 50],
      },
    };

    // Event listeners
    this.listeners = new Map();

    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  /**
   * Send a taunt to another player
   * Returns { success, error?, cooldownRemaining? }
   */
  sendTaunt(fromPlayerId, toPlayerId, options = {}) {
    const { message = null, type = 'standard' } = options;

    // Check cooldown
    const cooldownKey = `${fromPlayerId}_taunt`;
    const cooldownRemaining = this.checkCooldown(cooldownKey, this.config.taunt.cooldown);
    if (cooldownRemaining > 0) {
      return { success: false, error: 'On cooldown', cooldownRemaining };
    }

    // Check usage limit
    const usageKey = `${fromPlayerId}_taunt`;
    const usage = this.usageCount.get(usageKey) || 0;
    if (usage >= this.config.taunt.maxPerGame) {
      return { success: false, error: 'Maximum taunts reached for this game' };
    }

    // Create taunt event
    const taunt = {
      id: `taunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromPlayerId,
      toPlayerId,
      message,
      type,
      timestamp: Date.now(),
      vibrationPattern: this.config.taunt.vibrationPattern,
    };

    // Update cooldown and usage
    this.cooldowns.set(cooldownKey, Date.now());
    this.usageCount.set(usageKey, usage + 1);

    // Emit event
    this.emit('tauntSent', taunt);

    return { success: true, taunt };
  }

  /**
   * Create a decoy ping at a location
   */
  createDecoy(playerId, location, options = {}) {
    const { offset = null } = options;

    // Check cooldown
    const cooldownKey = `${playerId}_decoy`;
    const cooldownRemaining = this.checkCooldown(cooldownKey, this.config.decoy.cooldown);
    if (cooldownRemaining > 0) {
      return { success: false, error: 'On cooldown', cooldownRemaining };
    }

    // Check usage
    const usageKey = `${playerId}_decoy`;
    const usage = this.usageCount.get(usageKey) || 0;
    if (usage >= this.config.decoy.maxPerGame) {
      return { success: false, error: 'Maximum decoys used' };
    }

    // Calculate decoy location (either specified or random offset)
    let decoyLocation;
    if (offset) {
      decoyLocation = {
        lat: location.lat + offset.lat,
        lng: location.lng + offset.lng,
      };
    } else {
      // Random offset within maxDistance
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * this.config.decoy.maxDistance;
      const latOffset = (distance / 111000) * Math.cos(angle);
      const lngOffset =
        (distance / (111000 * Math.cos((location.lat * Math.PI) / 180))) *
        Math.sin(angle);
      decoyLocation = {
        lat: location.lat + latOffset,
        lng: location.lng + lngOffset,
      };
    }

    // Create decoy
    const decoy = {
      id: `decoy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      location: decoyLocation,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.decoy.duration,
    };

    this.activeDecoys.push(decoy);

    // Update cooldown and usage
    this.cooldowns.set(cooldownKey, Date.now());
    this.usageCount.set(usageKey, usage + 1);

    // Emit event
    this.emit('decoyCreated', decoy);

    return { success: true, decoy };
  }

  /**
   * Send SOS alert to nearby allies
   */
  sendSOS(playerId, location, options = {}) {
    const { message = 'Help! Being chased!' } = options;

    // Check cooldown
    const cooldownKey = `${playerId}_sos`;
    const cooldownRemaining = this.checkCooldown(cooldownKey, this.config.sos.cooldown);
    if (cooldownRemaining > 0) {
      return { success: false, error: 'On cooldown', cooldownRemaining };
    }

    // Create SOS alert
    const sos = {
      id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      location,
      message,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.sos.duration,
      alertRadius: this.config.sos.alertRadius,
    };

    this.activeSOSAlerts.push(sos);

    // Update cooldown
    this.cooldowns.set(cooldownKey, Date.now());

    // Emit event
    this.emit('sosSent', sos);

    return { success: true, sos };
  }

  /**
   * Send a friendly poke (lighter than taunt)
   */
  sendPoke(fromPlayerId, toPlayerId) {
    const cooldownKey = `${fromPlayerId}_poke`;
    const cooldownRemaining = this.checkCooldown(cooldownKey, this.config.poke.cooldown);
    if (cooldownRemaining > 0) {
      return { success: false, error: 'On cooldown', cooldownRemaining };
    }

    const usageKey = `${fromPlayerId}_poke`;
    const usage = this.usageCount.get(usageKey) || 0;
    if (usage >= this.config.poke.maxPerGame) {
      return { success: false, error: 'Maximum pokes reached' };
    }

    const poke = {
      id: `poke_${Date.now()}`,
      fromPlayerId,
      toPlayerId,
      timestamp: Date.now(),
      vibrationPattern: this.config.poke.vibrationPattern,
    };

    this.cooldowns.set(cooldownKey, Date.now());
    this.usageCount.set(usageKey, usage + 1);

    this.emit('pokeSent', poke);

    return { success: true, poke };
  }

  /**
   * Get active decoys (for map display)
   */
  getActiveDecoys() {
    const now = Date.now();
    return this.activeDecoys.filter((d) => d.expiresAt > now);
  }

  /**
   * Get decoys for a specific player (what IT sees)
   */
  getDecoysForPlayer(playerId) {
    return this.getActiveDecoys().filter((d) => d.playerId === playerId);
  }

  /**
   * Get active SOS alerts
   */
  getActiveSOSAlerts() {
    const now = Date.now();
    return this.activeSOSAlerts.filter((s) => s.expiresAt > now);
  }

  /**
   * Get SOS alerts near a location
   */
  getSOSAlertsNear(location, radius = null) {
    const alerts = this.getActiveSOSAlerts();
    const searchRadius = radius || this.config.sos.alertRadius;

    return alerts.filter((sos) => {
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        sos.location.lat,
        sos.location.lng
      );
      return distance <= searchRadius;
    });
  }

  /**
   * Check cooldown status
   */
  checkCooldown(key, cooldownTime) {
    const lastUse = this.cooldowns.get(key);
    if (!lastUse) return 0;

    const elapsed = Date.now() - lastUse;
    return Math.max(0, cooldownTime - elapsed);
  }

  /**
   * Get remaining uses for an action
   */
  getRemainingUses(playerId, actionType) {
    const usageKey = `${playerId}_${actionType}`;
    const usage = this.usageCount.get(usageKey) || 0;
    const max = this.config[actionType]?.maxPerGame || 0;
    return Math.max(0, max - usage);
  }

  /**
   * Get all action statuses for a player
   */
  getActionStatuses(playerId) {
    return {
      taunt: {
        cooldownRemaining: this.checkCooldown(
          `${playerId}_taunt`,
          this.config.taunt.cooldown
        ),
        remainingUses: this.getRemainingUses(playerId, 'taunt'),
        maxUses: this.config.taunt.maxPerGame,
      },
      decoy: {
        cooldownRemaining: this.checkCooldown(
          `${playerId}_decoy`,
          this.config.decoy.cooldown
        ),
        remainingUses: this.getRemainingUses(playerId, 'decoy'),
        maxUses: this.config.decoy.maxPerGame,
      },
      sos: {
        cooldownRemaining: this.checkCooldown(
          `${playerId}_sos`,
          this.config.sos.cooldown
        ),
        remainingUses: this.getRemainingUses(playerId, 'sos'),
        maxUses: this.config.sos.maxPerGame,
      },
      poke: {
        cooldownRemaining: this.checkCooldown(
          `${playerId}_poke`,
          this.config.poke.cooldown
        ),
        remainingUses: this.getRemainingUses(playerId, 'poke'),
        maxUses: this.config.poke.maxPerGame,
      },
    };
  }

  /**
   * Reset usage for new game
   */
  resetForNewGame(playerId) {
    const prefixes = [`${playerId}_taunt`, `${playerId}_decoy`, `${playerId}_sos`, `${playerId}_poke`];

    for (const prefix of prefixes) {
      this.usageCount.delete(prefix);
      this.cooldowns.delete(prefix);
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return (deg * Math.PI) / 180;
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
   * Cleanup expired items
   */
  cleanup() {
    const now = Date.now();

    this.activeDecoys = this.activeDecoys.filter((d) => d.expiresAt > now);
    this.activeSOSAlerts = this.activeSOSAlerts.filter((s) => s.expiresAt > now);
  }

  /**
   * Destroy service
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cooldowns.clear();
    this.usageCount.clear();
    this.activeDecoys = [];
    this.activeSOSAlerts = [];
    this.listeners.clear();
  }
}

export const tauntPingService = new TauntPingService();
export default tauntPingService;
