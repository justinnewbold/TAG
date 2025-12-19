import { v4 as uuidv4 } from 'uuid';
import { gameDb, userDb } from '../db/index.js';

// Generate 6-character game code
const generateGameCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Haversine formula for distance calculation
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if current time is in a no-tag period
const isInNoTagTime = (noTagTimes) => {
  if (!noTagTimes || noTagTimes.length === 0) return false;

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  return noTagTimes.some(rule => {
    if (!rule.days.includes(currentDay)) return false;

    const [startHour, startMin] = rule.startTime.split(':').map(Number);
    const [endHour, endMin] = rule.endTime.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;

    // Handle overnight times
    if (endMins < startMins) {
      return currentTime >= startMins || currentTime <= endMins;
    }

    return currentTime >= startMins && currentTime <= endMins;
  });
};

// Check if location is in a no-tag zone
const isInNoTagZone = (location, noTagZones) => {
  if (!location || !noTagZones || noTagZones.length === 0) return false;

  return noTagZones.some(zone => {
    const distance = getDistance(location.lat, location.lng, zone.lat, zone.lng);
    return distance <= zone.radius;
  });
};

export class GameManager {
  constructor() {
    // In-memory cache for active games (for real-time location data)
    this.activeGames = new Map(); // gameId -> game with live location data
    this.gamesByCode = new Map(); // gameCode -> gameId
    this.playerGames = new Map(); // playerId -> gameId

    // Load active games from database on startup
    this._loadActiveGames();
  }

  _loadActiveGames() {
    // This would load waiting/active games from DB
    // For now, we start fresh - games in progress would need reconnection
    console.log('GameManager initialized with database persistence');
  }

  _cacheGame(game) {
    this.activeGames.set(game.id, game);
    this.gamesByCode.set(game.code, game.id);
    game.players.forEach(p => {
      this.playerGames.set(p.id, game.id);
    });
  }

  _uncachePlayer(playerId) {
    this.playerGames.delete(playerId);
  }

  _uncacheGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (game) {
      this.gamesByCode.delete(game.code);
      game.players.forEach(p => this.playerGames.delete(p.id));
      this.activeGames.delete(gameId);
    }
  }

  async createGame(host, settings) {
    let gameCode;
    let attempts = 0;
    const maxAttempts = 100;

    // Ensure unique game code with iteration limit
    do {
      gameCode = generateGameCode();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique game code. Please try again.');
      }
      // Check cache first, then database
      const existingGame = await gameDb.getByCode(gameCode);
      if (!this.gamesByCode.has(gameCode) && !existingGame) {
        break;
      }
    } while (true);

    const gameId = uuidv4();
    const game = {
      id: gameId,
      code: gameCode,
      host: host.id,
      hostName: host.name,
      status: 'waiting',
      settings: {
        gpsInterval: settings.gpsInterval || 5 * 60 * 1000,
        tagRadius: settings.tagRadius || 20,
        duration: settings.duration || null,
        maxPlayers: settings.maxPlayers || 10,
        gameName: settings.gameName || `${host.name}'s Game`,
        noTagZones: settings.noTagZones || [],
        noTagTimes: settings.noTagTimes || [],
      },
      players: [{
        id: host.id,
        name: host.name,
        avatar: host.avatar,
        location: null,
        isIt: false,
        joinedAt: Date.now(),
        lastUpdate: null,
        tagCount: 0,
        survivalTime: 0,
        becameItAt: null,
      }],
      itPlayerId: null,
      startedAt: null,
      endedAt: null,
      tags: [],
      createdAt: Date.now(),
    };

    // Persist to database
    await gameDb.create(game);

    // Cache in memory
    this._cacheGame(game);

    return game;
  }

  async getGame(gameId) {
    // First check cache
    let game = this.activeGames.get(gameId);
    if (game) return game;

    // Then check database
    game = await gameDb.getById(gameId);
    if (game && (game.status === 'waiting' || game.status === 'active')) {
      this._cacheGame(game);
    }
    return game;
  }

  async getGameByCode(code) {
    const upperCode = code.toUpperCase();

    // First check cache
    const cachedId = this.gamesByCode.get(upperCode);
    if (cachedId) {
      return this.activeGames.get(cachedId);
    }

    // Then check database
    const game = await gameDb.getByCode(upperCode);
    if (game && (game.status === 'waiting' || game.status === 'active')) {
      this._cacheGame(game);
    }
    return game;
  }

  async getPlayerGame(playerId) {
    // First check cache
    const cachedId = this.playerGames.get(playerId);
    if (cachedId) {
      return this.activeGames.get(cachedId);
    }

    // Then check database
    const game = await gameDb.getActiveGameForPlayer(playerId);
    if (game) {
      this._cacheGame(game);
    }
    return game;
  }

  // Synchronous version for socket handlers (uses cache only)
  getPlayerGameSync(playerId) {
    const cachedId = this.playerGames.get(playerId);
    if (cachedId) {
      return this.activeGames.get(cachedId);
    }
    return null;
  }

  async joinGame(gameCode, player) {
    const game = await this.getGameByCode(gameCode);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game has already started' };
    }

    if (game.players.length >= game.settings.maxPlayers) {
      return { success: false, error: 'Game is full' };
    }

    // Check if player already in game
    if (game.players.some(p => p.id === player.id)) {
      return { success: true, game, alreadyJoined: true };
    }

    // Check if player is in another game
    const existingGame = await this.getPlayerGame(player.id);
    if (existingGame && existingGame.id !== game.id) {
      return { success: false, error: 'You are already in another game' };
    }

    const newPlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      location: null,
      isIt: false,
      joinedAt: Date.now(),
      lastUpdate: null,
      tagCount: 0,
      survivalTime: 0,
      becameItAt: null,
    };

    game.players.push(newPlayer);
    this.playerGames.set(player.id, game.id);

    // Persist to database
    await gameDb.addPlayer(game.id, newPlayer);

    return { success: true, game };
  }

  async leaveGame(playerId) {
    const game = await this.getPlayerGame(playerId);
    if (!game) {
      return { success: false, error: 'Not in a game' };
    }

    game.players = game.players.filter(p => p.id !== playerId);
    this._uncachePlayer(playerId);

    // Persist removal to database
    await gameDb.removePlayer(game.id, playerId);

    // If host leaves, assign new host or end game
    if (game.host === playerId && game.players.length > 0) {
      game.host = game.players[0].id;
      game.hostName = game.players[0].name;
      await gameDb.updateGame(game);
    }

    // If no players left, cleanup game
    if (game.players.length === 0) {
      this._uncacheGame(game.id);
      await gameDb.deleteGame(game.id);
    }

    return { success: true, game };
  }

  async startGame(gameId, hostId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game has already started' };
    }

    if (game.players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    // Randomly select IT player
    const itIndex = Math.floor(Math.random() * game.players.length);
    const itPlayerId = game.players[itIndex].id;

    game.status = 'active';
    game.itPlayerId = itPlayerId;
    game.startedAt = Date.now();
    game.players = game.players.map(p => ({
      ...p,
      isIt: p.id === itPlayerId,
      becameItAt: p.id === itPlayerId ? Date.now() : null,
    }));

    // Persist to database
    await gameDb.updateGame(game);
    await Promise.all(game.players.map(p => gameDb.updatePlayer(game.id, p)));

    return { success: true, game };
  }

  updatePlayerLocation(playerId, location) {
    // Use sync version - location updates are frequent and cache-only
    const game = this.getPlayerGameSync(playerId);
    if (!game) return null;

    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.location = location;
      player.lastUpdate = Date.now();
      // Location is transient, not persisted to DB (too frequent)
    }

    return game;
  }

  canTag(game, taggerLocation, targetLocation) {
    // Check no-tag times
    if (isInNoTagTime(game.settings.noTagTimes)) {
      return { allowed: false, reason: 'No-tag time period active' };
    }

    // Check if tagger is in no-tag zone
    if (isInNoTagZone(taggerLocation, game.settings.noTagZones)) {
      return { allowed: false, reason: 'You are in a safe zone' };
    }

    // Check if target is in no-tag zone
    if (isInNoTagZone(targetLocation, game.settings.noTagZones)) {
      return { allowed: false, reason: 'Target is in a safe zone' };
    }

    return { allowed: true };
  }

  async tagPlayer(gameId, taggerId, targetId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'active') {
      return { success: false, error: 'Game is not active' };
    }

    if (game.itPlayerId !== taggerId) {
      return { success: false, error: 'You are not IT' };
    }

    const tagger = game.players.find(p => p.id === taggerId);
    const target = game.players.find(p => p.id === targetId);

    if (!tagger || !target) {
      return { success: false, error: 'Player not found' };
    }

    if (!tagger.location || !target.location) {
      return { success: false, error: 'Location data unavailable' };
    }

    // Check distance
    const distance = getDistance(
      tagger.location.lat, tagger.location.lng,
      target.location.lat, target.location.lng
    );

    if (distance > game.settings.tagRadius) {
      return { success: false, error: 'Target is too far away', distance };
    }

    // Check no-tag rules
    const tagCheck = this.canTag(game, tagger.location, target.location);
    if (!tagCheck.allowed) {
      return { success: false, error: tagCheck.reason };
    }

    // Execute tag
    const now = Date.now();
    const tagTime = tagger.becameItAt ? now - tagger.becameItAt : null;

    const tag = {
      id: uuidv4(),
      taggerId,
      taggedId: targetId,
      timestamp: now,
      tagTime,
      location: { ...target.location },
    };

    game.tags.push(tag);
    game.itPlayerId = targetId;

    // Update player states
    game.players = game.players.map(p => {
      if (p.id === taggerId) {
        return { ...p, isIt: false, tagCount: (p.tagCount || 0) + 1, becameItAt: null };
      }
      if (p.id === targetId) {
        return { ...p, isIt: true, becameItAt: now };
      }
      return p;
    });

    // Persist to database
    await gameDb.updateGame(game);
    await gameDb.addTag(game.id, tag);
    await Promise.all(
      game.players
        .filter(p => p.id === taggerId || p.id === targetId)
        .map(p => gameDb.updatePlayer(game.id, p))
    );

    // Update user stats
    const taggerStats = await userDb.getById(taggerId);
    if (taggerStats) {
      await userDb.updateStats(taggerId, {
        totalTags: (taggerStats.stats.totalTags || 0) + 1,
        fastestTag: tagTime && (!taggerStats.stats.fastestTag || tagTime < taggerStats.stats.fastestTag)
          ? tagTime
          : taggerStats.stats.fastestTag,
      });
    }

    const targetStats = await userDb.getById(targetId);
    if (targetStats) {
      await userDb.updateStats(targetId, {
        timesTagged: (targetStats.stats.timesTagged || 0) + 1,
      });
    }

    return { success: true, game, tag, tagTime };
  }

  async endGame(gameId, hostId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can end the game' };
    }

    if (game.status !== 'active') {
      return { success: false, error: 'Game is not active' };
    }

    const now = Date.now();
    const gameTime = game.startedAt ? now - game.startedAt : 0;

    // Calculate final stats for each player
    // finalSurvivalTime = time the player spent NOT being IT
    const playerStats = game.players.map(p => {
      let survivalTime;
      if (p.isIt) {
        // Currently IT at game end - survival time is time before they became IT
        survivalTime = p.becameItAt ? p.becameItAt - game.startedAt : 0;
      } else if (p.becameItAt) {
        // Was IT at some point but passed it - survival = time before becoming IT
        survivalTime = p.becameItAt - game.startedAt;
      } else {
        // Never was IT - survived the whole game
        survivalTime = gameTime;
      }
      return { ...p, finalSurvivalTime: Math.max(0, survivalTime) };
    });

    // Winner is the non-IT player with longest survival
    const winner = playerStats
      .filter(p => !p.isIt)
      .sort((a, b) => b.finalSurvivalTime - a.finalSurvivalTime)[0];

    game.status = 'ended';
    game.endedAt = now;
    game.winnerId = winner?.id || null;
    game.winnerName = winner?.name || null;
    game.players = playerStats;
    game.gameDuration = gameTime;

    // Persist final state to database
    await gameDb.updateGame(game);
    await Promise.all(game.players.map(p => gameDb.updatePlayer(game.id, p)));

    // Update user stats for all players
    await Promise.all(game.players.map(async (p) => {
      const userStats = await userDb.getById(p.id);
      if (userStats) {
        const updates = {
          gamesPlayed: (userStats.stats.gamesPlayed || 0) + 1,
          totalPlayTime: (userStats.stats.totalPlayTime || 0) + gameTime,
        };

        if (p.id === game.winnerId) {
          updates.gamesWon = (userStats.stats.gamesWon || 0) + 1;
        }

        if (p.finalSurvivalTime > (userStats.stats.longestSurvival || 0)) {
          updates.longestSurvival = p.finalSurvivalTime;
        }

        await userDb.updateStats(p.id, updates);
      }
    }));

    // Cleanup from cache
    game.players.forEach(p => {
      this._uncachePlayer(p.id);
    });
    this._uncacheGame(game.id);

    return { success: true, game };
  }

  // Get game summary for ended games
  async getGameSummary(gameId) {
    const game = await gameDb.getById(gameId);
    if (!game || game.status !== 'ended') return null;

    return {
      id: game.id,
      code: game.code,
      gameName: game.settings.gameName,
      hostName: game.hostName,
      winnerId: game.winnerId,
      winnerName: game.winnerName,
      duration: game.gameDuration,
      totalTags: game.tags.length,
      playerCount: game.players.length,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        tagCount: p.tagCount,
        finalSurvivalTime: p.finalSurvivalTime,
        wasIt: p.isIt,
      })),
      endedAt: game.endedAt,
    };
  }

  // Get player's game history
  async getPlayerHistory(playerId, limit = 20) {
    return await gameDb.getPlayerHistory(playerId, limit);
  }

  // Cleanup old ended games (call periodically)
  async cleanupOldGames(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    await gameDb.cleanupOldGames(maxAgeMs);
  }
}
