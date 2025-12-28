/**
 * Location-related socket handlers
 * Handles location updates, proximity checks, and anti-cheat
 */

import { validate } from '../utils/validation.js';
import { pushService } from '../services/push.js';
import { getDistance } from '../../shared/utils.js';
import { SOCKET_RATE_LIMITS } from '../../shared/constants.js';
import { rateLimiter, locationTracker } from './utils.js';

export function setupLocationHandlers(io, socket, gameManager, user) {
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
      handleProximityChecks(socket, game, user, validLocation);
    }
  });
}

/**
 * Handle proximity checks based on game mode
 */
function handleProximityChecks(socket, game, user, location) {
  const gameMode = game.gameMode || 'classic';

  if (gameMode === 'infection') {
    handleInfectionProximity(socket, game, user, location);
  } else if (gameMode === 'teamTag') {
    handleTeamTagProximity(socket, game, user, location);
  } else if (game.itPlayerId === user.id) {
    handleItPlayerProximity(socket, game, user, location);
  } else if (game.itPlayerId) {
    handleNonItPlayerProximity(socket, game, user, location);
  }
}

function handleInfectionProximity(socket, game, user, location) {
  const currentPlayer = game.players.find(p => p.id === user.id);
  if (currentPlayer?.isIt) {
    const nearbySurvivors = game.players
      .filter(p => !p.isIt && p.location)
      .map(p => ({
        id: p.id,
        name: p.name,
        distance: getDistance(location.lat, location.lng, p.location.lat, p.location.lng),
      }))
      .filter(p => p.distance <= game.settings.tagRadius * 2)
      .sort((a, b) => a.distance - b.distance);

    if (nearbySurvivors.length > 0) {
      socket.emit('nearby:players', { players: nearbySurvivors });
    }
  }
}

function handleTeamTagProximity(socket, game, user, location) {
  const currentPlayer = game.players.find(p => p.id === user.id);
  if (currentPlayer && !currentPlayer.isEliminated) {
    const nearbyEnemies = game.players
      .filter(p => p.team !== currentPlayer.team && !p.isEliminated && p.location)
      .map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        distance: getDistance(location.lat, location.lng, p.location.lat, p.location.lng),
      }))
      .filter(p => p.distance <= game.settings.tagRadius * 2)
      .sort((a, b) => a.distance - b.distance);

    if (nearbyEnemies.length > 0) {
      socket.emit('nearby:players', { players: nearbyEnemies });
    }
  }
}

function handleItPlayerProximity(socket, game, user, location) {
  const nearbyPlayers = game.players
    .filter(p => p.id !== user.id && p.location && !p.isFrozen && !p.isEliminated)
    .map(p => ({
      id: p.id,
      name: p.name,
      distance: getDistance(location.lat, location.lng, p.location.lat, p.location.lng),
    }))
    .filter(p => p.distance <= game.settings.tagRadius * 2)
    .sort((a, b) => a.distance - b.distance);

  if (nearbyPlayers.length > 0) {
    socket.emit('nearby:players', { players: nearbyPlayers });
  }
}

function handleNonItPlayerProximity(socket, game, user, location) {
  const itPlayer = game.players.find(p => p.id === game.itPlayerId);
  if (itPlayer?.location) {
    const distance = getDistance(
      location.lat, location.lng,
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
