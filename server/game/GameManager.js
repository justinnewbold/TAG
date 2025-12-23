import { v4 as uuidv4 } from 'uuid';
import { gameDb, userDb } from '../db/index.js';
import { getDistance, generateGameCode } from '../../shared/utils.js';
import { GAME_MODES, GAME_LIMITS } from '../../shared/constants.js';

// Re-export for backward compatibility
export { GAME_MODES };

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

    // Validate game mode
    const gameMode = settings.gameMode || 'classic';
    const modeConfig = GAME_MODES[gameMode] || GAME_MODES.classic;

    const gameId = uuidv4();
    const game = {
      id: gameId,
      code: gameCode,
      host: host.id,
      hostName: host.name,
      status: 'waiting',
      gameMode: gameMode,
      settings: {
        gpsInterval: settings.gpsInterval || 5 * 60 * 1000,
        tagRadius: settings.tagRadius || 20,
        duration: settings.duration || null,
        maxPlayers: settings.maxPlayers || 10,
        gameName: settings.gameName || `${host.name}'s Game`,
        noTagZones: settings.noTagZones || [],
        noTagTimes: settings.noTagTimes || [],
        // Game mode specific settings
        potatoTimer: settings.potatoTimer || GAME_MODES.hotPotato.defaultTimer,
        hideTime: settings.hideTime || GAME_MODES.hideAndSeek.defaultHideTime,
        // Privacy and scheduling settings
        isPublic: settings.isPublic !== undefined ? settings.isPublic : true,
        allowSoloPlay: settings.allowSoloPlay !== undefined ? settings.allowSoloPlay : false,
        minPlayers: settings.minPlayers || null, // null = use game mode default
        scheduledStartTime: settings.scheduledStartTime || null, // null = manual start
        requireApproval: settings.requireApproval || false, // Host must approve joins
      },
      bannedPlayers: [], // List of banned player IDs
      pendingPlayers: [], // Players waiting for approval
      players: [{
        id: host.id,
        name: host.name,
        avatar: host.avatar,
        location: null,
        isIt: false,
        isFrozen: false, // For freeze tag
        isEliminated: false, // For infection/hot potato
        team: null, // For team tag
        joinedAt: Date.now(),
        lastUpdate: null,
        tagCount: 0,
        survivalTime: 0,
        becameItAt: null,
      }],
      itPlayerId: null,
      itPlayerIds: [], // For infection mode (multiple IT players)
      startedAt: null,
      endedAt: null,
      hidePhaseEndAt: null, // For hide and seek
      potatoExpiresAt: null, // For hot potato
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

    // Check if player is banned
    if (game.bannedPlayers?.includes(player.id)) {
      return { success: false, error: 'You have been banned from this game' };
    }

    // Check if approval is required
    if (game.settings.requireApproval && game.host !== player.id) {
      return this.requestJoin(gameCode, player);
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
      isFrozen: false,
      isEliminated: false,
      team: null,
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

  // Kick a player from the game (host only)
  async kickPlayer(gameId, hostId, targetPlayerId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can kick players' };
    }

    if (targetPlayerId === hostId) {
      return { success: false, error: 'Host cannot kick themselves' };
    }

    const targetPlayer = game.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) {
      return { success: false, error: 'Player not in game' };
    }

    // Remove player
    game.players = game.players.filter(p => p.id !== targetPlayerId);
    this._uncachePlayer(targetPlayerId);
    await gameDb.removePlayer(game.id, targetPlayerId);

    return { success: true, game, kickedPlayer: targetPlayer };
  }

  // Ban a player from the game (host only) - prevents rejoin
  async banPlayer(gameId, hostId, targetPlayerId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can ban players' };
    }

    if (targetPlayerId === hostId) {
      return { success: false, error: 'Host cannot ban themselves' };
    }

    // Add to banned list
    if (!game.bannedPlayers) game.bannedPlayers = [];
    if (!game.bannedPlayers.includes(targetPlayerId)) {
      game.bannedPlayers.push(targetPlayerId);
    }

    // Also kick if currently in game
    const targetPlayer = game.players.find(p => p.id === targetPlayerId);
    if (targetPlayer) {
      game.players = game.players.filter(p => p.id !== targetPlayerId);
      this._uncachePlayer(targetPlayerId);
      await gameDb.removePlayer(game.id, targetPlayerId);
    }

    await gameDb.updateGame(game);

    return { success: true, game, bannedPlayer: targetPlayer };
  }

  // Update game settings (host only, before game starts)
  async updateGameSettings(gameId, hostId, newSettings) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can update settings' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Cannot change settings after game starts' };
    }

    // Merge new settings (only allow specific fields to be updated)
    const allowedFields = [
      'gameName', 'tagRadius', 'gpsInterval', 'duration', 'maxPlayers',
      'noTagZones', 'noTagTimes', 'isPublic', 'allowSoloPlay', 'minPlayers',
      'scheduledStartTime', 'requireApproval', 'potatoTimer', 'hideTime'
    ];

    for (const field of allowedFields) {
      if (newSettings[field] !== undefined) {
        // Don't allow maxPlayers below current player count
        if (field === 'maxPlayers' && newSettings[field] < game.players.length) {
          return { success: false, error: `Cannot set max players below current player count (${game.players.length})` };
        }
        game.settings[field] = newSettings[field];
      }
    }

    await gameDb.updateGame(game);

    return { success: true, game };
  }

  // Request to join a game (for games requiring approval)
  async requestJoin(code, player) {
    const game = await this.getGameByCode(code);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Check if banned
    if (game.bannedPlayers?.includes(player.id)) {
      return { success: false, error: 'You have been banned from this game' };
    }

    // If approval not required, use normal join
    if (!game.settings.requireApproval) {
      return this.joinGame(code, player);
    }

    // Check if already pending
    if (!game.pendingPlayers) game.pendingPlayers = [];
    if (game.pendingPlayers.some(p => p.id === player.id)) {
      return { success: false, error: 'Already requested to join', pending: true };
    }

    // Check if already in game
    if (game.players.some(p => p.id === player.id)) {
      return { success: true, game, alreadyJoined: true };
    }

    // Add to pending list
    game.pendingPlayers.push({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      requestedAt: Date.now(),
    });

    await gameDb.updateGame(game);

    return { success: true, game, pending: true };
  }

  // Approve a pending player (host only)
  async approvePlayer(gameId, hostId, pendingPlayerId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can approve players' };
    }

    if (!game.pendingPlayers) game.pendingPlayers = [];
    const pendingPlayer = game.pendingPlayers.find(p => p.id === pendingPlayerId);
    
    if (!pendingPlayer) {
      return { success: false, error: 'Player not found in pending list' };
    }

    // Check max players
    if (game.players.length >= game.settings.maxPlayers) {
      return { success: false, error: 'Game is full' };
    }

    // Remove from pending, add to players
    game.pendingPlayers = game.pendingPlayers.filter(p => p.id !== pendingPlayerId);
    
    const newPlayer = {
      id: pendingPlayer.id,
      name: pendingPlayer.name,
      avatar: pendingPlayer.avatar,
      location: null,
      isIt: false,
      isFrozen: false,
      isEliminated: false,
      team: null,
      joinedAt: Date.now(),
      lastUpdate: null,
      tagCount: 0,
      survivalTime: 0,
      becameItAt: null,
    };

    game.players.push(newPlayer);
    this.playerGames.set(pendingPlayerId, game.id);
    
    await gameDb.addPlayer(game.id, newPlayer);
    await gameDb.updateGame(game);

    return { success: true, game, approvedPlayer: newPlayer };
  }

  // Reject a pending player (host only)
  async rejectPlayer(gameId, hostId, pendingPlayerId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can reject players' };
    }

    if (!game.pendingPlayers) game.pendingPlayers = [];
    const pendingPlayer = game.pendingPlayers.find(p => p.id === pendingPlayerId);
    
    if (!pendingPlayer) {
      return { success: false, error: 'Player not found in pending list' };
    }

    // Remove from pending
    game.pendingPlayers = game.pendingPlayers.filter(p => p.id !== pendingPlayerId);
    await gameDb.updateGame(game);

    return { success: true, game, rejectedPlayer: pendingPlayer };
  }

  // Get public games (for game browser) - delegates to unified method
  async getPublicGames(limit = 20) {
    return this.getPublicGamesForBrowser(limit);
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

    // Check minimum players for game mode (unless solo play is enabled)
    const modeConfig = GAME_MODES[game.gameMode] || GAME_MODES.classic;
    const defaultMinPlayers = modeConfig.minPlayers || 2;
    const minPlayers = game.settings.allowSoloPlay ? 1 : (game.settings.minPlayers || defaultMinPlayers);
    
    if (game.players.length < minPlayers) {
      return { success: false, error: `Need at least ${minPlayers} player${minPlayers > 1 ? 's' : ''} to start` };
    }

    const now = Date.now();
    game.status = 'active';
    game.startedAt = now;

    // Handle game mode specific initialization
    switch (game.gameMode) {
      case 'teamTag': {
        // Assign players to teams (alternating or random)
        const shuffled = [...game.players].sort(() => Math.random() - 0.5);
        game.players = shuffled.map((p, i) => ({
          ...p,
          team: i % 2 === 0 ? 'red' : 'blue',
          isIt: true, // In team tag, everyone can tag
        }));
        game.itPlayerId = null; // No single IT in team mode
        break;
      }

      case 'infection': {
        // One random player starts as infected (IT)
        const itIndex = Math.floor(Math.random() * game.players.length);
        const itPlayerId = game.players[itIndex].id;
        game.itPlayerId = itPlayerId;
        game.itPlayerIds = [itPlayerId];
        game.players = game.players.map(p => ({
          ...p,
          isIt: p.id === itPlayerId,
          becameItAt: p.id === itPlayerId ? now : null,
        }));
        break;
      }

      case 'manhunt': {
        // Host or random player is the hunter (IT) - they stay IT forever
        const hunterId = game.host;
        game.itPlayerId = hunterId;
        game.players = game.players.map(p => ({
          ...p,
          isIt: p.id === hunterId,
          becameItAt: p.id === hunterId ? now : null,
        }));
        break;
      }

      case 'freezeTag': {
        // One random player starts as IT
        const itIndex = Math.floor(Math.random() * game.players.length);
        const itPlayerId = game.players[itIndex].id;
        game.itPlayerId = itPlayerId;
        game.players = game.players.map(p => ({
          ...p,
          isIt: p.id === itPlayerId,
          isFrozen: false,
          becameItAt: p.id === itPlayerId ? now : null,
        }));
        break;
      }

      case 'hotPotato': {
        // Random player gets the potato (is IT)
        const itIndex = Math.floor(Math.random() * game.players.length);
        const itPlayerId = game.players[itIndex].id;
        game.itPlayerId = itPlayerId;
        game.potatoExpiresAt = now + (game.settings.potatoTimer || 45000);
        game.players = game.players.map(p => ({
          ...p,
          isIt: p.id === itPlayerId,
          isEliminated: false,
          becameItAt: p.id === itPlayerId ? now : null,
        }));
        break;
      }

      case 'hideAndSeek': {
        // Host is the seeker, starts in hiding phase
        const seekerId = game.host;
        game.itPlayerId = seekerId;
        game.status = 'hiding'; // Special status for hide phase
        game.hidePhaseEndAt = now + (game.settings.hideTime || 120000);
        game.players = game.players.map(p => ({
          ...p,
          isIt: p.id === seekerId,
          becameItAt: p.id === seekerId ? now : null,
        }));
        break;
      }

      case 'classic':
      default: {
        // Classic tag: random IT
        const itIndex = Math.floor(Math.random() * game.players.length);
        const itPlayerId = game.players[itIndex].id;
        game.itPlayerId = itPlayerId;
        game.players = game.players.map(p => ({
          ...p,
          isIt: p.id === itPlayerId,
          becameItAt: p.id === itPlayerId ? now : null,
        }));
        break;
      }
    }

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

    if (game.status !== 'active' && game.status !== 'hiding') {
      return { success: false, error: 'Game is not active' };
    }

    // Hide and seek: seeker can't tag during hiding phase
    if (game.gameMode === 'hideAndSeek' && game.status === 'hiding') {
      return { success: false, error: 'Still in hiding phase!' };
    }

    const tagger = game.players.find(p => p.id === taggerId);
    const target = game.players.find(p => p.id === targetId);

    if (!tagger || !target) {
      return { success: false, error: 'Player not found' };
    }

    // Game mode specific validation
    const gameMode = game.gameMode || 'classic';
    
    switch (gameMode) {
      case 'teamTag':
        // Can only tag players on the opposite team
        if (tagger.team === target.team) {
          return { success: false, error: 'Cannot tag your own teammate!' };
        }
        if (target.isEliminated) {
          return { success: false, error: 'Player is already eliminated' };
        }
        break;

      case 'infection':
        // Must be infected (IT) to tag
        if (!tagger.isIt) {
          return { success: false, error: 'You are not infected' };
        }
        if (target.isIt) {
          return { success: false, error: 'Target is already infected' };
        }
        break;

      case 'freezeTag':
        if (tagger.isIt) {
          // IT player freezing someone
          if (target.isFrozen) {
            return { success: false, error: 'Player is already frozen' };
          }
        } else {
          // Non-IT trying to unfreeze teammate
          if (!target.isFrozen) {
            return { success: false, error: 'Player is not frozen' };
          }
          if (target.isIt) {
            return { success: false, error: 'Cannot unfreeze IT player' };
          }
        }
        break;

      case 'manhunt':
        // Only hunter (IT) can tag
        if (!tagger.isIt) {
          return { success: false, error: 'Only the hunter can tag' };
        }
        if (target.isEliminated) {
          return { success: false, error: 'Player is already eliminated' };
        }
        break;

      case 'hotPotato':
        if (game.itPlayerId !== taggerId) {
          return { success: false, error: 'You don\'t have the potato!' };
        }
        if (target.isEliminated) {
          return { success: false, error: 'Player is eliminated' };
        }
        break;

      case 'classic':
      default:
        if (game.itPlayerId !== taggerId) {
          return { success: false, error: 'You are not IT' };
        }
        break;
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
      gameMode,
    };

    game.tags.push(tag);

    // Handle game mode specific tag results
    let gameEnded = false;
    let winner = null;

    switch (gameMode) {
      case 'teamTag': {
        // Target is eliminated
        game.players = game.players.map(p => {
          if (p.id === targetId) {
            return { ...p, isEliminated: true, tagCount: (p.tagCount || 0) };
          }
          if (p.id === taggerId) {
            return { ...p, tagCount: (p.tagCount || 0) + 1 };
          }
          return p;
        });
        
        // Check if one team is fully eliminated
        const redAlive = game.players.filter(p => p.team === 'red' && !p.isEliminated);
        const blueAlive = game.players.filter(p => p.team === 'blue' && !p.isEliminated);
        
        if (redAlive.length === 0) {
          gameEnded = true;
          winner = { team: 'blue', players: game.players.filter(p => p.team === 'blue') };
        } else if (blueAlive.length === 0) {
          gameEnded = true;
          winner = { team: 'red', players: game.players.filter(p => p.team === 'red') };
        }
        break;
      }

      case 'infection': {
        // Target becomes infected
        game.itPlayerIds = [...(game.itPlayerIds || []), targetId];
        game.players = game.players.map(p => {
          if (p.id === targetId) {
            return { ...p, isIt: true, becameItAt: now };
          }
          if (p.id === taggerId) {
            return { ...p, tagCount: (p.tagCount || 0) + 1 };
          }
          return p;
        });
        
        // Check if all players are infected
        const survivors = game.players.filter(p => !p.isIt);
        if (survivors.length === 0) {
          gameEnded = true;
          // Last person to be infected "wins" (survived longest)
          winner = target;
        }
        break;
      }

      case 'freezeTag': {
        if (tagger.isIt) {
          // Freeze the target
          game.players = game.players.map(p => {
            if (p.id === targetId) {
              return { ...p, isFrozen: true };
            }
            if (p.id === taggerId) {
              return { ...p, tagCount: (p.tagCount || 0) + 1 };
            }
            return p;
          });
          
          // Check if all non-IT players are frozen
          const unfrozen = game.players.filter(p => !p.isIt && !p.isFrozen);
          if (unfrozen.length === 0) {
            gameEnded = true;
            winner = game.players.find(p => p.isIt);
          }
        } else {
          // Unfreeze teammate
          game.players = game.players.map(p => {
            if (p.id === targetId) {
              return { ...p, isFrozen: false };
            }
            return p;
          });
          tag.type = 'unfreeze';
        }
        break;
      }

      case 'manhunt': {
        // Target is eliminated (caught by hunter)
        game.players = game.players.map(p => {
          if (p.id === targetId) {
            return { ...p, isEliminated: true };
          }
          if (p.id === taggerId) {
            return { ...p, tagCount: (p.tagCount || 0) + 1 };
          }
          return p;
        });
        
        // Check if all runners are eliminated
        const runnersAlive = game.players.filter(p => !p.isIt && !p.isEliminated);
        if (runnersAlive.length === 0) {
          gameEnded = true;
          winner = game.players.find(p => p.isIt); // Hunter wins
        }
        break;
      }

      case 'hotPotato': {
        // Pass the potato to target
        game.itPlayerId = targetId;
        game.potatoExpiresAt = now + (game.settings.potatoTimer || 45000);
        game.players = game.players.map(p => {
          if (p.id === taggerId) {
            return { ...p, isIt: false, tagCount: (p.tagCount || 0) + 1, becameItAt: null };
          }
          if (p.id === targetId) {
            return { ...p, isIt: true, becameItAt: now };
          }
          return p;
        });
        break;
      }

      case 'classic':
      default: {
        // Transfer IT to target
        game.itPlayerId = targetId;
        game.players = game.players.map(p => {
          if (p.id === taggerId) {
            return { ...p, isIt: false, tagCount: (p.tagCount || 0) + 1, becameItAt: null };
          }
          if (p.id === targetId) {
            return { ...p, isIt: true, becameItAt: now };
          }
          return p;
        });
        break;
      }
    }

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

    return { success: true, game, tag, tagTime, gameEnded, winner };
  }

  // Eliminate player in hot potato when timer expires
  async eliminatePotatoHolder(gameId) {
    const game = await this.getGame(gameId);
    if (!game || game.gameMode !== 'hotPotato' || game.status !== 'active') {
      return { success: false };
    }

    const holder = game.players.find(p => p.isIt && !p.isEliminated);
    if (!holder) return { success: false };

    // Eliminate the potato holder
    game.players = game.players.map(p => {
      if (p.id === holder.id) {
        return { ...p, isIt: false, isEliminated: true };
      }
      return p;
    });

    // Find remaining players
    const remaining = game.players.filter(p => !p.isEliminated);
    
    if (remaining.length <= 1) {
      // Game over - last player wins
      return { success: true, game, gameEnded: true, winner: remaining[0], eliminated: holder };
    }

    // Pick new random potato holder from remaining
    const newHolder = remaining[Math.floor(Math.random() * remaining.length)];
    game.itPlayerId = newHolder.id;
    game.potatoExpiresAt = Date.now() + (game.settings.potatoTimer || 45000);
    game.players = game.players.map(p => {
      if (p.id === newHolder.id) {
        return { ...p, isIt: true, becameItAt: Date.now() };
      }
      return p;
    });

    await gameDb.updateGame(game);
    return { success: true, game, eliminated: holder, newHolder };
  }

  // End hide phase for hide and seek
  async endHidePhase(gameId) {
    const game = await this.getGame(gameId);
    if (!game || game.gameMode !== 'hideAndSeek' || game.status !== 'hiding') {
      return { success: false };
    }

    game.status = 'active';
    game.hidePhaseEndAt = null;
    
    await gameDb.updateGame(game);
    return { success: true, game };
  }

  async endGame(gameId, hostId) {
    const game = await this.getGame(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.host !== hostId) {
      return { success: false, error: 'Only the host can end the game' };
    }

    if (game.status !== 'active' && game.status !== 'hiding') {
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

  // Get public games for browsing (unified method)
  async getPublicGamesForBrowser(limit = 20) {
    const publicGames = [];

    // Check cached active games first
    for (const game of this.activeGames.values()) {
      if (game.settings?.isPublic && (game.status === 'waiting' || game.status === 'active')) {
        publicGames.push({
          id: game.id,
          code: game.code,
          name: game.settings?.gameName || 'Unnamed Game',
          host_name: game.hostName,
          gameMode: game.gameMode,
          status: game.status,
          player_count: game.players?.length || 0,
          max_players: game.settings?.maxPlayers || 10,
          created_at: game.createdAt,
          allow_spectators: game.settings?.allowSpectators ?? true,
          tagRadius: game.settings?.tagRadius,
          requireApproval: game.settings?.requireApproval,
          scheduledStartTime: game.settings?.scheduledStartTime,
        });
      }
    }

    // Also check database for any we might have missed
    const dbGames = await gameDb.getPublicGames?.() || [];
    for (const dbGame of dbGames) {
      if (!publicGames.some(g => g.id === dbGame.id)) {
        publicGames.push(dbGame);
      }
    }

    return publicGames.slice(0, limit);
  }

  // Spectate a game
  async spectateGame(gameCode, spectator) {
    const game = await this.getGameByCode(gameCode);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    
    if (game.status === 'ended') {
      return { success: false, error: 'Game has ended' };
    }
    
    if (!game.settings?.allowSpectators) {
      return { success: false, error: 'This game does not allow spectators' };
    }
    
    // Initialize spectators array if needed
    if (!game.spectators) {
      game.spectators = [];
    }
    
    // Check if already spectating
    if (game.spectators.some(s => s.id === spectator.id)) {
      return { success: true, game, alreadySpectating: true };
    }
    
    // Check if user is a player (can't spectate own game)
    if (game.players.some(p => p.id === spectator.id)) {
      return { success: false, error: 'Cannot spectate a game you are playing in' };
    }
    
    // Add as spectator
    game.spectators.push({
      id: spectator.id,
      name: spectator.name,
      joinedAt: Date.now()
    });
    
    return { success: true, game };
  }

  // Remove spectator
  removeSpectator(gameId, spectatorId) {
    const game = this.activeGames.get(gameId);
    if (game && game.spectators) {
      game.spectators = game.spectators.filter(s => s.id !== spectatorId);
    }
  }
}
