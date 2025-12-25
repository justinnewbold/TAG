/**
 * PowerupManager - Handles power-up spawning and collection
 * Spawns power-ups on the map that players can collect
 */

import { POWERUP_TYPES } from '../../shared/constants.js';

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Spawn configuration
const SPAWN_CONFIG = {
  minSpawnInterval: 30000,    // 30 seconds minimum between spawns
  maxSpawnInterval: 120000,   // 2 minutes maximum
  maxPowerupsPerGame: 5,      // Max powerups on map at once
  powerupLifetime: 180000,    // 3 minutes before despawn
  spawnRadius: 200,           // Spawn within 200m of game center
};

// Rarity weights for random selection
const RARITY_WEIGHTS = {
  common: 40,
  uncommon: 30,
  rare: 20,
  epic: 10,
};

export class PowerupManager {
  constructor() {
    this.powerups = new Map();      // gameId -> powerup[]
    this.spawnTimers = new Map();   // gameId -> timer
    this.io = null;
  }

  // Set socket.io instance
  setIO(io) {
    this.io = io;
  }

  // Start spawning for a game
  startSpawning(game) {
    if (!game?.id || !game.settings?.enablePowerups) return;
    
    // Initialize powerup array for this game
    this.powerups.set(game.id, []);
    
    // Schedule first spawn
    this.scheduleNextSpawn(game);
    
    console.log(`[PowerupManager] Started spawning for game ${game.id}`);
  }

  // Stop spawning for a game
  stopSpawning(gameId) {
    const timer = this.spawnTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.spawnTimers.delete(gameId);
    }
    this.powerups.delete(gameId);
    console.log(`[PowerupManager] Stopped spawning for game ${gameId}`);
  }

  // Schedule next spawn
  scheduleNextSpawn(game) {
    const delay = SPAWN_CONFIG.minSpawnInterval + 
      Math.random() * (SPAWN_CONFIG.maxSpawnInterval - SPAWN_CONFIG.minSpawnInterval);
    
    const timer = setTimeout(() => {
      this.spawnPowerup(game);
      this.scheduleNextSpawn(game);
    }, delay);
    
    this.spawnTimers.set(game.id, timer);
  }

  // Spawn a powerup at random location
  spawnPowerup(game) {
    const gamePowerups = this.powerups.get(game.id) || [];
    
    // Don't spawn if at max
    if (gamePowerups.length >= SPAWN_CONFIG.maxPowerupsPerGame) return;
    
    // Get game center from active players
    const activePlayers = game.players.filter(p => p.location && p.status === 'active');
    if (activePlayers.length === 0) return;
    
    // Calculate center of all players
    const center = activePlayers.reduce((acc, p) => ({
      lat: acc.lat + p.location.lat / activePlayers.length,
      lng: acc.lng + p.location.lng / activePlayers.length,
    }), { lat: 0, lng: 0 });
    
    // Random offset within spawn radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * SPAWN_CONFIG.spawnRadius;
    const offsetLat = (distance / 111000) * Math.cos(angle);
    const offsetLng = (distance / (111000 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    
    // Select random powerup type based on rarity
    const type = this.selectRandomPowerupType();
    
    const powerup = {
      id: generateId(),
      type,
      lat: center.lat + offsetLat,
      lng: center.lng + offsetLng,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + SPAWN_CONFIG.powerupLifetime,
    };
    
    gamePowerups.push(powerup);
    this.powerups.set(game.id, gamePowerups);
    
    // Emit to all players in game
    if (this.io) {
      this.io.to(`game:${game.id}`).emit('powerup:spawned', { powerup });
    }
    
    // Schedule despawn
    setTimeout(() => {
      this.despawnPowerup(game.id, powerup.id);
    }, SPAWN_CONFIG.powerupLifetime);
    
    console.log(`[PowerupManager] Spawned ${type} powerup at (${powerup.lat.toFixed(5)}, ${powerup.lng.toFixed(5)})`);
  }

  // Select random powerup type based on rarity weights
  selectRandomPowerupType() {
    const types = Object.entries(POWERUP_TYPES);
    const totalWeight = types.reduce((sum, [_, p]) => sum + (RARITY_WEIGHTS[p.rarity] || 10), 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, powerup] of types) {
      random -= RARITY_WEIGHTS[powerup.rarity] || 10;
      if (random <= 0) {
        return powerup.id;
      }
    }
    
    return types[0][1].id; // fallback
  }

  // Despawn a powerup
  despawnPowerup(gameId, powerupId) {
    const gamePowerups = this.powerups.get(gameId) || [];
    const filtered = gamePowerups.filter(p => p.id !== powerupId);
    this.powerups.set(gameId, filtered);
    
    // Emit despawn event
    if (this.io) {
      this.io.to(`game:${gameId}`).emit('powerup:despawned', { powerupId });
    }
  }

  // Handle player collecting a powerup
  collectPowerup(gameId, playerId, powerupId) {
    const gamePowerups = this.powerups.get(gameId) || [];
    const powerup = gamePowerups.find(p => p.id === powerupId);
    
    if (!powerup) {
      return { success: false, error: 'Powerup not found or already collected' };
    }
    
    // Remove from map
    const filtered = gamePowerups.filter(p => p.id !== powerupId);
    this.powerups.set(gameId, filtered);
    
    // Emit collection event
    if (this.io) {
      this.io.to(`game:${gameId}`).emit('powerup:collected', { 
        powerupId, 
        playerId,
        type: powerup.type,
      });
    }
    
    console.log(`[PowerupManager] Player ${playerId} collected ${powerup.type}`);
    
    return { 
      success: true, 
      powerup: {
        ...powerup,
        ...POWERUP_TYPES[powerup.type.toUpperCase()],
      }
    };
  }

  // Get all powerups for a game
  getPowerups(gameId) {
    return this.powerups.get(gameId) || [];
  }

  // Sync powerups to a specific socket
  syncPowerups(socket, gameId) {
    const powerups = this.getPowerups(gameId);
    socket.emit('powerups:sync', { powerups });
  }
}

// Singleton instance
export const powerupManager = new PowerupManager();
