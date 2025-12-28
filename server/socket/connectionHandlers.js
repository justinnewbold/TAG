/**
 * Connection-related socket handlers
 * Handles ping, disconnect, and reconnection
 */

export function setupConnectionHandlers(io, socket, gameManager, user) {
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
