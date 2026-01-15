// Replay Routes - Game replay recording and playback
import express from 'express';
import { replayDb } from '../db/replays.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get replay by ID
router.get('/:replayId', async (req, res) => {
  try {
    const replay = await replayDb.getReplay(req.params.replayId);
    if (!replay) {
      return res.status(404).json({ error: 'Replay not found' });
    }

    const events = await replayDb.getReplayEvents(req.params.replayId);
    res.json({ replay, events });
  } catch (error) {
    logger.error('Get replay error:', error);
    res.status(500).json({ error: 'Failed to fetch replay' });
  }
});

// Get replays for a game
router.get('/game/:gameId', async (req, res) => {
  try {
    const replays = await replayDb.getReplaysByGame(req.params.gameId);
    res.json({ replays });
  } catch (error) {
    logger.error('Get game replays error:', error);
    res.status(500).json({ error: 'Failed to fetch replays' });
  }
});

// Get user's replays
router.get('/user/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    
    const replays = await replayDb.getReplaysByPlayer(userId, limit);
    res.json({ replays });
  } catch (error) {
    logger.error('Get user replays error:', error);
    res.status(500).json({ error: 'Failed to fetch replays' });
  }
});

// Get replay events only (for streaming/pagination)
router.get('/:replayId/events', async (req, res) => {
  try {
    const events = await replayDb.getReplayEvents(req.params.replayId);
    res.json({ events });
  } catch (error) {
    logger.error('Get replay events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export { router as replayRouter };
