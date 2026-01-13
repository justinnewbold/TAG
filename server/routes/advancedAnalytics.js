/**
 * Advanced Analytics Routes
 * Real-time monitoring, trends, geographic analytics, and engagement metrics
 */

import express from 'express';
import { analyticsService, AnalyticsEventType } from '../services/analyticsService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============ Public Routes ============

// Track an event (for authenticated users)
router.post('/track', async (req, res) => {
  try {
    const { eventName, properties = {}, sessionId } = req.body;
    const userId = req.user?.id;

    if (!eventName) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // Validate event type
    const validTypes = Object.values(AnalyticsEventType);
    if (!validTypes.includes(eventName)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const eventId = await analyticsService.track(eventName, userId, properties, sessionId);

    res.json({ success: true, eventId });
  } catch (error) {
    logger.error('Failed to track event', { error: error.message });
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Batch track events
router.post('/track/batch', async (req, res) => {
  try {
    const { events } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    const results = [];
    for (const event of events) {
      const eventId = await analyticsService.track(
        event.eventName,
        userId,
        event.properties || {},
        event.sessionId
      );
      results.push(eventId);
    }

    res.json({ success: true, tracked: results.filter(Boolean).length });
  } catch (error) {
    logger.error('Failed to batch track events', { error: error.message });
    res.status(500).json({ error: 'Failed to track events' });
  }
});

// ============ Admin Routes ============

// Get dashboard summary
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    const summary = await analyticsService.getDashboardSummary(range);
    res.json(summary);
  } catch (error) {
    logger.error('Failed to get dashboard summary', { error: error.message });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// Get trend data
router.get('/trends', requireAdmin, async (req, res) => {
  try {
    const { range = '7d', eventName } = req.query;
    const trends = await analyticsService.getTrends(range, eventName);
    res.json(trends);
  } catch (error) {
    logger.error('Failed to get trends', { error: error.message });
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

// Get geographic data
router.get('/geographic', requireAdmin, async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    const geoData = await analyticsService.getGeographicData(range);
    res.json(geoData);
  } catch (error) {
    logger.error('Failed to get geographic data', { error: error.message });
    res.status(500).json({ error: 'Failed to get geographic data' });
  }
});

// Get real-time stats
router.get('/realtime', requireAdmin, async (req, res) => {
  try {
    const stats = await analyticsService.getRealTimeStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get real-time stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get real-time stats' });
  }
});

// Get engagement metrics
router.get('/engagement', requireAdmin, async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const metrics = await analyticsService.getEngagementMetrics(range);
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get engagement metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to get engagement metrics' });
  }
});

// Get retention data
router.get('/retention', requireAdmin, async (req, res) => {
  try {
    const { cohortDate } = req.query;
    const retention = await analyticsService.getRetentionData(cohortDate);
    res.json(retention);
  } catch (error) {
    logger.error('Failed to get retention data', { error: error.message });
    res.status(500).json({ error: 'Failed to get retention data' });
  }
});

// Get event types list
router.get('/event-types', requireAdmin, async (req, res) => {
  res.json({
    eventTypes: Object.values(AnalyticsEventType),
  });
});

export default router;
