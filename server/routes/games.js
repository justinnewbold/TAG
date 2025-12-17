import express from 'express';
import { validate } from '../utils/validation.js';
import { pushService } from '../services/push.js';

const router = express.Router();

// Create a new game
router.post('/', (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const { settings } = req.body;

    // Validate game settings
    const validation = validate.gameSettings(settings || {});
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    const game = gameManager.createGame(req.user, validation.settings);

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

    // Validate game code format
    const codeValidation = validate.gameCode(req.params.code);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const game = gameManager.getGameByCode(codeValidation.code);

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

    // Validate UUID format
    const idValidation = validate.uuid(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const game = gameManager.getGame(idValidation.id);

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

    // Validate game code format
    const codeValidation = validate.gameCode(req.params.code);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const result = gameManager.joinGame(codeValidation.code, req.user);

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

    // Validate UUID format
    const idValidation = validate.uuid(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = gameManager.startGame(idValidation.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players
    io.to(`game:${result.game.id}`).emit('game:started', {
      game: result.game,
      itPlayerId: result.game.itPlayerId,
    });

    // Send push notifications to all players (fire and forget)
    const itPlayer = result.game.players.find(p => p.id === result.game.itPlayerId);
    result.game.players.forEach(player => {
      if (player.id === result.game.itPlayerId) {
        pushService.sendToUser(player.id, pushService.notifications.youAreIt())
          .catch(() => {});
      } else {
        pushService.sendToUser(player.id, pushService.notifications.gameStarting(
          result.game.settings.gameName || 'TAG!',
          itPlayer?.name || 'Someone'
        )).catch(() => {});
      }
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

    // Validate UUID format
    const idValidation = validate.uuid(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = gameManager.endGame(idValidation.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players
    const summary = gameManager.getGameSummary(result.game.id);
    io.to(`game:${result.game.id}`).emit('game:ended', {
      game: result.game,
      winnerId: result.game.winnerId,
      winnerName: result.game.winnerName,
      summary,
    });

    // Send push notifications about game ending (fire and forget)
    result.game.players.forEach(player => {
      pushService.sendToUser(player.id, pushService.notifications.gameEnded(
        result.game.winnerName || 'Unknown'
      )).catch(() => {});
    });

    res.json({
      game: result.game,
      summary,
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

    // Validate UUIDs
    const gameIdValidation = validate.uuid(req.params.id);
    const targetIdValidation = validate.uuid(req.params.targetId);

    if (!gameIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    if (!targetIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid target ID' });
    }

    const result = gameManager.tagPlayer(gameIdValidation.id, req.user.id, targetIdValidation.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error, distance: result.distance });
    }

    const taggedPlayer = result.game.players.find(p => p.id === targetIdValidation.id);

    // Notify all players
    io.to(`game:${result.game.id}`).emit('player:tagged', {
      taggerId: req.user.id,
      taggerName: req.user.name,
      taggedId: targetIdValidation.id,
      taggedName: taggedPlayer?.name,
      newItPlayerId: result.game.itPlayerId,
      tagTime: result.tagTime,
      tag: result.tag,
    });

    // Send push notification to tagged player (fire and forget)
    if (taggedPlayer) {
      pushService.sendToUser(targetIdValidation.id, pushService.notifications.youAreIt(req.user.name))
        .catch(() => {});

      // Notify other players
      result.game.players
        .filter(p => p.id !== targetIdValidation.id && p.id !== req.user.id)
        .forEach(p => {
          pushService.sendToUser(p.id, pushService.notifications.playerTagged(
            req.user.name,
            taggedPlayer.name
          )).catch(() => {});
        });
    }

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
