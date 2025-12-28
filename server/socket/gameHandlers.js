/**
 * Game-related socket handlers
 * Handles joining, leaving, syncing, and inviting to games
 */

import { rateLimiter } from './utils.js';

export function setupGameHandlers(io, socket, gameManager, user) {
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

  // Request current game state
  socket.on('game:sync', async () => {
    const game = await gameManager.getPlayerGame(user.id);
    if (game) {
      socket.emit('game:state', { game });
    } else {
      socket.emit('game:state', { game: null });
    }
  });

  // Send game invite to a friend
  socket.on('game:invite', async ({ friendId, gameCode }) => {
    if (!rateLimiter.check(user.id, 'game:invite', 10)) {
      socket.emit('error:rateLimit', { event: 'game:invite', message: 'Too many invites sent' });
      return;
    }

    if (!friendId || !gameCode) {
      socket.emit('invite:error', { message: 'Friend ID and game code required' });
      return;
    }

    const game = await gameManager.getPlayerGame(user.id);
    if (!game || game.code !== gameCode) {
      socket.emit('invite:error', { message: 'You must be in the game to send invites' });
      return;
    }

    // Find the friend's socket and send them the invite
    const friendSockets = await io.fetchSockets();
    const friendSocket = friendSockets.find(s => s.user?.id === friendId);

    if (friendSocket) {
      friendSocket.emit('game:invited', {
        from: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
        gameCode,
        gameName: game.settings?.name || 'TAG Game',
        playerCount: game.players.length,
        timestamp: Date.now(),
      });
      socket.emit('invite:sent', { friendId, gameCode });
    } else {
      // Friend is offline - could send push notification here
      socket.emit('invite:sent', { friendId, gameCode, offline: true });
    }
  });
}
