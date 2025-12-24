import { validate } from '../utils/validation.js';
import { pushService } from '../services/push.js';
import { getDistance, calculateSpeed, isValidSpeed } from '../../shared/utils.js';
import { ANTI_CHEAT, SOCKET_RATE_LIMITS } from '../../shared/constants.js';

// Rate limiter for socket events
class RateLimiter {
  constructor() {
    this.events = new Map(); // userId -> { eventType -> { count, resetTime } }
  }

  check(userId, eventType, limit) {
    const now = Date.now();
    const userEvents = this.events.get(userId) || new Map();
    const eventData = userEvents.get(eventType) || { count: 0, resetTime: now + 60000 };

    // Reset if minute has passed
    if (now > eventData.resetTime) {
      eventData.count = 0;
      eventData.resetTime = now + 60000;
    }

    eventData.count++;
    userEvents.set(eventType, eventData);
    this.events.set(userId, userEvents);

    return eventData.count <= limit;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [userId, userEvents] of this.events) {
      for (const [eventType, data] of userEvents) {
        if (now > data.resetTime + 60000) {
          userEvents.delete(eventType);
        }
      }
      if (userEvents.size === 0) {
        this.events.delete(userId);
      }
    }
  }
}

// Anti-cheat: track player location history
class LocationTracker {
  constructor() {
    this.history = new Map(); // playerId -> { lat, lng, timestamp }
    this.violations = new Map(); // playerId -> { count, lastViolation }
  }

  update(playerId, location) {
    const now = Date.now();
    const previous = this.history.get(playerId);
    let cheatCheck = { valid: true };

    if (previous && previous.timestamp) {
      const speed = calculateSpeed(
        { ...previous, timestamp: previous.timestamp },
        { ...location, timestamp: now }
      );

      cheatCheck = isValidSpeed(speed);

      if (!cheatCheck.valid) {
        // Track violations
        const violations = this.violations.get(playerId) || { count: 0, lastViolation: 0 };
        violations.count++;
        violations.lastViolation = now;
        this.violations.set(playerId, violations);

        console.warn(`[AntiCheat] Player ${playerId}: ${cheatCheck.reason} (speed: ${speed.toFixed(1)} m/s, violations: ${violations.count})`);
      }
    }

    // Store current location for next check
    this.history.set(playerId, { ...location, timestamp: now });

    return cheatCheck;
  }

  getViolationCount(playerId) {
    return this.violations.get(playerId)?.count || 0;
  }

  // Check if player should be flagged for cheating
  shouldFlag(playerId) {
    const violations = this.violations.get(playerId);
    if (!violations) return false;
    // Flag if 5+ violations in last 5 minutes
    return violations.count >= 5 && (Date.now() - violations.lastViolation < 300000);
  }
}

// Global instances
const rateLimiter = new RateLimiter();
const locationTracker = new LocationTracker();

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

export function setupSocketHandlers(io, socket, gameManager) {
  const user = socket.user;

  // Join game room when connecting (async IIFE for initial setup)
  (async () => {
    const currentGame = await gameManager.getPlayerGame(user.id);
    if (currentGame) {
      socket.join(`game:${currentGame.id}`);
      console.log(`${user.name} rejoined game room: ${currentGame.code}`);
    }
  })();

  // Join a game room
  socket.on('game:join', async (gameId) => {
    const game = await gameManager.getGame(gameId);
    if (game && game.players.some(p => p.id === user.id)) {
      socket.join(`game:${gameId}`);
      console.log(`${user.name} joined game room: ${game.code}`);

      // Send current game state to the joining player
      socket.emit('game:state', { game });
    }
  });

  // Leave game room
  socket.on('game:leave', (gameId) => {
    socket.leave(`game:${gameId}`);
    console.log(`${user.name} left game room`);
  });

  // Update player location (synchronous for performance - uses cache only)
  socket.on('location:update', (location) => {
    // Rate limiting check
    if (!rateLimiter.check(user.id, 'location:update', SOCKET_RATE_LIMITS.LOCATION_UPDATE)) {
      socket.emit('error:rateLimit', { event: 'location:update', message: 'Too many location updates' });
      return;
    }

    // Validate location data
    const locationValidation = validate.location(location);
    if (!locationValidation.valid) {
      return; // Silently ignore invalid location data
    }

    const validLocation = { lat: locationValidation.lat, lng: locationValidation.lng };

    // Anti-cheat: check for teleportation/speed hacks
    const cheatCheck = locationTracker.update(user.id, validLocation);
    if (!cheatCheck.valid && cheatCheck.severity === 'high') {
      // Teleport detected - reject this location update
      socket.emit('error:anticheat', {
        reason: cheatCheck.reason,
        message: 'Invalid location update detected',
      });
      return;
    }

    // Flag player if they have too many violations
    if (locationTracker.shouldFlag(user.id)) {
      socket.emit('warning:anticheat', {
        message: 'Multiple suspicious location updates detected. Please ensure GPS is working properly.',
      });
    }

    const game = gameManager.updatePlayerLocation(user.id, validLocation);

    if (game && (game.status === 'active' || game.status === 'hiding')) {
      // Broadcast location to other players in the game
      // For hide and seek: don't broadcast hider locations to seeker during hiding phase
      const isSeeker = game.gameMode === 'hideAndSeek' && game.itPlayerId === user.id;
      const isHiding = game.status === 'hiding';
      
      if (!(isHiding && !isSeeker)) {
        socket.to(`game:${game.id}`).emit('player:location', {
          playerId: user.id,
          location: validLocation,
          timestamp: Date.now(),
        });
      }

      // Game mode specific proximity checks
      const gameMode = game.gameMode || 'classic';
      
      if (gameMode === 'infection') {
        // For infection: any infected player can tag
        const currentPlayer = game.players.find(p => p.id === user.id);
        if (currentPlayer?.isIt) {
          // Check for nearby survivors
          const nearbySurvivors = game.players
            .filter(p => !p.isIt && p.location)
            .map(p => ({
              id: p.id,
              name: p.name,
              distance: getDistance(
                validLocation.lat, validLocation.lng,
                p.location.lat, p.location.lng
              ),
            }))
            .filter(p => p.distance <= game.settings.tagRadius * 2)
            .sort((a, b) => a.distance - b.distance);

          if (nearbySurvivors.length > 0) {
            socket.emit('nearby:players', { players: nearbySurvivors });
          }
        }
      } else if (gameMode === 'teamTag') {
        // For team tag: check for nearby enemies
        const currentPlayer = game.players.find(p => p.id === user.id);
        if (currentPlayer && !currentPlayer.isEliminated) {
          const nearbyEnemies = game.players
            .filter(p => p.team !== currentPlayer.team && !p.isEliminated && p.location)
            .map(p => ({
              id: p.id,
              name: p.name,
              team: p.team,
              distance: getDistance(
                validLocation.lat, validLocation.lng,
                p.location.lat, p.location.lng
              ),
            }))
            .filter(p => p.distance <= game.settings.tagRadius * 2)
            .sort((a, b) => a.distance - b.distance);

          if (nearbyEnemies.length > 0) {
            socket.emit('nearby:players', { players: nearbyEnemies });
          }
        }
      } else if (game.itPlayerId === user.id) {
        // Classic/other modes: IT player moved - check distances to all other players
        const nearbyPlayers = game.players
          .filter(p => p.id !== user.id && p.location && !p.isFrozen && !p.isEliminated)
          .map(p => ({
            id: p.id,
            name: p.name,
            distance: getDistance(
              validLocation.lat, validLocation.lng,
              p.location.lat, p.location.lng
            ),
          }))
          .filter(p => p.distance <= game.settings.tagRadius * 2)
          .sort((a, b) => a.distance - b.distance);

        if (nearbyPlayers.length > 0) {
          socket.emit('nearby:players', { players: nearbyPlayers });
        }
      } else if (game.itPlayerId) {
        // Non-IT player moved - check distance to IT
        const itPlayer = game.players.find(p => p.id === game.itPlayerId);
        if (itPlayer?.location) {
          const distance = getDistance(
            validLocation.lat, validLocation.lng,
            itPlayer.location.lat, itPlayer.location.lng
          );

          if (distance <= game.settings.tagRadius * 2) {
            socket.emit('it:nearby', {
              distance,
              inRange: distance <= game.settings.tagRadius,
            });

            if (distance <= game.settings.tagRadius * 1.5) {
              pushService.sendToUser(user.id, pushService.notifications.itNearby(Math.round(distance)))
                .catch(() => {});
            }
          }
        }
      }
    }
  });

  // Tag attempt via WebSocket (alternative to REST)
  socket.on('tag:attempt', async ({ targetId }) => {
    // Rate limiting check
    if (!rateLimiter.check(user.id, 'tag:attempt', SOCKET_RATE_LIMITS.TAG_ATTEMPT)) {
      socket.emit('tag:result', { success: false, error: 'Too many tag attempts. Please wait.' });
      return;
    }

    // Validate targetId
    const targetValidation = validate.uuid(targetId);
    if (!targetValidation.valid) {
      socket.emit('tag:result', { success: false, error: 'Invalid target' });
      return;
    }

    const game = await gameManager.getPlayerGame(user.id);
    if (!game) {
      socket.emit('tag:result', { success: false, error: 'Not in a game' });
      return;
    }

    const result = await gameManager.tagPlayer(game.id, user.id, targetValidation.id);

    if (result.success) {
      const validatedTargetId = targetValidation.id;
      const taggedPlayer = result.game.players.find(p => p.id === validatedTargetId);
      const gameMode = result.game.gameMode || 'classic';

      // Notify all players in the game with game mode specific event
      const tagEvent = {
        taggerId: user.id,
        taggerName: user.name,
        taggedId: validatedTargetId,
        taggedName: taggedPlayer?.name,
        newItPlayerId: result.game.itPlayerId,
        tagTime: result.tagTime,
        tag: result.tag,
        gameMode,
      };

      // Add game mode specific data
      if (gameMode === 'freezeTag') {
        tagEvent.isFrozen = taggedPlayer?.isFrozen;
        tagEvent.isUnfreeze = result.tag?.type === 'unfreeze';
      } else if (gameMode === 'infection') {
        tagEvent.infectedCount = result.game.players.filter(p => p.isIt).length;
        tagEvent.survivorCount = result.game.players.filter(p => !p.isIt).length;
      } else if (gameMode === 'teamTag') {
        tagEvent.isEliminated = taggedPlayer?.isEliminated;
        tagEvent.redTeamAlive = result.game.players.filter(p => p.team === 'red' && !p.isEliminated).length;
        tagEvent.blueTeamAlive = result.game.players.filter(p => p.team === 'blue' && !p.isEliminated).length;
      } else if (gameMode === 'hotPotato') {
        tagEvent.potatoExpiresAt = result.game.potatoExpiresAt;
      }

      io.to(`game:${game.id}`).emit('player:tagged', tagEvent);

      socket.emit('tag:result', { success: true, tagTime: result.tagTime });

      // Check if game ended due to this tag
      if (result.gameEnded) {
        io.to(`game:${game.id}`).emit('game:ended', {
          game: result.game,
          winner: result.winner,
          reason: gameMode === 'infection' ? 'All players infected!' :
                  gameMode === 'teamTag' ? `Team ${result.winner?.team} wins!` :
                  gameMode === 'freezeTag' ? 'All players frozen!' :
                  'Game over!',
        });
      }

      // Send push notifications based on game mode
      if (taggedPlayer) {
        if (gameMode === 'freezeTag' && result.tag?.type === 'unfreeze') {
          pushService.sendToUser(validatedTargetId, {
            title: '❄️ Unfrozen!',
            body: `${user.name} unfroze you! Get moving!`,
          }).catch(() => {});
        } else if (gameMode === 'infection') {
          pushService.sendToUser(validatedTargetId, {
            title: '🧟 Infected!',
            body: `${user.name} infected you! Spread it to others!`,
          }).catch(() => {});
        } else if (gameMode === 'teamTag') {
          pushService.sendToUser(validatedTargetId, {
            title: '💀 Eliminated!',
            body: `${user.name} eliminated you!`,
          }).catch(() => {});
        } else if (gameMode === 'hotPotato') {
          pushService.sendToUser(validatedTargetId, {
            title: '🥔 Hot Potato!',
            body: `${user.name} passed the potato to you! Quick, pass it!`,
          }).catch(() => {});
        } else {
          pushService.sendToUser(validatedTargetId, pushService.notifications.youAreIt(user.name))
            .catch(() => {});
        }

        // Notify other players
        result.game.players
          .filter(p => p.id !== validatedTargetId && p.id !== user.id)
          .forEach(p => {
            pushService.sendToUser(p.id, pushService.notifications.playerTagged(
              user.name,
              taggedPlayer.name
            )).catch(() => {});
          });
      }
    } else {
      socket.emit('tag:result', { success: false, error: result.error, distance: result.distance });
    }
  });

  // Hot Potato: Handle potato explosion (timer ran out)
  socket.on('potato:exploded', async () => {
    const game = await gameManager.getPlayerGame(user.id);
    if (!game || game.gameMode !== 'hotPotato') return;

    const result = await gameManager.eliminatePotatoHolder(game.id);
    if (result.success) {
      io.to(`game:${game.id}`).emit('player:eliminated', {
        playerId: result.eliminated?.id,
        playerName: result.eliminated?.name,
        reason: 'Potato exploded!',
        newHolderId: result.newHolder?.id,
        newHolderName: result.newHolder?.name,
        potatoExpiresAt: result.game?.potatoExpiresAt,
      });

      if (result.gameEnded) {
        io.to(`game:${game.id}`).emit('game:ended', {
          game: result.game,
          winner: result.winner,
          reason: 'Last player standing!',
        });
      }
    }
  });

  // Hide and Seek: End hiding phase
  socket.on('hidePhase:end', async () => {
    const game = await gameManager.getPlayerGame(user.id);
    if (!game || game.gameMode !== 'hideAndSeek' || game.status !== 'hiding') return;
    if (game.itPlayerId !== user.id) return; // Only seeker can trigger this

    const result = await gameManager.endHidePhase(game.id);
    if (result.success) {
      io.to(`game:${game.id}`).emit('hidePhase:ended', {
        game: result.game,
      });
    }
  });

  // Request current game state
  socket.on('game:sync', async () => {
    const game = await gameManager.getPlayerGame(user.id);
    if (game) {
      socket.emit('game:state', { game });
    } else {
      socket.emit('game:state', { game: null });
    }
  });

  // Ping for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle disconnect
  socket.on('disconnect', async (reason) => {
    console.log(`User disconnected: ${user.name} (${reason})`);

    const game = await gameManager.getPlayerGame(user.id);
    if (game && game.status === 'active') {
      // Notify other players that this player went offline
      socket.to(`game:${game.id}`).emit('player:offline', {
        playerId: user.id,
        playerName: user.name,
      });
    }
  });

  // Reconnection handling
  socket.on('reconnect:game', async () => {
    const game = await gameManager.getPlayerGame(user.id);
    if (game) {
      socket.join(`game:${game.id}`);
      socket.emit('game:state', { game });

      // Notify others that player is back online
      socket.to(`game:${game.id}`).emit('player:online', {
        playerId: user.id,
        playerName: user.name,
      });
    }
  });
}
