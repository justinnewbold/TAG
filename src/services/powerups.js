// Power-ups System
// Defines available power-ups and their effects

export const POWERUPS = {
  speedBoost: {
    id: 'speedBoost',
    name: 'Speed Boost',
    description: 'Move faster for 30 seconds (visual effect only)',
    icon: '⚡',
    color: '#fbbf24',
    duration: 30000, // 30 seconds
    cooldown: 120000, // 2 minutes
    effect: 'speed',
    stackable: false,
    rarity: 'common',
  },
  invisibility: {
    id: 'invisibility',
    name: 'Ghost Mode',
    description: 'Hide from the map for 20 seconds',
    icon: '👻',
    color: '#a855f7',
    duration: 20000, // 20 seconds
    cooldown: 180000, // 3 minutes
    effect: 'invisible',
    stackable: false,
    rarity: 'rare',
  },
  decoy: {
    id: 'decoy',
    name: 'Decoy',
    description: 'Create a fake position on the map for 45 seconds',
    icon: '🎭',
    color: '#ec4899',
    duration: 45000, // 45 seconds
    cooldown: 150000, // 2.5 minutes
    effect: 'decoy',
    stackable: true,
    maxStacks: 2,
    rarity: 'uncommon',
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    description: 'Block one tag attempt',
    icon: '🛡️',
    color: '#22c55e',
    duration: 60000, // 1 minute or until used
    cooldown: 240000, // 4 minutes
    effect: 'shield',
    stackable: false,
    rarity: 'rare',
  },
  radar: {
    id: 'radar',
    name: 'Radar Pulse',
    description: 'Reveal all players for 10 seconds',
    icon: '📡',
    color: '#06b6d4',
    duration: 10000, // 10 seconds
    cooldown: 120000, // 2 minutes
    effect: 'radar',
    stackable: false,
    rarity: 'uncommon',
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze Ray',
    description: 'Slow down the nearest player for 15 seconds',
    icon: '❄️',
    color: '#60a5fa',
    duration: 15000, // 15 seconds
    cooldown: 180000, // 3 minutes
    effect: 'freeze',
    stackable: false,
    rarity: 'rare',
  },
  teleport: {
    id: 'teleport',
    name: 'Emergency Teleport',
    description: 'Instantly move to a random location within 100m',
    icon: '🌀',
    color: '#f97316',
    duration: 0, // Instant
    cooldown: 300000, // 5 minutes
    effect: 'teleport',
    stackable: false,
    rarity: 'legendary',
  },
  tagExtend: {
    id: 'tagExtend',
    name: 'Long Arm',
    description: 'Double your tag radius for 45 seconds',
    icon: '🦾',
    color: '#ef4444',
    duration: 45000, // 45 seconds
    cooldown: 180000, // 3 minutes
    effect: 'tagExtend',
    stackable: false,
    rarity: 'uncommon',
  },
};

// Power-up drops configuration
export const POWERUP_CONFIG = {
  dropRate: 0.1, // 10% chance per minute
  maxActiveDrops: 3,
  pickupRadius: 15, // meters
  despawnTime: 120000, // 2 minutes
  enabledByDefault: false,
};

// Rarity weights for random drops
export const RARITY_WEIGHTS = {
  common: 0.4,
  uncommon: 0.35,
  rare: 0.2,
  legendary: 0.05,
};

// Get a random power-up based on rarity
export const getRandomPowerup = () => {
  const rand = Math.random();
  let cumulative = 0;
  let selectedRarity = 'common';

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (rand <= cumulative) {
      selectedRarity = rarity;
      break;
    }
  }

  const powerupsOfRarity = Object.values(POWERUPS).filter(p => p.rarity === selectedRarity);
  return powerupsOfRarity[Math.floor(Math.random() * powerupsOfRarity.length)];
};

// Format duration for display
export const formatPowerupDuration = (ms) => {
  if (ms === 0) return 'Instant';
  if (ms < 60000) return `${ms / 1000}s`;
  return `${ms / 60000}m`;
};

// Power-up manager class
export class PowerupManager {
  constructor() {
    this.inventory = [];
    this.activeEffects = [];
    this.cooldowns = {};
    this.onEffectStart = null;
    this.onEffectEnd = null;
  }

  // Add power-up to inventory
  addToInventory(powerupId) {
    const powerup = POWERUPS[powerupId];
    if (!powerup) return false;

    if (powerup.stackable) {
      const existing = this.inventory.filter(p => p.id === powerupId);
      if (existing.length >= (powerup.maxStacks || 1)) {
        return false; // Max stacks reached
      }
    } else if (this.inventory.some(p => p.id === powerupId)) {
      return false; // Already have non-stackable
    }

    this.inventory.push({
      ...powerup,
      acquiredAt: Date.now(),
      instanceId: `${powerupId}_${Date.now()}`,
    });
    return true;
  }

  // Use a power-up
  usePowerup(powerupId) {
    const index = this.inventory.findIndex(p => p.id === powerupId);
    if (index === -1) return { success: false, reason: 'Not in inventory' };

    const powerup = this.inventory[index];

    // Check cooldown
    if (this.cooldowns[powerupId] && Date.now() < this.cooldowns[powerupId]) {
      const remaining = Math.ceil((this.cooldowns[powerupId] - Date.now()) / 1000);
      return { success: false, reason: `On cooldown (${remaining}s)` };
    }

    // Remove from inventory
    this.inventory.splice(index, 1);

    // Set cooldown
    this.cooldowns[powerupId] = Date.now() + powerup.cooldown;

    // Apply effect
    if (powerup.duration > 0) {
      const effect = {
        ...powerup,
        startedAt: Date.now(),
        expiresAt: Date.now() + powerup.duration,
      };
      this.activeEffects.push(effect);

      // Set timer to remove effect
      setTimeout(() => {
        this.removeEffect(effect.instanceId);
      }, powerup.duration);

      if (this.onEffectStart) {
        this.onEffectStart(effect);
      }
    }

    return {
      success: true,
      effect: powerup.effect,
      duration: powerup.duration,
    };
  }

  // Remove an active effect
  removeEffect(instanceId) {
    const index = this.activeEffects.findIndex(e => e.instanceId === instanceId);
    if (index !== -1) {
      const effect = this.activeEffects[index];
      this.activeEffects.splice(index, 1);
      if (this.onEffectEnd) {
        this.onEffectEnd(effect);
      }
    }
  }

  // Check if a specific effect is active
  hasEffect(effectType) {
    return this.activeEffects.some(e => e.effect === effectType && Date.now() < e.expiresAt);
  }

  // Get remaining time for an effect
  getEffectTimeRemaining(effectType) {
    const effect = this.activeEffects.find(e => e.effect === effectType);
    if (!effect) return 0;
    return Math.max(0, effect.expiresAt - Date.now());
  }

  // Get cooldown remaining for a power-up
  getCooldownRemaining(powerupId) {
    if (!this.cooldowns[powerupId]) return 0;
    return Math.max(0, this.cooldowns[powerupId] - Date.now());
  }

  // Clean up expired effects
  cleanupExpired() {
    const now = Date.now();
    this.activeEffects = this.activeEffects.filter(e => e.expiresAt > now);
  }

  // Get inventory summary
  getInventorySummary() {
    const summary = {};
    for (const powerup of this.inventory) {
      if (!summary[powerup.id]) {
        summary[powerup.id] = { count: 0, powerup };
      }
      summary[powerup.id].count++;
    }
    return summary;
  }

  // Serialize for storage
  serialize() {
    return {
      inventory: this.inventory,
      activeEffects: this.activeEffects,
      cooldowns: this.cooldowns,
    };
  }

  // Deserialize from storage
  deserialize(data) {
    if (data.inventory) this.inventory = data.inventory;
    if (data.activeEffects) this.activeEffects = data.activeEffects;
    if (data.cooldowns) this.cooldowns = data.cooldowns;
    this.cleanupExpired();
  }
}

// Singleton instance
export const powerupManager = new PowerupManager();
