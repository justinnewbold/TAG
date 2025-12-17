export function setupSocketHandlers(io, socket, gameManager) {
  const user = socket.user;

  // Join game room when connecting
  const currentGame = gameManager.getPlayerGame(user.id);
  if (currentGame) {
    socket.join(`game:${currentGame.id}`);
    console.log(`${user.name} rejoined game room: ${currentGame.code}`);
  }

  // Join a game room
  socket.on('game:join', (gameId) => {
    const game = gameManager.getGame(gameId);
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

  // Update player location
  socket.on('location:update', (location) => {
    const game = gameManager.updatePlayerLocation(user.id, location);

    if (game && game.status === 'active') {
      // Broadcast location to other players in the game
      socket.to(`game:${game.id}`).emit('player:location', {
        playerId: user.id,
        location,
        timestamp: Date.now(),
      });

      // Check for potential tag opportunities (notify IT player)
      if (game.itPlayerId === user.id) {
        // IT player moved - check distances to all other players
        const nearbyPlayers = game.players
          .filter(p => p.id !== user.id && p.location)
          .map(p => ({
            id: p.id,
            name: p.name,
            distance: getDistance(
              location.lat, location.lng,
              p.location.lat, p.location.lng
            ),
          }))
          .filter(p => p.distance <= game.settings.tagRadius * 2) // Within 2x tag radius
          .sort((a, b) => a.distance - b.distance);

        if (nearbyPlayers.length > 0) {
          socket.emit('nearby:players', { players: nearbyPlayers });
        }
      } else if (game.itPlayerId) {
        // Non-IT player moved - check distance to IT
        const itPlayer = game.players.find(p => p.id === game.itPlayerId);
        if (itPlayer?.location) {
          const distance = getDistance(
            location.lat, location.lng,
            itPlayer.location.lat, itPlayer.location.lng
          );

          if (distance <= game.settings.tagRadius * 2) {
            // Alert player that IT is nearby
            socket.emit('it:nearby', {
              distance,
              inRange: distance <= game.settings.tagRadius,
            });
          }
        }
      }
    }
  });

  // Tag attempt via WebSocket (alternative to REST)
  socket.on('tag:attempt', ({ targetId }) => {
    const game = gameManager.getPlayerGame(user.id);
    if (!game) {
      socket.emit('tag:result', { success: false, error: 'Not in a game' });
      return;
    }

    const result = gameManager.tagPlayer(game.id, user.id, targetId);

    if (result.success) {
      // Notify all players in the game
      io.to(`game:${game.id}`).emit('player:tagged', {
        taggerId: user.id,
        taggerName: user.name,
        taggedId: targetId,
        taggedName: result.game.players.find(p => p.id === targetId)?.name,
        newItPlayerId: result.game.itPlayerId,
        tagTime: result.tagTime,
        tag: result.tag,
      });

      socket.emit('tag:result', { success: true, tagTime: result.tagTime });
    } else {
      socket.emit('tag:result', { success: false, error: result.error, distance: result.distance });
    }
  });

  // Request current game state
  socket.on('game:sync', () => {
    const game = gameManager.getPlayerGame(user.id);
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
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${user.name} (${reason})`);

    const game = gameManager.getPlayerGame(user.id);
    if (game && game.status === 'active') {
      // Notify other players that this player went offline
      socket.to(`game:${game.id}`).emit('player:offline', {
        playerId: user.id,
        playerName: user.name,
      });
    }
  });

  // Reconnection handling
  socket.on('reconnect:game', () => {
    const game = gameManager.getPlayerGame(user.id);
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

// Haversine formula (duplicated for socket handlers - could be moved to shared utils)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
