/**
 * Momentum System Service
 *
 * The more you move, the more "momentum" you build:
 * - High momentum = Faster GPS updates for you (advantage)
 * - Low momentum (stationary) = You're easier to pinpoint
 * - Encourages healthy movement without punishing rest
 *
 * Simple meter that fills as you walk/run.
 */

import { getDistance } from '../../shared/utils.js';

class MomentumService {
  constructor() {
    // Player momentum data: { playerId: MomentumData }
    this.playerMomentum = new Map();

    // Configuration
    this.config = {
      // Momentum thresholds
      maxMomentum: 100,
      minMomentum: 0,

      // Momentum gain rates
      meterPerMeter: 0.5, // Gain 0.5 momentum per meter traveled
      bonusForSpeed: 2, // Multiplier for moving fast (running vs walking)
      speedThreshold: 2, // m/s to be considered "running"

      // Momentum decay
      decayRate: 1, // Lose 1 momentum per minute when stationary
      decayInterval: 60000, // Check decay every minute
      stationaryThreshold: 10, // Meters - below this is "stationary"

      // Tiers and their bonuses
      tiers: [
        {
          name: 'Stationary',
          minMomentum: 0,
          maxMomentum: 10,
          gpsUpdateMultiplier: 1.5, // Updates 50% MORE visible (bad)
          color: '#EF4444', // red
          icon: '🐢',
        },
        {
          name: 'Moving',
          minMomentum: 10,
          maxMomentum: 30,
          gpsUpdateMultiplier: 1.0, // Normal
          color: '#F59E0B', // amber
          icon: '🚶',
        },
        {
          name: 'Active',
          minMomentum: 30,
          maxMomentum: 60,
          gpsUpdateMultiplier: 0.8, // 20% less visible
          color: '#10B981', // green
          icon: '🏃',
        },
        {
          name: 'Charged',
          minMomentum: 60,
          maxMomentum: 85,
          gpsUpdateMultiplier: 0.6, // 40% less visible
          color: '#3B82F6', // blue
          icon: '⚡',
        },
        {
          name: 'Overdrive',
          minMomentum: 85,
          maxMomentum: 100,
          gpsUpdateMultiplier: 0.4, // 60% less visible - hard to track!
          color: '#8B5CF6', // purple
          icon: '🚀',
        },
      ],

      // Streak bonuses
      streakBonusThreshold: 300000, // 5 minutes of continuous movement
      streakBonus: 1.2, // 20% more momentum gain while on streak
    };

    // Decay interval
    this.decayInterval = setInterval(() => this.applyDecay(), this.config.decayInterval);

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Initialize momentum tracking for a player
   */
  initPlayer(playerId, initialLocation = null) {
    this.playerMomentum.set(playerId, {
      playerId,
      momentum: 20, // Start with some momentum
      lastLocation: initialLocation,
      lastUpdateTime: Date.now(),
      totalDistance: 0,
      currentSpeed: 0,
      streakStart: null,
      isOnStreak: false,
      tier: this.config.tiers[1], // Start at "Moving"
      history: [],
    });
  }

  /**
   * Update momentum based on location change
   */
  updateLocation(playerId, newLocation) {
    let data = this.playerMomentum.get(playerId);
    if (!data) {
      this.initPlayer(playerId, newLocation);
      data = this.playerMomentum.get(playerId);
    }

    const now = Date.now();
    const timeDelta = (now - data.lastUpdateTime) / 1000; // seconds

    if (data.lastLocation && timeDelta > 0) {
      // Calculate distance traveled
      const distance = getDistance(
        data.lastLocation.lat,
        data.lastLocation.lng,
        newLocation.lat,
        newLocation.lng
      );

      // Calculate speed
      const speed = distance / timeDelta;
      data.currentSpeed = speed;

      // Determine momentum gain
      let momentumGain = distance * this.config.meterPerMeter;

      // Speed bonus for running
      if (speed > this.config.speedThreshold) {
        momentumGain *= this.config.bonusForSpeed;
      }

      // Streak bonus
      if (data.isOnStreak) {
        momentumGain *= this.config.streakBonus;
      }

      // Update momentum
      const oldMomentum = data.momentum;
      data.momentum = Math.min(
        this.config.maxMomentum,
        data.momentum + momentumGain
      );
      data.totalDistance += distance;

      // Check/update streak
      if (distance >= this.config.stationaryThreshold) {
        if (!data.streakStart) {
          data.streakStart = now;
        } else if (
          now - data.streakStart >= this.config.streakBonusThreshold &&
          !data.isOnStreak
        ) {
          data.isOnStreak = true;
          this.emit('streakStarted', { playerId, momentum: data.momentum });
        }
      } else {
        // Stationary - reset streak
        if (data.isOnStreak) {
          this.emit('streakEnded', { playerId, duration: now - data.streakStart });
        }
        data.streakStart = null;
        data.isOnStreak = false;
      }

      // Update tier
      const newTier = this.getTierForMomentum(data.momentum);
      if (newTier.name !== data.tier.name) {
        const oldTier = data.tier;
        data.tier = newTier;
        this.emit('tierChanged', {
          playerId,
          oldTier,
          newTier,
          momentum: data.momentum,
        });
      }

      // Record history point
      data.history.push({
        timestamp: now,
        momentum: data.momentum,
        speed,
        distance,
      });

      // Keep history limited
      if (data.history.length > 60) {
        data.history.shift();
      }

      // Emit momentum change if significant
      if (Math.abs(data.momentum - oldMomentum) > 1) {
        this.emit('momentumChanged', {
          playerId,
          momentum: data.momentum,
          tier: data.tier,
          speed,
        });
      }
    }

    data.lastLocation = newLocation;
    data.lastUpdateTime = now;

    return this.getMomentumStatus(playerId);
  }

  /**
   * Apply decay to stationary players
   */
  applyDecay() {
    const now = Date.now();

    for (const [playerId, data] of this.playerMomentum) {
      const timeSinceUpdate = now - data.lastUpdateTime;

      // If no update in a while, apply decay
      if (timeSinceUpdate > this.config.decayInterval / 2) {
        const decayAmount =
          this.config.decayRate * (timeSinceUpdate / this.config.decayInterval);
        const oldMomentum = data.momentum;

        data.momentum = Math.max(
          this.config.minMomentum,
          data.momentum - decayAmount
        );

        // Update tier if needed
        const newTier = this.getTierForMomentum(data.momentum);
        if (newTier.name !== data.tier.name) {
          data.tier = newTier;
          this.emit('tierChanged', {
            playerId,
            oldTier: data.tier,
            newTier,
            momentum: data.momentum,
            reason: 'decay',
          });
        }

        // Reset streak if decaying
        if (data.isOnStreak && oldMomentum - data.momentum > 5) {
          data.isOnStreak = false;
          data.streakStart = null;
        }
      }
    }
  }

  /**
   * Get tier for a momentum value
   */
  getTierForMomentum(momentum) {
    for (const tier of this.config.tiers) {
      if (momentum >= tier.minMomentum && momentum < tier.maxMomentum) {
        return tier;
      }
    }
    return this.config.tiers[this.config.tiers.length - 1];
  }

  /**
   * Get current momentum status for a player
   */
  getMomentumStatus(playerId) {
    const data = this.playerMomentum.get(playerId);
    if (!data) return null;

    return {
      momentum: Math.round(data.momentum),
      tier: data.tier,
      tierName: data.tier.name,
      tierIcon: data.tier.icon,
      tierColor: data.tier.color,
      gpsMultiplier: data.tier.gpsUpdateMultiplier,
      currentSpeed: data.currentSpeed,
      isOnStreak: data.isOnStreak,
      totalDistance: Math.round(data.totalDistance),
      percentToNextTier: this.getPercentToNextTier(data.momentum, data.tier),
    };
  }

  /**
   * Get percentage progress to next tier
   */
  getPercentToNextTier(momentum, currentTier) {
    const tierIndex = this.config.tiers.indexOf(currentTier);
    if (tierIndex === this.config.tiers.length - 1) {
      return 100; // Already at max tier
    }

    const tierRange = currentTier.maxMomentum - currentTier.minMomentum;
    const progress = momentum - currentTier.minMomentum;
    return Math.min(100, Math.round((progress / tierRange) * 100));
  }

  /**
   * Get GPS update interval modifier for a player
   * Lower = less frequent updates = harder to track
   */
  getGPSMultiplier(playerId) {
    const data = this.playerMomentum.get(playerId);
    if (!data) return 1.0;
    return data.tier.gpsUpdateMultiplier;
  }

  /**
   * Boost momentum (e.g., from power-up)
   */
  boostMomentum(playerId, amount) {
    const data = this.playerMomentum.get(playerId);
    if (!data) return;

    data.momentum = Math.min(this.config.maxMomentum, data.momentum + amount);
    data.tier = this.getTierForMomentum(data.momentum);

    this.emit('momentumBoosted', {
      playerId,
      amount,
      newMomentum: data.momentum,
    });
  }

  /**
   * Get movement history for charts/visualization
   */
  getMomentumHistory(playerId, duration = 300000) {
    const data = this.playerMomentum.get(playerId);
    if (!data) return [];

    const cutoff = Date.now() - duration;
    return data.history.filter((h) => h.timestamp > cutoff);
  }

  /**
   * Get leaderboard of player momentum
   */
  getMomentumLeaderboard() {
    const leaderboard = [];

    for (const [playerId, data] of this.playerMomentum) {
      leaderboard.push({
        playerId,
        momentum: Math.round(data.momentum),
        tier: data.tier.name,
        totalDistance: Math.round(data.totalDistance),
      });
    }

    return leaderboard.sort((a, b) => b.momentum - a.momentum);
  }

  /**
   * Reset player momentum (e.g., on game start)
   */
  resetPlayer(playerId) {
    this.playerMomentum.delete(playerId);
  }

  /**
   * Reset all momentum
   */
  resetAll() {
    this.playerMomentum.clear();
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
   * Destroy service
   */
  destroy() {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = null;
    }
    this.playerMomentum.clear();
    this.listeners.clear();
  }
}

export const momentumService = new MomentumService();
export default momentumService;
