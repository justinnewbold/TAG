/**
 * Power-ups Backend Validation Service
 * Server-side validation for power-up usage and effects
 */

// Power-up definitions (must match client-side)
export const POWERUPS = {
  speed_boost: {
    id: 'speed_boost',
    name: 'Speed Boost',
    description: 'Move 50% faster for 10 seconds',
    duration: 10000,
    cooldown: 60000,
    stackable: false,
    effects: {
      speedMultiplier: 1.5
    }
  },
  invisibility: {
    id: 'invisibility',
    name: 'Invisibility',
    description: 'Become invisible on the map for 8 seconds',
    duration: 8000,
    cooldown: 90000,
    stackable: false,
    effects: {
      hideOnMap: true
    }
  },
  freeze_tag: {
    id: 'freeze_tag',
    name: 'Freeze Tag',
    description: 'Freeze the current IT for 5 seconds',
    duration: 5000,
    cooldown: 120000,
    stackable: false,
    effects: {
      freezeTarget: 'it'
    },
    requiresTarget: false
  },
  tag_shield: {
    id: 'tag_shield',
    name: 'Tag Shield',
    description: 'Become immune to tags for 6 seconds',
    duration: 6000,
    cooldown: 90000,
    stackable: false,
    effects: {
      tagImmune: true
    }
  },
  radar_pulse: {
    id: 'radar_pulse',
    name: 'Radar Pulse',
    description: 'Reveal all players on the map for 5 seconds',
    duration: 5000,
    cooldown: 45000,
    stackable: false,
    effects: {
      revealAll: true
    }
  },
  decoy: {
    id: 'decoy',
    name: 'Decoy',
    description: 'Place a fake marker on the map',
    duration: 15000,
    cooldown: 30000,
    stackable: true,
    maxStacks: 3,
    effects: {
      createDecoy: true
    }
  },
  tag_boost: {
    id: 'tag_boost',
    name: 'Tag Boost',
    description: 'Double tag radius for 8 seconds',
    duration: 8000,
    cooldown: 60000,
    stackable: false,
    effects: {
      tagRadiusMultiplier: 2
    }
  },
  teleport: {
    id: 'teleport',
    name: 'Teleport',
    description: 'Teleport to a random safe location',
    duration: 0,
    cooldown: 180000,
    stackable: false,
    effects: {
      teleport: true
    }
  }
};

export class PowerupService {
  constructor() {
    // Track active power-ups per player: Map<playerId, Map<powerupId, {activatedAt, expiresAt}>>
    this.activePowerups = new Map();
    // Track cooldowns per player: Map<playerId, Map<powerupId, expiresAt>>
    this.cooldowns = new Map();
    // Track player inventories: Map<playerId, Map<powerupId, count>>
    this.inventories = new Map();
  }

  // Initialize player power-up state
  initPlayer(playerId) {
    if (!this.activePowerups.has(playerId)) {
      this.activePowerups.set(playerId, new Map());
    }
    if (!this.cooldowns.has(playerId)) {
      this.cooldowns.set(playerId, new Map());
    }
    if (!this.inventories.has(playerId)) {
      this.inventories.set(playerId, new Map());
    }
  }

  // Grant a power-up to player
  grantPowerup(playerId, powerupId) {
    const powerup = POWERUPS[powerupId];
    if (!powerup) {
      return { success: false, error: 'Invalid power-up' };
    }

    this.initPlayer(playerId);
    const inventory = this.inventories.get(playerId);
    
    const currentCount = inventory.get(powerupId) || 0;
    const maxCount = powerup.maxStacks || 1;
    
    if (currentCount >= maxCount && !powerup.stackable) {
      return { success: false, error: 'Already have max of this power-up' };
    }

    inventory.set(powerupId, Math.min(currentCount + 1, maxCount));
    
    return { 
      success: true, 
      inventory: Object.fromEntries(inventory),
      count: inventory.get(powerupId)
    };
  }

  // Validate and activate a power-up
  activatePowerup(playerId, powerupId, gameState = {}) {
    const powerup = POWERUPS[powerupId];
    if (!powerup) {
      return { success: false, error: 'Invalid power-up' };
    }

    this.initPlayer(playerId);
    const inventory = this.inventories.get(playerId);
    const cooldowns = this.cooldowns.get(playerId);
    const active = this.activePowerups.get(playerId);
    const now = Date.now();

    // Check inventory
    const count = inventory.get(powerupId) || 0;
    if (count <= 0) {
      return { success: false, error: 'Power-up not in inventory' };
    }

    // Check cooldown
    const cooldownEnd = cooldowns.get(powerupId);
    if (cooldownEnd && now < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - now) / 1000);
      return { success: false, error: `On cooldown for ${remaining}s` };
    }

    // Check if already active (non-stackable)
    if (!powerup.stackable && active.has(powerupId)) {
      const existing = active.get(powerupId);
      if (now < existing.expiresAt) {
        return { success: false, error: 'Power-up already active' };
      }
    }

    // Validate game-specific requirements
    const validation = this.validateGameContext(powerupId, playerId, gameState);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Consume from inventory
    inventory.set(powerupId, count - 1);
    if (inventory.get(powerupId) <= 0) {
      inventory.delete(powerupId);
    }

    // Set cooldown
    cooldowns.set(powerupId, now + powerup.cooldown);

    // Activate power-up
    const expiresAt = powerup.duration > 0 ? now + powerup.duration : now;
    active.set(powerupId, {
      activatedAt: now,
      expiresAt,
      effects: powerup.effects
    });

    // Schedule deactivation
    if (powerup.duration > 0) {
      setTimeout(() => {
        this.deactivatePowerup(playerId, powerupId);
      }, powerup.duration);
    }

    return {
      success: true,
      powerup: powerupId,
      effects: powerup.effects,
      duration: powerup.duration,
      expiresAt
    };
  }

  // Validate power-up can be used in current game context
  validateGameContext(powerupId, playerId, gameState) {
    const powerup = POWERUPS[powerupId];
    
    // Game-specific validations
    if (gameState.status !== 'active') {
      return { valid: false, error: 'Game is not active' };
    }

    // Freeze Tag can only be used by non-IT players
    if (powerupId === 'freeze_tag') {
      const player = gameState.players?.find(p => p.id === playerId);
      if (player?.isIt) {
        return { valid: false, error: 'IT cannot use Freeze Tag' };
      }
    }

    // Tag Boost only useful for IT
    if (powerupId === 'tag_boost') {
      const player = gameState.players?.find(p => p.id === playerId);
      if (!player?.isIt) {
        return { valid: false, error: 'Only IT can use Tag Boost' };
      }
    }

    return { valid: true };
  }

  // Deactivate a power-up
  deactivatePowerup(playerId, powerupId) {
    const active = this.activePowerups.get(playerId);
    if (active) {
      active.delete(powerupId);
    }
    return { success: true };
  }

  // Get player's active effects
  getActiveEffects(playerId) {
    const active = this.activePowerups.get(playerId);
    if (!active) return {};

    const now = Date.now();
    const effects = {};

    for (const [powerupId, data] of active.entries()) {
      if (now < data.expiresAt) {
        Object.assign(effects, data.effects);
        effects[`_${powerupId}_remaining`] = data.expiresAt - now;
      } else {
        active.delete(powerupId);
      }
    }

    return effects;
  }

  // Check if player has specific effect active
  hasEffect(playerId, effectName) {
    const effects = this.getActiveEffects(playerId);
    return !!effects[effectName];
  }

  // Get modified tag radius for player
  getEffectiveTagRadius(playerId, baseRadius) {
    const effects = this.getActiveEffects(playerId);
    const multiplier = effects.tagRadiusMultiplier || 1;
    return baseRadius * multiplier;
  }

  // Check if player is visible on map
  isPlayerVisible(playerId) {
    const effects = this.getActiveEffects(playerId);
    return !effects.hideOnMap;
  }

  // Check if player can be tagged
  canBeTagged(playerId) {
    const effects = this.getActiveEffects(playerId);
    return !effects.tagImmune;
  }

  // Check if player is frozen
  isFrozen(playerId) {
    const effects = this.getActiveEffects(playerId);
    return !!effects.frozen;
  }

  // Apply freeze effect to player
  freezePlayer(playerId, duration = 5000) {
    this.initPlayer(playerId);
    const active = this.activePowerups.get(playerId);
    const now = Date.now();
    
    active.set('_freeze', {
      activatedAt: now,
      expiresAt: now + duration,
      effects: { frozen: true }
    });

    setTimeout(() => {
      active.delete('_freeze');
    }, duration);
  }

  // Get player inventory
  getInventory(playerId) {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return {};
    return Object.fromEntries(inventory);
  }

  // Get cooldowns
  getCooldowns(playerId) {
    const cooldowns = this.cooldowns.get(playerId);
    if (!cooldowns) return {};
    
    const now = Date.now();
    const result = {};
    
    for (const [powerupId, expiresAt] of cooldowns.entries()) {
      if (expiresAt > now) {
        result[powerupId] = expiresAt - now;
      }
    }
    
    return result;
  }

  // Clean up player data when they leave
  cleanupPlayer(playerId) {
    this.activePowerups.delete(playerId);
    this.cooldowns.delete(playerId);
    this.inventories.delete(playerId);
  }

  // Reset all power-ups for a game
  resetGame(playerIds) {
    for (const playerId of playerIds) {
      this.cleanupPlayer(playerId);
    }
  }
}

// Singleton instance
export const powerupService = new PowerupService();
