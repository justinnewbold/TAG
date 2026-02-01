import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory kill feed (recent events across all games)
const globalFeed = [];
const MAX_FEED_SIZE = 200;

function addToFeed(event) {
  globalFeed.unshift(event);
  if (globalFeed.length > MAX_FEED_SIZE) {
    globalFeed.length = MAX_FEED_SIZE;
  }
}

// Get global kill feed
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const since = parseInt(req.query.since) || 0;

    const filtered = since > 0
      ? globalFeed.filter(e => e.timestamp > since)
      : globalFeed;

    res.json({ events: filtered.slice(0, limit) });
  } catch (error) {
    logger.error('Get kill feed error', { error: error.message });
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// Get game-specific feed
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);

    const events = globalFeed.filter(e => e.gameId === gameId).slice(0, limit);
    res.json({ events });
  } catch (error) {
    logger.error('Get game feed error', { error: error.message });
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// Post a new feed event (called by server internals or other routes)
router.post('/', async (req, res) => {
  try {
    const { type, gameId, data, actorId, actorName, targetId, targetName, message } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Event type required' });
    }

    const event = {
      id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      gameId: gameId || null,
      actorId: actorId || req.user?.id,
      actorName: actorName || req.user?.name,
      targetId: targetId || null,
      targetName: targetName || null,
      message: message || null,
      data: data || {},
      timestamp: Date.now(),
    };

    addToFeed(event);

    // Broadcast via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('killFeedEvent', event);
      if (gameId) {
        io.to(gameId).emit('gameFeedEvent', event);
      }
    }

    res.status(201).json({ event });
  } catch (error) {
    logger.error('Post feed event error', { error: error.message });
    res.status(500).json({ error: 'Failed to post event' });
  }
});

// Export the addToFeed function for use by other modules
export { addToFeed };
export default router;
