import { v4 as uuidv4 } from 'uuid';
import { gameDb, userDb } from '../db/index.js';
import { getDistance } from '../utils/distance.js';
import { isInNoTagTime, isInNoTagZone, canTagNow } from '../utils/gameLogic.js';

// Game settings limits
const MAX_NO_TAG_ZONES = 10;
const MAX_NO_TAG_TIMES = 5;
const MAX_GAME_NAME_LENGTH = 50;
const MAX_ZONE_NAME_LENGTH = 30;
const MAX_TIME_NAME_LENGTH = 30;

// Generate 6-character game code
const generateGameCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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

  createGame(host, settings) {
    // Validate and sanitize settings
    const noTagZones = Array.isArray(settings.noTagZones)
      ? settings.noTagZones.slice(0, MAX_NO_TAG_ZONES).map(zone => ({
          ...zone,
          name: String(zone.name || '').slice(0, MAX_ZONE_NAME_LENGTH),
        }))
      : [];

    const noTagTimes = Array.isArray(settings.noTagTimes)
      ? settings.noTagTimes.slice(0, MAX_NO_TAG_TIMES).map(time => ({
          ...time,
          name: String(time.name || '').slice(0, MAX_TIME_NAME_LENGTH),
        }))
      : [];

    const gameName = String(settings.gameName || `${host.name}'s Game`).slice(0, MAX_GAME_NAME_LENGTH);

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
    } while (this.gamesByCode.has(gameCode) || gameDb.getByCode(gameCode));

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
        gameName,
        noTagZones,
        noTagTimes,
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
    gameDb.create(game);

    // Cache in memory
    this._cacheGame(game);

    return game;
  }

  getGame(gameId) {
    // First check cache
    let game = this.activeGames.get(gameId);
    if (game) return game;

    // Then check database
    game = gameDb.getById(gameId);
    if (game && (game.status === 'waiting' || game.status === 'active')) {
      this._cacheGame(game);
    }
    return game;
  }

  getGameByCode(code) {
    const upperCode = code.toUpperCase();

    // First check cache
    const cachedId = this.gamesByCode.get(upperCode);
    if (cachedId) {
      return this.activeGames.get(cachedId);
    }

    // Then check database
    const game = gameDb.getByCode(upperCode);
    if (game && (game.status === 'waiting' || game.status === 'active')) {
      this._cacheGame(game);
    }
    return game;
  }

  getPlayerGame(playerId) {
    // First check cache
    const cachedId = this.playerGames.get(playerId);
    if (cachedId) {
      return this.activeGames.get(cachedId);
    }

    // Then check database
    const game = gameDb.getActiveGameForPlayer(playerId);
    if (game) {
      this._cacheGame(game);
    }
    return game;
  }

  joinGame(gameCode, player) {
    const game = this.getGameByCode(gameCode);

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
    const existingGame = this.getPlayerGame(player.id);
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
    gameDb.addPlayer(game.id, newPlayer);

    return { success: true, game };
  }

  leaveGame(playerId) {
    const game = this.getPlayerGame(playerId);
    if (!game) {
      return { success: false, error: 'Not in a game' };
    }

    game.players = game.players.filter(p => p.id !== playerId);
    this._uncachePlayer(playerId);

    // Persist removal to database
    gameDb.removePlayer(game.id, playerId);

    // If host leaves, assign new host or end game
    if (game.host === playerId && game.players.length > 0) {
      game.host = game.players[0].id;
      game.hostName = game.players[0].name;
      gameDb.updateGame(game);
    }

    // If no players left, cleanup game
    if (game.players.length === 0) {
      this._uncacheGame(game.id);
      gameDb.deleteGame(game.id);
    }

    return { success: true, game };
  }

  startGame(gameId, hostId) {
    const game = this.getGame(gameId);

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
    gameDb.updateGame(game);
    game.players.forEach(p => gameDb.updatePlayer(game.id, p));

    return { success: true, game };
  }

  updatePlayerLocation(playerId, location) {
    const game = this.getPlayerGame(playerId);
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

  tagPlayer(gameId, taggerId, targetId) {
    const game = this.getGame(gameId);

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

    // Privacy: Only store the distance at which the tag occurred, not exact coordinates
    const tag = {
      id: uuidv4(),
      taggerId,
      taggedId: targetId,
      timestamp: now,
      tagTime,
      distance: Math.round(distance), // Only store distance in meters, not exact location
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
    gameDb.updateGame(game);
    gameDb.addTag(game.id, tag);
    game.players.forEach(p => {
      if (p.id === taggerId || p.id === targetId) {
        gameDb.updatePlayer(game.id, p);
      }
    });

    // Update user stats
    const taggerStats = userDb.getById(taggerId);
    if (taggerStats) {
      userDb.updateStats(taggerId, {
        totalTags: (taggerStats.stats.totalTags || 0) + 1,
        fastestTag: tagTime && (!taggerStats.stats.fastestTag || tagTime < taggerStats.stats.fastestTag)
          ? tagTime
          : taggerStats.stats.fastestTag,
      });
    }

    const targetStats = userDb.getById(targetId);
    if (targetStats) {
      userDb.updateStats(targetId, {
        timesTagged: (targetStats.stats.timesTagged || 0) + 1,
      });
    }

    return { success: true, game, tag, tagTime };
  }

  endGame(gameId, hostId) {
    const game = this.getGame(gameId);

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
    gameDb.updateGame(game);
    game.players.forEach(p => gameDb.updatePlayer(game.id, p));

    // Update user stats for all players
    game.players.forEach(p => {
      const userStats = userDb.getById(p.id);
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

        userDb.updateStats(p.id, updates);
      }
    });

    // Cleanup from cache
    game.players.forEach(p => {
      this._uncachePlayer(p.id);
    });
    this._uncacheGame(game.id);

    return { success: true, game };
  }

  // Get game summary for ended games
  getGameSummary(gameId) {
    const game = gameDb.getById(gameId);
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
  getPlayerHistory(playerId, limit = 20) {
    return gameDb.getPlayerHistory(playerId, limit);
  }

  // Cleanup old ended games (call periodically)
  cleanupOldGames(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    gameDb.cleanupOldGames(maxAgeMs);
  }
}
