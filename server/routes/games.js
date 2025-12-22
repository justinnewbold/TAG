import express from 'express';
import { validate } from '../utils/validation.js';
import { pushService } from '../services/push.js';

const router = express.Router();

// Create a new game
router.post('/', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const { settings } = req.body;

    // Validate game settings
    const validation = validate.gameSettings(settings || {});
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    const game = await gameManager.createGame(req.user, validation.settings);

    res.status(201).json({ game });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get current game for user
router.get('/current', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const game = await gameManager.getPlayerGame(req.user.id);

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
router.get('/code/:code', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');

    // Validate game code format
    const codeValidation = validate.gameCode(req.params.code);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const game = await gameManager.getGameByCode(codeValidation.code);

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
router.get('/:id', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');

    // Validate UUID format
    const idValidation = validate.uuid(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const game = await gameManager.getGame(idValidation.id);

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
router.post('/join/:code', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    // Validate game code format
    const codeValidation = validate.gameCode(req.params.code);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const result = await gameManager.joinGame(codeValidation.code, req.user);

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
router.post('/leave', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const currentGame = await gameManager.getPlayerGame(req.user.id);
    const result = await gameManager.leaveGame(req.user.id);

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
router.post('/:id/start', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    // Validate UUID format
    const idValidation = validate.uuid(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = await gameManager.startGame(idValidation.id, req.user.id);

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
router.post('/:id/end', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    // Validate UUID format
    const idValidation = validate.uuid(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = await gameManager.endGame(idValidation.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players
    const summary = await gameManager.getGameSummary(result.game.id);
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
router.post('/:id/tag/:targetId', async (req, res) => {
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

    const result = await gameManager.tagPlayer(gameIdValidation.id, req.user.id, targetIdValidation.id);

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

// Get public games (game browser)
router.get('/public/list', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const games = await gameManager.getPublicGames(20);
    res.json({ games });
  } catch (error) {
    console.error('Get public games error:', error);
    res.status(500).json({ error: 'Failed to get public games' });
  }
});

// Kick a player (host only)
router.post('/:id/players/:playerId/kick', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const gameIdValidation = validate.uuid(req.params.id);
    const playerIdValidation = validate.uuid(req.params.playerId);

    if (!gameIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    if (!playerIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const result = await gameManager.kickPlayer(
      gameIdValidation.id,
      req.user.id,
      playerIdValidation.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players including the kicked player
    io.to(`game:${result.game.id}`).emit('player:kicked', {
      playerId: playerIdValidation.id,
      playerName: result.kickedPlayer?.name,
      byHost: req.user.name,
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Kick player error:', error);
    res.status(500).json({ error: 'Failed to kick player' });
  }
});

// Ban a player (host only)
router.post('/:id/players/:playerId/ban', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const gameIdValidation = validate.uuid(req.params.id);
    const playerIdValidation = validate.uuid(req.params.playerId);

    if (!gameIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    if (!playerIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const result = await gameManager.banPlayer(
      gameIdValidation.id,
      req.user.id,
      playerIdValidation.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players
    io.to(`game:${result.game.id}`).emit('player:banned', {
      playerId: playerIdValidation.id,
      playerName: result.bannedPlayer?.name,
      byHost: req.user.name,
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Ban player error:', error);
    res.status(500).json({ error: 'Failed to ban player' });
  }
});

// Update game settings (host only)
router.patch('/:id/settings', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const gameIdValidation = validate.uuid(req.params.id);
    if (!gameIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    // Validate the new settings
    const settingsValidation = validate.gameSettings(req.body.settings || {});
    if (!settingsValidation.valid) {
      return res.status(400).json({ error: settingsValidation.errors.join(', ') });
    }

    const result = await gameManager.updateGameSettings(
      gameIdValidation.id,
      req.user.id,
      settingsValidation.settings
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players of settings change
    io.to(`game:${result.game.id}`).emit('game:settingsUpdated', {
      game: result.game,
      updatedBy: req.user.name,
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Approve a pending player (host only)
router.post('/:id/players/:playerId/approve', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const gameIdValidation = validate.uuid(req.params.id);
    const playerIdValidation = validate.uuid(req.params.playerId);

    if (!gameIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    if (!playerIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const result = await gameManager.approvePlayer(
      gameIdValidation.id,
      req.user.id,
      playerIdValidation.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify all players including the approved player
    io.to(`game:${result.game.id}`).emit('player:approved', {
      player: result.approvedPlayer,
      playerCount: result.game.players.length,
    });

    // Also emit player:joined for consistency
    io.to(`game:${result.game.id}`).emit('player:joined', {
      player: result.approvedPlayer,
      playerCount: result.game.players.length,
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Approve player error:', error);
    res.status(500).json({ error: 'Failed to approve player' });
  }
});

// Reject a pending player (host only)
router.post('/:id/players/:playerId/reject', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');

    const gameIdValidation = validate.uuid(req.params.id);
    const playerIdValidation = validate.uuid(req.params.playerId);

    if (!gameIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    if (!playerIdValidation.valid) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const result = await gameManager.rejectPlayer(
      gameIdValidation.id,
      req.user.id,
      playerIdValidation.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify the rejected player specifically
    io.to(`game:${result.game.id}`).emit('player:rejected', {
      playerId: playerIdValidation.id,
      playerName: result.rejectedPlayer?.name,
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Reject player error:', error);
    res.status(500).json({ error: 'Failed to reject player' });
  }
});

// Create rematch game
router.post('/rematch', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');
    const { originalCode, settings } = req.body;

    // Validate original game code
    const codeValidation = validate.gameCode(originalCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    // Get original game to verify host
    const originalGame = await gameManager.getGameByCode(codeValidation.code);
    if (!originalGame) {
      return res.status(404).json({ error: 'Original game not found' });
    }

    // Only host can create rematch
    if (originalGame.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only host can create rematch' });
    }

    // Create new game with same settings
    const rematchSettings = {
      mode: settings?.mode || originalGame.mode,
      tagRadius: settings?.tagRadius || originalGame.tagRadius,
      gameDuration: settings?.gameDuration || originalGame.gameDuration,
      isPublic: settings?.isPublic ?? originalGame.isPublic,
      gameName: `${originalGame.settings?.gameName || 'Game'} (Rematch)`,
      ...settings
    };

    const validation = validate.gameSettings(rematchSettings);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    const newGame = await gameManager.createGame(req.user, validation.settings);

    // Notify players from original game about rematch
    io.to(`game:${originalGame.id}`).emit('rematch:created', {
      originalCode: originalGame.code,
      game: {
        id: newGame.id,
        code: newGame.code,
        hostName: newGame.hostName
      }
    });

    res.status(201).json({ game: newGame });
  } catch (error) {
    console.error('Rematch error:', error);
    res.status(500).json({ error: 'Failed to create rematch' });
  }
});

// Get public games
router.get('/public', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const games = await gameManager.getPublicGames();
    
    res.json({ games });
  } catch (error) {
    console.error('Get public games error:', error);
    res.status(500).json({ error: 'Failed to get public games' });
  }
});

// Spectate a game
router.post('/spectate', async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const io = req.app.get('io');
    const { code } = req.body;

    const codeValidation = validate.gameCode(code);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const result = await gameManager.spectateGame(codeValidation.code, req.user);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Notify game about new spectator
    io.to(`game:${result.game.id}`).emit('spectator:joined', {
      spectator: {
        id: req.user.id,
        name: req.user.name
      }
    });

    res.json({ game: result.game });
  } catch (error) {
    console.error('Spectate error:', error);
    res.status(500).json({ error: 'Failed to spectate game' });
  }
});

export { router as gameRouter };
