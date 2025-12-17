import { v4 as uuidv4 } from 'uuid';

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
    this.games = new Map(); // gameId -> game
    this.gamesByCode = new Map(); // gameCode -> gameId
    this.playerGames = new Map(); // playerId -> gameId
  }

  createGame(host, settings) {
    let gameCode;
    // Ensure unique game code
    do {
      gameCode = generateGameCode();
    } while (this.gamesByCode.has(gameCode));

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

    this.games.set(gameId, game);
    this.gamesByCode.set(gameCode, gameId);
    this.playerGames.set(host.id, gameId);

    return game;
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  getGameByCode(code) {
    const gameId = this.gamesByCode.get(code.toUpperCase());
    return gameId ? this.games.get(gameId) : null;
  }

  getPlayerGame(playerId) {
    const gameId = this.playerGames.get(playerId);
    return gameId ? this.games.get(gameId) : null;
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
    const existingGame = this.playerGames.get(player.id);
    if (existingGame && existingGame !== game.id) {
      return { success: false, error: 'You are already in another game' };
    }

    game.players.push({
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
    });

    this.playerGames.set(player.id, game.id);

    return { success: true, game };
  }

  leaveGame(playerId) {
    const game = this.getPlayerGame(playerId);
    if (!game) {
      return { success: false, error: 'Not in a game' };
    }

    game.players = game.players.filter(p => p.id !== playerId);
    this.playerGames.delete(playerId);

    // If host leaves, assign new host or end game
    if (game.host === playerId && game.players.length > 0) {
      game.host = game.players[0].id;
      game.hostName = game.players[0].name;
    }

    // If no players left, cleanup game
    if (game.players.length === 0) {
      this.games.delete(game.id);
      this.gamesByCode.delete(game.code);
    }

    return { success: true, game };
  }

  startGame(gameId, hostId) {
    const game = this.games.get(gameId);

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

    return { success: true, game };
  }

  updatePlayerLocation(playerId, location) {
    const game = this.getPlayerGame(playerId);
    if (!game) return null;

    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.location = location;
      player.lastUpdate = Date.now();
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
    const game = this.games.get(gameId);

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

    return { success: true, game, tag, tagTime };
  }

  endGame(gameId, hostId) {
    const game = this.games.get(gameId);

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
    const playerStats = game.players.map(p => ({
      ...p,
      finalSurvivalTime: p.isIt ? 0 : gameTime - (p.becameItAt || 0),
    }));

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

    // Cleanup player-game associations
    game.players.forEach(p => {
      this.playerGames.delete(p.id);
    });

    return { success: true, game };
  }

  // Get game summary for ended games
  getGameSummary(gameId) {
    const game = this.games.get(gameId);
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

  // Cleanup old ended games (call periodically)
  cleanupOldGames(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [gameId, game] of this.games) {
      if (game.status === 'ended' && (now - game.endedAt) > maxAgeMs) {
        this.gamesByCode.delete(game.code);
        this.games.delete(gameId);
      }
    }
  }
}
