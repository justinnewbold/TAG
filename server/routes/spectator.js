/**
 * Spectator Mode Routes
 * Live game watching, commentary, replays
 */

import express from 'express';

const router = express.Router();

// Get live games available for spectating
router.get('/live', async (req, res) => {
  try {
    const { gameMode, featured, page = 1, limit = 20 } = req.query;

    const games = Array.from({ length: limit }, (_, i) => ({
      gameId: `game_${i}`,
      name: `Game ${i + 1}`,
      mode: ['standard', 'battleRoyale', 'globalBattleRoyale'][i % 3],
      players: 8 + Math.floor(Math.random() * 12),
      spectators: Math.floor(Math.random() * 50),
      startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      featured: i < 3,
      hunterCount: 2 + Math.floor(Math.random() * 3),
      runnerCount: 6 + Math.floor(Math.random() * 8),
    }));

    res.json({
      games,
      page: parseInt(page),
      totalPages: 10,
      totalGames: 200,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join as spectator
router.post('/join/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { spectatorId } = req.body;

    res.json({
      success: true,
      gameId,
      spectatorId,
      spectatorToken: `spec_token_${Date.now()}`,
      gameState: {
        status: 'in_progress',
        timeRemaining: 600,
        players: [],
        zone: { center: { lat: 0, lng: 0 }, radius: 1000 },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave spectating
router.post('/leave/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { spectatorId } = req.body;

    res.json({
      success: true,
      message: 'Left spectator mode',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game state for spectators
router.get('/state/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    res.json({
      gameId,
      status: 'in_progress',
      timeRemaining: 450,
      players: [
        { id: 'p1', name: 'Hunter1', role: 'hunter', lat: 40.7128, lng: -74.0060, tags: 3 },
        { id: 'p2', name: 'Runner1', role: 'runner', lat: 40.7138, lng: -74.0070, alive: true },
        { id: 'p3', name: 'Runner2', role: 'runner', lat: 40.7148, lng: -74.0080, alive: true },
      ],
      zone: {
        center: { lat: 40.7128, lng: -74.0060 },
        radius: 500,
        nextShrink: 120,
      },
      events: [],
      spectatorCount: 25,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get live commentary
router.get('/commentary/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { since } = req.query;

    const commentary = [
      { id: 'c1', timestamp: Date.now() - 30000, text: 'Hunter1 is closing in on Runner2!', type: 'chase' },
      { id: 'c2', timestamp: Date.now() - 20000, text: 'Runner1 just grabbed a speed boost!', type: 'powerup' },
      { id: 'c3', timestamp: Date.now() - 10000, text: 'The safe zone is shrinking - 3 runners still alive', type: 'zone' },
    ];

    res.json({
      commentary,
      lastTimestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow specific player
router.post('/follow/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { spectatorId, playerId } = req.body;

    res.json({
      success: true,
      following: playerId,
      playerInfo: {
        id: playerId,
        name: 'Player Name',
        role: 'hunter',
        stats: { tags: 3, distance: 2500 },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available camera views
router.get('/cameras/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const cameras = [
      { id: 'overview', name: 'Overview', type: 'map', description: 'Full map view' },
      { id: 'action', name: 'Action Cam', type: 'auto', description: 'Follows the action' },
      { id: 'player_1', name: 'Hunter1', type: 'player', playerId: 'p1' },
      { id: 'player_2', name: 'Runner1', type: 'player', playerId: 'p2' },
      { id: 'player_3', name: 'Runner2', type: 'player', playerId: 'p3' },
    ];

    res.json({ cameras });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set camera view
router.post('/camera/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { spectatorId, cameraId } = req.body;

    res.json({
      success: true,
      cameraId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ REPLAYS ============

// Get available replays
router.get('/replays', async (req, res) => {
  try {
    const { featured, userId, page = 1, limit = 20 } = req.query;

    const replays = Array.from({ length: limit }, (_, i) => ({
      id: `replay_${i}`,
      gameId: `game_${i}`,
      title: `Epic Game ${i + 1}`,
      duration: 300 + Math.floor(Math.random() * 600),
      playerCount: 8 + Math.floor(Math.random() * 12),
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 100),
      recordedAt: new Date(Date.now() - i * 86400000).toISOString(),
      thumbnail: `/thumbnails/replay_${i}.jpg`,
      featured: i < 3,
    }));

    res.json({
      replays,
      page: parseInt(page),
      totalPages: 50,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get replay data
router.get('/replay/:replayId', async (req, res) => {
  try {
    const { replayId } = req.params;

    res.json({
      id: replayId,
      gameId: 'game_123',
      title: 'Epic Battle Royale',
      duration: 540,
      recordedAt: new Date().toISOString(),
      players: [
        { id: 'p1', name: 'Winner', role: 'runner', result: 'won' },
        { id: 'p2', name: 'Hunter1', role: 'hunter', tags: 5 },
      ],
      events: [],
      positions: [], // Time-series position data
      highlights: [
        { timestamp: 120, description: 'First tag!', type: 'tag' },
        { timestamp: 300, description: 'Zone shrinks', type: 'zone' },
        { timestamp: 500, description: 'Final showdown', type: 'action' },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save replay
router.post('/replay', async (req, res) => {
  try {
    const { gameId, userId, title, isPublic } = req.body;

    res.json({
      id: `replay_${Date.now()}`,
      gameId,
      userId,
      title,
      isPublic,
      createdAt: new Date().toISOString(),
      processingStatus: 'processing',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Share replay
router.post('/replay/:replayId/share', async (req, res) => {
  try {
    const { replayId } = req.params;
    const { platform } = req.body;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=https://tag.game/replay/${replayId}`,
      facebook: `https://facebook.com/sharer/sharer.php?u=https://tag.game/replay/${replayId}`,
      direct: `https://tag.game/replay/${replayId}`,
    };

    res.json({
      success: true,
      url: shareUrls[platform] || shareUrls.direct,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like replay
router.post('/replay/:replayId/like', async (req, res) => {
  try {
    const { replayId } = req.params;
    const { userId } = req.body;

    res.json({
      success: true,
      likes: 101,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
