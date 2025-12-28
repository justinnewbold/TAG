/**
 * Tag-related socket handlers
 * Handles tag attempts, special game mode events
 */

import { validate } from '../utils/validation.js';
import { pushService } from '../services/push.js';
import { SOCKET_RATE_LIMITS } from '../../shared/constants.js';
import { rateLimiter } from './utils.js';

export function setupTagHandlers(io, socket, gameManager, user) {
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
      handleSuccessfulTag(io, socket, game, result, user, targetValidation.id);
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
}

/**
 * Handle a successful tag - emit events and send notifications
 */
function handleSuccessfulTag(io, socket, game, result, user, targetId) {
  const taggedPlayer = result.game.players.find(p => p.id === targetId);
  const gameMode = result.game.gameMode || 'classic';

  // Build tag event with game mode specific data
  const tagEvent = {
    taggerId: user.id,
    taggerName: user.name,
    taggedId: targetId,
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
      reason: getGameEndReason(gameMode, result.winner),
    });
  }

  // Send push notifications
  sendTagNotifications(result, user, taggedPlayer, gameMode, targetId);
}

function getGameEndReason(gameMode, winner) {
  switch (gameMode) {
    case 'infection': return 'All players infected!';
    case 'teamTag': return `Team ${winner?.team} wins!`;
    case 'freezeTag': return 'All players frozen!';
    default: return 'Game over!';
  }
}

function sendTagNotifications(result, user, taggedPlayer, gameMode, targetId) {
  if (!taggedPlayer) return;

  // Notification for the tagged player
  const notification = getTagNotification(gameMode, user.name, result.tag);
  if (notification) {
    pushService.sendToUser(targetId, notification).catch(() => {});
  }

  // Notify other players
  result.game.players
    .filter(p => p.id !== targetId && p.id !== user.id)
    .forEach(p => {
      pushService.sendToUser(p.id, pushService.notifications.playerTagged(
        user.name,
        taggedPlayer.name
      )).catch(() => {});
    });
}

function getTagNotification(gameMode, taggerName, tag) {
  switch (gameMode) {
    case 'freezeTag':
      if (tag?.type === 'unfreeze') {
        return { title: '❄️ Unfrozen!', body: `${taggerName} unfroze you! Get moving!` };
      }
      return null;
    case 'infection':
      return { title: '🧟 Infected!', body: `${taggerName} infected you! Spread it to others!` };
    case 'teamTag':
      return { title: '💀 Eliminated!', body: `${taggerName} eliminated you!` };
    case 'hotPotato':
      return { title: '🥔 Hot Potato!', body: `${taggerName} passed the potato to you! Quick, pass it!` };
    default:
      return pushService.notifications.youAreIt(taggerName);
  }
}
