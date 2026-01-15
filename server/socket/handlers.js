import { validate } from '../utils/validation.js';
import { pushService } from '../services/push.js';
import { getDistance, calculateSpeed, isValidSpeed } from '../shared/utils.js';
import { ANTI_CHEAT, SOCKET_RATE_LIMITS } from '../shared/constants.js';
import { enhancedFeatures } from '../game/EnhancedFeatures.js';
import { logger } from '../utils/logger.js';

// Rate limiter for socket events with retry-after support
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

    const allowed = eventData.count <= limit;
    const retryAfter = allowed ? 0 : Math.ceil((eventData.resetTime - now) / 1000);
    const remaining = Math.max(0, limit - eventData.count);

    return { allowed, retryAfter, remaining, limit };
  }

  // Get current rate limit status without incrementing
  getStatus(userId, eventType, limit) {
    const now = Date.now();
    const userEvents = this.events.get(userId);
    if (!userEvents) return { remaining: limit, resetIn: 60 };

    const eventData = userEvents.get(eventType);
    if (!eventData || now > eventData.resetTime) return { remaining: limit, resetIn: 60 };

    return {
      remaining: Math.max(0, limit - eventData.count),
      resetIn: Math.ceil((eventData.resetTime - now) / 1000)
    };
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
    this.MAX_TRACKED_PLAYERS = 10000; // Prevent unbounded growth
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

        logger.warn('AntiCheat violation detected', { playerId, reason: cheatCheck.reason, speed: speed.toFixed(1), violations: violations.count });
      }
    }

    // Prevent unbounded growth - force cleanup if too many entries
    if (this.history.size >= this.MAX_TRACKED_PLAYERS) {
      this.cleanup();
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

  // Remove tracking for a specific player (on disconnect)
  removePlayer(playerId) {
    this.history.delete(playerId);
    this.violations.delete(playerId);
  }

  // Cleanup old entries periodically (players inactive for 5+ minutes)
  cleanup() {
    const now = Date.now();
    const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes (reduced from 10)
    let historyRemoved = 0;
    let violationsRemoved = 0;

    for (const [playerId, data] of this.history) {
      if (now - data.timestamp > STALE_THRESHOLD) {
        this.history.delete(playerId);
        historyRemoved++;
      }
    }

    for (const [playerId, data] of this.violations) {
      if (now - data.lastViolation > STALE_THRESHOLD) {
        this.violations.delete(playerId);
        violationsRemoved++;
      }
    }

    // Log cleanup stats for monitoring
    if (historyRemoved > 0 || violationsRemoved > 0) {
      logger.debug('LocationTracker cleanup completed', { historyRemoved, violationsRemoved, trackedPlayers: this.history.size });
    }
  }

  // Get stats for monitoring
  getStats() {
    return {
      trackedPlayers: this.history.size,
      playersWithViolations: this.violations.size,
      maxCapacity: this.MAX_TRACKED_PLAYERS,
    };
  }
}

// Global instances
const rateLimiter = new RateLimiter();
const locationTracker = new LocationTracker();

// Cleanup rate limiter and location tracker every 2 minutes
setInterval(() => {
  rateLimiter.cleanup();
  locationTracker.cleanup();
}, 120000);

export function setupSocketHandlers(io, socket, gameManager) {
  const user = socket.user;

  // Join game room when connecting (async IIFE for initial setup)
  (async () => {
    try {
      const currentGame = await gameManager.getPlayerGame(user.id);
      if (currentGame) {
        socket.join(`game:${currentGame.id}`);
        logger.debug('User rejoined game room', { userId: user.id, userName: user.name, gameCode: currentGame.code });
      }
    } catch (err) {
      logger.error('Failed to rejoin game', { userId: user.id, userName: user.name, error: err.message });
    }
  })();

  // Join a game room
  socket.on('game:join', async (gameId) => {
    const game = await gameManager.getGame(gameId);
    if (game && game.players.some(p => p.id === user.id)) {
      socket.join(`game:${gameId}`);
      logger.debug('User joined game room', { userId: user.id, userName: user.name, gameCode: game.code });

      // Send current game state to the joining player
      socket.emit('game:state', { game });
    }
  });

  // Leave game room
  socket.on('game:leave', (gameId) => {
    socket.leave(`game:${gameId}`);
    logger.debug('User left game room', { userId: user.id, userName: user.name });
  });

  // Update player location (synchronous for performance - uses cache only)
  socket.on('location:update', (location) => {
    // Rate limiting check with retry-after info
    const rateCheck = rateLimiter.check(user.id, 'location:update', SOCKET_RATE_LIMITS.LOCATION_UPDATE);
    if (!rateCheck.allowed) {
      socket.emit('error:rateLimit', {
        event: 'location:update',
        message: 'Too many location updates',
        retryAfter: rateCheck.retryAfter,
        remaining: rateCheck.remaining,
      });
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
    // Rate limiting check with retry-after info
    const rateCheck = rateLimiter.check(user.id, 'tag:attempt', SOCKET_RATE_LIMITS.TAG_ATTEMPT);
    if (!rateCheck.allowed) {
      socket.emit('tag:result', {
        success: false,
        error: 'Too many tag attempts. Please wait.',
        retryAfter: rateCheck.retryAfter,
      });
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
    // Rate limit sync requests to prevent abuse
    const rateCheck = rateLimiter.check(user.id, 'game:sync', 30); // 30 syncs per minute
    if (!rateCheck.allowed) {
      socket.emit('error:rateLimit', {
        event: 'game:sync',
        message: 'Too many sync requests',
        retryAfter: rateCheck.retryAfter,
      });
      return;
    }

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
    logger.info('User disconnected', { userId: user.id, userName: user.name, reason });

    // Clean up location tracker data for this player
    locationTracker.removePlayer(user.id);

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

  // ============================================
  // Game Invite System
  // ============================================

  // Send a game invite to a friend
  socket.on('game:invite:send', async ({ friendId, gameCode }) => {
    // Rate limit invites
    const rateCheck = rateLimiter.check(user.id, 'game:invite', 10); // 10 invites per minute
    if (!rateCheck.allowed) {
      socket.emit('game:invite:error', {
        error: 'Too many invites sent. Please wait.',
        retryAfter: rateCheck.retryAfter,
      });
      return;
    }

    // Validate inputs
    if (!friendId || !gameCode) {
      socket.emit('game:invite:error', { error: 'Missing friendId or gameCode' });
      return;
    }

    // Verify game exists and user is in it
    const game = await gameManager.getGameByCode(gameCode);
    if (!game) {
      socket.emit('game:invite:error', { error: 'Game not found' });
      return;
    }

    if (!game.players.some(p => p.id === user.id)) {
      socket.emit('game:invite:error', { error: 'You are not in this game' });
      return;
    }

    if (game.status !== 'waiting') {
      socket.emit('game:invite:error', { error: 'Game has already started' });
      return;
    }

    // Find the target user's socket
    const targetSockets = await io.fetchSockets();
    const targetSocket = targetSockets.find(s => s.user?.id === friendId);

    if (targetSocket) {
      // Send invite to target user
      targetSocket.emit('game:invite', {
        inviteId: `${user.id}-${friendId}-${Date.now()}`,
        fromId: user.id,
        fromName: user.name,
        fromAvatar: user.avatar,
        gameCode: gameCode,
        gameName: game.settings?.gameName || 'TAG! Game',
        playerCount: game.players.length,
        maxPlayers: game.settings?.maxPlayers || 10,
        timestamp: Date.now(),
      });

      socket.emit('game:invite:sent', {
        success: true,
        friendId,
        message: 'Invite sent successfully',
      });

      logger.info('Game invite sent', { fromUserId: user.id, fromUserName: user.name, toUserId: friendId, gameCode });
    } else {
      // Target user is offline - could store for later or send push notification
      pushService.sendToUser(friendId, {
        title: '🎮 Game Invite!',
        body: `${user.name} invited you to join their TAG! game`,
        data: { type: 'game_invite', gameCode, fromId: user.id, fromName: user.name },
      }).catch(() => {});

      socket.emit('game:invite:sent', {
        success: true,
        friendId,
        message: 'Invite sent (user is offline, push notification sent)',
      });
    }
  });

  // Respond to a game invite
  socket.on('game:invite:respond', async ({ inviteId, accept, gameCode }) => {
    if (!inviteId) {
      socket.emit('game:invite:error', { error: 'Missing invite ID' });
      return;
    }

    // Parse the invite ID to get sender info
    const [senderId] = inviteId.split('-');

    // Find sender's socket to notify them
    const senderSockets = await io.fetchSockets();
    const senderSocket = senderSockets.find(s => s.user?.id === senderId);

    if (accept && gameCode) {
      // Join the game via API
      socket.emit('game:invite:response', {
        inviteId,
        accepted: true,
        message: 'Use the game code to join',
        gameCode,
      });
    } else {
      socket.emit('game:invite:response', {
        inviteId,
        accepted: false,
        message: 'Invite declined',
      });
    }

    // Notify sender of the response
    if (senderSocket) {
      senderSocket.emit('game:invite:responded', {
        inviteId,
        responderId: user.id,
        responderName: user.name,
        accepted: accept,
      });
    }
  });

  // ============================================
  // Enhanced Features - Taunt & Ping System
  // ============================================

  // Send taunt to another player
  socket.on('action:taunt', async ({ targetId, type = 'taunt' }) => {
    const game = await gameManager.getPlayerGame(user.id);
    if (!game) return;

    const result = enhancedFeatures.processTaunt(user.id, targetId, game.id);

    if (result.success) {
      // Find target socket and send taunt
      const targetSockets = await io.fetchSockets();
      const targetSocket = targetSockets.find(s => s.user?.id === targetId);

      if (targetSocket) {
        targetSocket.emit('taunt:received', {
          fromId: user.id,
          fromName: user.name,
          type,
          timestamp: Date.now(),
          vibrationPattern: [100, 50, 100, 50, 200],
        });
      }

      socket.emit('action:result', { action: 'taunt', success: true });
    } else {
      socket.emit('action:result', {
        action: 'taunt',
        success: false,
        error: result.error,
        cooldownRemaining: result.remainingTime,
      });
    }
  });

  // Create decoy ping
  socket.on('action:decoy', async ({ location }) => {
    const game = await gameManager.getPlayerGame(user.id);
    if (!game) return;

    const decoy = enhancedFeatures.createDecoy(user.id, location, game.id);

    // Broadcast decoy to all players (appears as fake player position)
    io.to(`game:${game.id}`).emit('decoy:created', {
      ...decoy,
      creatorName: user.name,
    });

    socket.emit('action:result', { action: 'decoy', success: true, decoy });
  });

  // Send SOS alert
  socket.on('action:sos', async ({ location, message }) => {
    const game = await gameManager.getPlayerGame(user.id);
    if (!game) return;

    const sos = enhancedFeatures.createSOS(user.id, location, game.id);

    // Broadcast to all allies (non-IT players)
    const currentPlayer = game.players.find(p => p.id === user.id);

    game.players
      .filter(p => p.id !== user.id && !p.isIt)
      .forEach(async (p) => {
        const targetSockets = await io.fetchSockets();
        const targetSocket = targetSockets.find(s => s.user?.id === p.id);

        if (targetSocket) {
          targetSocket.emit('sos:received', {
            ...sos,
            fromId: user.id,
            fromName: user.name,
            message: message || 'Help! Being chased!',
          });
        }
      });

    socket.emit('action:result', { action: 'sos', success: true, sos });
  });

  // ============================================
  // Enhanced Features - Ambush Points
  // ============================================

  // Place ambush point
  socket.on('ambush:place', async ({ location, name }) => {
    const result = enhancedFeatures.placeAmbush(user.id, location, { name });

    if (result.success) {
      socket.emit('ambush:placed', result.ambush);
    } else {
      socket.emit('ambush:error', { error: result.error });
    }
  });

  // Remove ambush point
  socket.on('ambush:remove', ({ ambushId }) => {
    const playerPoints = enhancedFeatures.ambushPoints.get(user.id) || [];
    const index = playerPoints.findIndex(p => p.id === ambushId);

    if (index !== -1) {
      playerPoints.splice(index, 1);
      enhancedFeatures.ambushPoints.set(user.id, playerPoints);
      socket.emit('ambush:removed', { ambushId });
    }
  });

  // ============================================
  // Enhanced Features - Territory System
  // ============================================

  // Start territory claim
  socket.on('territory:claim:start', ({ location, name }) => {
    const result = enhancedFeatures.startTerritoryClaim(user.id, location, name);

    if (result.error) {
      socket.emit('territory:error', { error: result.error });
    } else {
      socket.emit('territory:claim:started', result);
    }
  });

  // Complete territory claim
  socket.on('territory:claim:complete', ({ claimId, location, name }) => {
    const territory = enhancedFeatures.completeTerritoryClaim(user.id, claimId, location, name);
    socket.emit('territory:claimed', territory);
  });

  // ============================================
  // Enhanced Features - Ghost Trail & Showdown
  // ============================================

  // Enhanced location update with ghost trail recording
  socket.on('location:enhanced', async (location) => {
    const locationValidation = validate.location(location);
    if (!locationValidation.valid) return;

    const validLocation = { lat: locationValidation.lat, lng: locationValidation.lng };

    // Record for ghost trail
    enhancedFeatures.recordLocation(user.id, validLocation);

    // Update momentum
    enhancedFeatures.updateMomentum(user.id, validLocation);

    // Check ambush triggers if this player is IT
    const game = gameManager.getPlayerGameSync(user.id);
    if (game && game.itPlayerId === user.id) {
      const triggers = enhancedFeatures.checkAmbushTriggers(user.id, validLocation);

      for (const trigger of triggers) {
        // Notify the ambush owner
        const ownerSockets = await io.fetchSockets();
        const ownerSocket = ownerSockets.find(s => s.user?.id === trigger.playerId);

        if (ownerSocket) {
          ownerSocket.emit('ambush:triggered', {
            ambush: trigger.ambush,
            distance: trigger.distance,
            timestamp: trigger.timestamp,
          });
        }
      }

      // Check territory warnings for all non-IT players
      for (const player of game.players) {
        if (player.id === user.id) continue;

        const warnings = enhancedFeatures.checkTerritoryWarnings(player.id, validLocation);
        if (warnings.length > 0) {
          const targetSockets = await io.fetchSockets();
          const targetSocket = targetSockets.find(s => s.user?.id === player.id);

          if (targetSocket) {
            targetSocket.emit('territory:warning', { warnings });
          }
        }
      }
    }

    // Check for showdown with IT
    if (game && game.status === 'active' && !game.players.find(p => p.id === user.id)?.isIt) {
      const itPlayer = game.players.find(p => p.isIt);
      if (itPlayer?.location) {
        const distance = getDistance(
          validLocation.lat, validLocation.lng,
          itPlayer.location.lat, itPlayer.location.lng
        );

        const showdownResult = enhancedFeatures.checkShowdown(
          game.itPlayerId,
          user.id,
          distance
        );

        if (showdownResult.started) {
          // Notify both players
          socket.emit('showdown:started', {
            showdown: showdownResult.showdown,
            isIt: false,
          });

          const itSockets = await io.fetchSockets();
          const itSocket = itSockets.find(s => s.user?.id === game.itPlayerId);
          if (itSocket) {
            itSocket.emit('showdown:started', {
              showdown: showdownResult.showdown,
              isIt: true,
              targetName: user.name,
            });
          }
        } else if (showdownResult.ended) {
          socket.emit('showdown:ended', { showdown: showdownResult.showdown });

          const itSockets = await io.fetchSockets();
          const itSocket = itSockets.find(s => s.user?.id === game.itPlayerId);
          if (itSocket) {
            itSocket.emit('showdown:ended', { showdown: showdownResult.showdown });
          }
        }
      }
    }
  });

  // Get delayed location (for IT viewing other players)
  socket.on('location:delayed:get', ({ playerId }) => {
    const delayed = enhancedFeatures.getDelayedLocation(playerId);
    const trail = enhancedFeatures.getGhostTrail(playerId);

    socket.emit('location:delayed', {
      playerId,
      location: delayed,
      trail,
    });
  });

  // Get momentum status
  socket.on('momentum:get', () => {
    const momentum = enhancedFeatures.momentum.get(user.id);
    const multiplier = enhancedFeatures.getGPSMultiplier(user.id);

    socket.emit('momentum:status', {
      ...momentum,
      gpsMultiplier: multiplier,
    });
  });
}
