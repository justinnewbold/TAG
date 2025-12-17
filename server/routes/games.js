import express from 'express';

const router = express.Router();

// Create a new game
router.post('/', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const { settings } = req.body;

    const game = gameManager.createGame(req.user, settings || {});

    res.status(201).json({ game });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get current game for user
router.get('/current', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const game = gameManager.getPlayerGame(req.user.id);

    if (!game) {
      return res.status(404).json({ error: 'Not in a game' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Get current game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Get game by code (for joining)
router.get('/code/:code', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const game = gameManager.getGameByCode(req.params.code);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Return limited info for non-players
    const isPlayer = game.players.some(p => p.id === req.user.id);

    if (!isPlayer) {
      return res.json({
        game: {
          id: game.id,
          code: game.code,
          hostName: game.hostName,
          status: game.status,
          playerCount: game.players.length,
          maxPlayers: game.settings.maxPlayers,
          gameName: game.settings.gameName,
        }
      });
    }

    res.json({ game });
  } catch (error) {
    console.error('Get game by code error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Get game by ID
router.get('/:id', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const game = gameManager.getGame(req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Only players can see full game details
    const isPlayer = game.players.some(p => p.id === req.user.id);

    if (!isPlayer) {
      return res.status(403).json({ error: 'Not a player in this game' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Join a game
router.post('/join/:code', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const result = gameManager.joinGame(req.params.code, req.user);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify other players via WebSocket
    if (!result.alreadyJoined) {
      io.to(`game:${result.game.id}`).emit('player:joined', {
        player: {
          id: req.user.id,
          name: req.user.name,
          avatar: req.user.avatar,
        },
        playerCount: result.game.players.length,
      });
    }

    res.json({ game: result.game });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Leave current game
router.post('/leave', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const currentGame = gameManager.getPlayerGame(req.user.id);
    const result = gameManager.leaveGame(req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify other players
    if (currentGame) {
      io.to(`game:${currentGame.id}`).emit('player:left', {
        playerId: req.user.id,
        playerName: req.user.name,
        newHost: result.game?.host,
        playerCount: result.game?.players.length || 0,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Leave game error:', error);
    res.status(500).json({ error: 'Failed to leave game' });
  }
});

// Start game (host only)
router.post('/:id/start', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const result = gameManager.startGame(req.params.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players
    io.to(`game:${result.game.id}`).emit('game:started', {
      game: result.game,
      itPlayerId: result.game.itPlayerId,
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// End game (host only)
router.post('/:id/end', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const result = gameManager.endGame(req.params.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players
    io.to(`game:${result.game.id}`).emit('game:ended', {
      game: result.game,
      winnerId: result.game.winnerId,
      winnerName: result.game.winnerName,
      summary: gameManager.getGameSummary(result.game.id),
    });

    res.json({
      game: result.game,
      summary: gameManager.getGameSummary(result.game.id),
    });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

// Tag a player
router.post('/:id/tag/:targetId', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const result = gameManager.tagPlayer(req.params.id, req.user.id, req.params.targetId);

    if (!result.success) {
      return res.status(400).json({ error: result.error, distance: result.distance });
    }

    // Notify all players
    io.to(`game:${result.game.id}`).emit('player:tagged', {
      taggerId: req.user.id,
      taggerName: req.user.name,
      taggedId: req.params.targetId,
      taggedName: result.game.players.find(p => p.id === req.params.targetId)?.name,
      newItPlayerId: result.game.itPlayerId,
      tagTime: result.tagTime,
      tag: result.tag,
    });

    res.json({
      success: true,
      game: result.game,
      tagTime: result.tagTime,
    });
  } catch (error) {
    console.error('Tag player error:', error);
    res.status(500).json({ error: 'Failed to tag player' });
  }
});

export { router as gameRouter };
