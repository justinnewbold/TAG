/**
 * Analytics Routes
 * Phase 7: Analytics event collection and reporting
 */

import express from 'express';

const router = express.Router();

// In-memory analytics storage (use proper analytics DB in production)
const events = [];
const sessionData = new Map();
const MAX_EVENTS = 10000;

// Event types
const VALID_EVENT_TYPES = [
  'screen_view',
  'button_click',
  'game_start',
  'game_end',
  'tag_made',
  'achievement_unlocked',
  'feature_used',
  'error',
  'performance',
  'session_start',
  'session_end',
];

// Track an event
router.post('/event', async (req, res) => {
  try {
    const { eventType, eventData = {}, timestamp } = req.body;

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      eventType,
      eventData,
      timestamp: timestamp || Date.now(),
      userAgent: req.headers['user-agent'],
    };

    events.push(event);

    // Keep only recent events in memory
    if (events.length > MAX_EVENTS) {
      events.shift();
    }

    res.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Failed to track event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Track multiple events (batch)
router.post('/events/batch', async (req, res) => {
  try {
    const { events: batchEvents } = req.body;

    if (!Array.isArray(batchEvents)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    const tracked = [];

    for (const evt of batchEvents) {
      if (!evt.eventType || !VALID_EVENT_TYPES.includes(evt.eventType)) {
        continue;
      }

      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: req.user.id,
        eventType: evt.eventType,
        eventData: evt.eventData || {},
        timestamp: evt.timestamp || Date.now(),
        userAgent: req.headers['user-agent'],
      };

      events.push(event);
      tracked.push(event.id);
    }

    // Keep only recent events
    while (events.length > MAX_EVENTS) {
      events.shift();
    }

    res.json({ success: true, tracked: tracked.length });
  } catch (error) {
    console.error('Failed to track batch events:', error);
    res.status(500).json({ error: 'Failed to track events' });
  }
});

// Start a session
router.post('/session/start', async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceInfo } = req.body;

    const session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startTime: Date.now(),
      deviceInfo,
      events: [],
    };

    sessionData.set(userId, session);

    res.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error('Failed to start session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// End a session
router.post('/session/end', async (req, res) => {
  try {
    const userId = req.user.id;
    const session = sessionData.get(userId);

    if (!session) {
      return res.json({ success: true }); // Silently succeed
    }

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // In production, would persist session data
    console.log('Session ended:', {
      userId,
      duration: session.duration,
      eventCount: session.events.length,
    });

    sessionData.delete(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Track performance metrics
router.post('/performance', async (req, res) => {
  try {
    const { metrics } = req.body;

    if (!metrics) {
      return res.status(400).json({ error: 'Metrics required' });
    }

    const perfEvent = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      eventType: 'performance',
      eventData: metrics,
      timestamp: Date.now(),
    };

    events.push(perfEvent);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to track performance:', error);
    res.status(500).json({ error: 'Failed to track performance' });
  }
});

// Get analytics summary (admin only)
router.get('/summary', async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin required' });
    }

    const { range = '24h' } = req.query;
    const rangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[range] || 24 * 60 * 60 * 1000;

    const cutoff = Date.now() - rangeMs;
    const recentEvents = events.filter(e => e.timestamp > cutoff);

    // Aggregate by type
    const byType = {};
    const uniqueUsers = new Set();

    for (const event of recentEvents) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      uniqueUsers.add(event.userId);
    }

    res.json({
      totalEvents: recentEvents.length,
      uniqueUsers: uniqueUsers.size,
      activeSessions: sessionData.size,
      byType,
      range,
    });
  } catch (error) {
    console.error('Failed to get analytics summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Get user analytics (own data only)
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEvents = events.filter(e => e.userId === userId).slice(-100);

    res.json({
      events: userEvents,
      session: sessionData.get(userId) || null,
    });
  } catch (error) {
    console.error('Failed to get user analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export { router as analyticsRouter };
