/**
 * Advanced Analytics Service
 * Provides trend analysis, geographic analytics, and real-time monitoring
 */

import { db, isPostgres } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// Analytics event types
export const AnalyticsEventType = {
  // User events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PROFILE_UPDATE: 'profile_update',

  // Game events
  GAME_CREATE: 'game_create',
  GAME_JOIN: 'game_join',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  GAME_LEAVE: 'game_leave',
  TAG_MADE: 'tag_made',
  TAG_RECEIVED: 'tag_received',
  POWER_UP_COLLECTED: 'power_up_collected',
  POWER_UP_USED: 'power_up_used',

  // Social events
  FRIEND_REQUEST_SENT: 'friend_request_sent',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  GAME_INVITE_SENT: 'game_invite_sent',
  GAME_INVITE_ACCEPTED: 'game_invite_accepted',

  // Engagement
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  DAILY_CHALLENGE_COMPLETED: 'daily_challenge_completed',
  LEADERBOARD_VIEW: 'leaderboard_view',

  // Technical
  APP_OPEN: 'app_open',
  APP_CLOSE: 'app_close',
  ERROR: 'error',
  PERFORMANCE: 'performance',
};

// Database operations
const analyticsDb = {
  async trackEvent(event) {
    const id = uuidv4();
    const timestamp = Date.now();

    if (isPostgres()) {
      await db.query(
        `INSERT INTO analytics_events (id, event_name, user_id, session_id, properties, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, event.name, event.userId, event.sessionId, JSON.stringify(event.properties || {}), timestamp]
      );
    } else {
      db.prepare(
        `INSERT INTO analytics_events (id, event_name, user_id, session_id, properties, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, event.name, event.userId, event.sessionId, JSON.stringify(event.properties || {}), timestamp);
    }

    return id;
  },

  async getEvents(options = {}) {
    const { startTime, endTime, eventName, userId, limit = 1000 } = options;
    let query;
    const params = [];

    if (isPostgres()) {
      query = 'SELECT * FROM analytics_events WHERE 1=1';

      if (startTime) {
        params.push(startTime);
        query += ` AND timestamp >= $${params.length}`;
      }
      if (endTime) {
        params.push(endTime);
        query += ` AND timestamp <= $${params.length}`;
      }
      if (eventName) {
        params.push(eventName);
        query += ` AND event_name = $${params.length}`;
      }
      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

      const result = await db.query(query, params);
      return result.rows.map(row => ({
        ...row,
        properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
      }));
    } else {
      query = 'SELECT * FROM analytics_events WHERE 1=1';
      const conditions = [];

      if (startTime) {
        conditions.push('timestamp >= ?');
        params.push(startTime);
      }
      if (endTime) {
        conditions.push('timestamp <= ?');
        params.push(endTime);
      }
      if (eventName) {
        conditions.push('event_name = ?');
        params.push(eventName);
      }
      if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      return db.prepare(query).all(...params).map(row => ({
        ...row,
        properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
      }));
    }
  },

  async getEventCounts(startTime, endTime, groupBy = 'event_name') {
    if (isPostgres()) {
      const result = await db.query(
        `SELECT event_name, COUNT(*) as count
         FROM analytics_events
         WHERE timestamp >= $1 AND timestamp <= $2
         GROUP BY event_name
         ORDER BY count DESC`,
        [startTime, endTime]
      );
      return result.rows;
    } else {
      return db.prepare(
        `SELECT event_name, COUNT(*) as count
         FROM analytics_events
         WHERE timestamp >= ? AND timestamp <= ?
         GROUP BY event_name
         ORDER BY count DESC`
      ).all(startTime, endTime);
    }
  },

  async getUniqueUsers(startTime, endTime) {
    if (isPostgres()) {
      const result = await db.query(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM analytics_events
         WHERE timestamp >= $1 AND timestamp <= $2 AND user_id IS NOT NULL`,
        [startTime, endTime]
      );
      return parseInt(result.rows[0]?.count || 0);
    } else {
      const row = db.prepare(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM analytics_events
         WHERE timestamp >= ? AND timestamp <= ? AND user_id IS NOT NULL`
      ).get(startTime, endTime);
      return row?.count || 0;
    }
  },

  async getHourlyBreakdown(startTime, endTime, eventName = null) {
    if (isPostgres()) {
      const query = eventName
        ? `SELECT
             EXTRACT(HOUR FROM to_timestamp(timestamp / 1000)) as hour,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= $1 AND timestamp <= $2 AND event_name = $3
           GROUP BY hour
           ORDER BY hour`
        : `SELECT
             EXTRACT(HOUR FROM to_timestamp(timestamp / 1000)) as hour,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= $1 AND timestamp <= $2
           GROUP BY hour
           ORDER BY hour`;

      const params = eventName ? [startTime, endTime, eventName] : [startTime, endTime];
      const result = await db.query(query, params);
      return result.rows.map(row => ({ hour: parseInt(row.hour), count: parseInt(row.count) }));
    } else {
      const query = eventName
        ? `SELECT
             strftime('%H', datetime(timestamp / 1000, 'unixepoch')) as hour,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= ? AND timestamp <= ? AND event_name = ?
           GROUP BY hour
           ORDER BY hour`
        : `SELECT
             strftime('%H', datetime(timestamp / 1000, 'unixepoch')) as hour,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= ? AND timestamp <= ?
           GROUP BY hour
           ORDER BY hour`;

      const params = eventName ? [startTime, endTime, eventName] : [startTime, endTime];
      return db.prepare(query).all(...params).map(row => ({
        hour: parseInt(row.hour),
        count: row.count,
      }));
    }
  },

  async getDailyBreakdown(startTime, endTime, eventName = null) {
    if (isPostgres()) {
      const query = eventName
        ? `SELECT
             DATE(to_timestamp(timestamp / 1000)) as date,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= $1 AND timestamp <= $2 AND event_name = $3
           GROUP BY date
           ORDER BY date`
        : `SELECT
             DATE(to_timestamp(timestamp / 1000)) as date,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= $1 AND timestamp <= $2
           GROUP BY date
           ORDER BY date`;

      const params = eventName ? [startTime, endTime, eventName] : [startTime, endTime];
      const result = await db.query(query, params);
      return result.rows.map(row => ({ date: row.date, count: parseInt(row.count) }));
    } else {
      const query = eventName
        ? `SELECT
             date(datetime(timestamp / 1000, 'unixepoch')) as date,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= ? AND timestamp <= ? AND event_name = ?
           GROUP BY date
           ORDER BY date`
        : `SELECT
             date(datetime(timestamp / 1000, 'unixepoch')) as date,
             COUNT(*) as count
           FROM analytics_events
           WHERE timestamp >= ? AND timestamp <= ?
           GROUP BY date
           ORDER BY date`;

      const params = eventName ? [startTime, endTime, eventName] : [startTime, endTime];
      return db.prepare(query).all(...params);
    }
  },
};

// Analytics service
export const analyticsService = {
  // Track an event
  async track(eventName, userId, properties = {}, sessionId = null) {
    try {
      const id = await analyticsDb.trackEvent({
        name: eventName,
        userId,
        sessionId,
        properties,
      });
      return id;
    } catch (error) {
      logger.error('Failed to track analytics event', { error: error.message, eventName });
      return null;
    }
  },

  // Get dashboard summary
  async getDashboardSummary(range = '24h') {
    const rangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[range] || 24 * 60 * 60 * 1000;

    const endTime = Date.now();
    const startTime = endTime - rangeMs;
    const previousStartTime = startTime - rangeMs;

    const [currentCounts, previousCounts, uniqueUsers, previousUniqueUsers] = await Promise.all([
      analyticsDb.getEventCounts(startTime, endTime),
      analyticsDb.getEventCounts(previousStartTime, startTime),
      analyticsDb.getUniqueUsers(startTime, endTime),
      analyticsDb.getUniqueUsers(previousStartTime, startTime),
    ]);

    // Calculate totals and changes
    const currentTotal = currentCounts.reduce((sum, e) => sum + parseInt(e.count), 0);
    const previousTotal = previousCounts.reduce((sum, e) => sum + parseInt(e.count), 0);

    const eventChange = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
      : 0;

    const userChange = previousUniqueUsers > 0
      ? ((uniqueUsers - previousUniqueUsers) / previousUniqueUsers * 100).toFixed(1)
      : 0;

    // Key metrics
    const gamesStarted = currentCounts.find(e => e.event_name === AnalyticsEventType.GAME_START)?.count || 0;
    const tagsMade = currentCounts.find(e => e.event_name === AnalyticsEventType.TAG_MADE)?.count || 0;
    const newUsers = currentCounts.find(e => e.event_name === AnalyticsEventType.USER_SIGNUP)?.count || 0;

    return {
      range,
      summary: {
        totalEvents: currentTotal,
        eventChange: parseFloat(eventChange),
        uniqueUsers,
        userChange: parseFloat(userChange),
        gamesStarted: parseInt(gamesStarted),
        tagsMade: parseInt(tagsMade),
        newUsers: parseInt(newUsers),
      },
      eventBreakdown: currentCounts.slice(0, 10),
    };
  },

  // Get trend data
  async getTrends(range = '7d', eventName = null) {
    const rangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[range] || 7 * 24 * 60 * 60 * 1000;

    const endTime = Date.now();
    const startTime = endTime - rangeMs;

    if (range === '24h') {
      const hourly = await analyticsDb.getHourlyBreakdown(startTime, endTime, eventName);
      return {
        range,
        type: 'hourly',
        data: hourly,
      };
    } else {
      const daily = await analyticsDb.getDailyBreakdown(startTime, endTime, eventName);
      return {
        range,
        type: 'daily',
        data: daily,
      };
    }
  },

  // Get geographic data
  async getGeographicData(range = '24h') {
    const rangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[range] || 24 * 60 * 60 * 1000;

    const endTime = Date.now();
    const startTime = endTime - rangeMs;

    // Get events with location data
    const events = await analyticsDb.getEvents({
      startTime,
      endTime,
      eventName: AnalyticsEventType.TAG_MADE,
      limit: 1000,
    });

    // Extract and aggregate location data
    const locationData = [];
    const cityAggregates = new Map();

    for (const event of events) {
      const props = event.properties || {};
      if (props.location) {
        locationData.push({
          lat: props.location.lat,
          lng: props.location.lng,
          count: 1,
        });

        // Aggregate by city if available
        if (props.city) {
          const current = cityAggregates.get(props.city) || { name: props.city, count: 0 };
          current.count++;
          cityAggregates.set(props.city, current);
        }
      }
    }

    // Create heat map data (aggregate nearby points)
    const heatMapData = this._aggregateLocationData(locationData);

    return {
      range,
      heatMap: heatMapData,
      topCities: Array.from(cityAggregates.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      totalLocations: locationData.length,
    };
  },

  // Aggregate location data for heat map
  _aggregateLocationData(points, gridSize = 0.01) {
    const grid = new Map();

    for (const point of points) {
      const gridLat = Math.floor(point.lat / gridSize) * gridSize;
      const gridLng = Math.floor(point.lng / gridSize) * gridSize;
      const key = `${gridLat},${gridLng}`;

      const current = grid.get(key) || { lat: gridLat, lng: gridLng, count: 0 };
      current.count += point.count;
      grid.set(key, current);
    }

    return Array.from(grid.values());
  },

  // Get real-time stats (last 5 minutes)
  async getRealTimeStats() {
    const endTime = Date.now();
    const startTime = endTime - 5 * 60 * 1000; // 5 minutes

    const [events, uniqueUsers] = await Promise.all([
      analyticsDb.getEventCounts(startTime, endTime),
      analyticsDb.getUniqueUsers(startTime, endTime),
    ]);

    const recentEvents = await analyticsDb.getEvents({
      startTime,
      endTime,
      limit: 50,
    });

    return {
      window: '5m',
      activeUsers: uniqueUsers,
      eventsPerMinute: Math.round(recentEvents.length / 5),
      eventBreakdown: events,
      recentActivity: recentEvents.slice(0, 20).map(e => ({
        type: e.event_name,
        timestamp: e.timestamp,
        userId: e.user_id?.substring(0, 8),
      })),
    };
  },

  // Get user engagement metrics
  async getEngagementMetrics(range = '7d') {
    const rangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[range] || 7 * 24 * 60 * 60 * 1000;

    const endTime = Date.now();
    const startTime = endTime - rangeMs;

    // Get game-related metrics
    const [gameStarts, gameEnds, tags] = await Promise.all([
      analyticsDb.getEvents({ startTime, endTime, eventName: AnalyticsEventType.GAME_START, limit: 10000 }),
      analyticsDb.getEvents({ startTime, endTime, eventName: AnalyticsEventType.GAME_END, limit: 10000 }),
      analyticsDb.getEvents({ startTime, endTime, eventName: AnalyticsEventType.TAG_MADE, limit: 10000 }),
    ]);

    // Calculate average game duration
    const gameDurations = [];
    for (const end of gameEnds) {
      if (end.properties?.duration) {
        gameDurations.push(end.properties.duration);
      }
    }

    const avgGameDuration = gameDurations.length > 0
      ? Math.round(gameDurations.reduce((a, b) => a + b, 0) / gameDurations.length / 1000 / 60) // in minutes
      : 0;

    // Calculate tags per game
    const avgTagsPerGame = gameEnds.length > 0
      ? Math.round(tags.length / gameEnds.length * 10) / 10
      : 0;

    // Get unique players
    const uniquePlayers = new Set(gameStarts.map(g => g.user_id)).size;

    return {
      range,
      metrics: {
        totalGames: gameEnds.length,
        totalTags: tags.length,
        uniquePlayers,
        avgGameDuration,
        avgTagsPerGame,
        gamesPerPlayer: uniquePlayers > 0
          ? Math.round(gameEnds.length / uniquePlayers * 10) / 10
          : 0,
      },
    };
  },

  // Get retention data
  async getRetentionData(cohortDate = null) {
    // Get users who signed up in the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const signups = await analyticsDb.getEvents({
      startTime: thirtyDaysAgo,
      endTime: Date.now(),
      eventName: AnalyticsEventType.USER_SIGNUP,
      limit: 10000,
    });

    // Group by day
    const cohorts = new Map();
    for (const signup of signups) {
      const date = new Date(signup.timestamp).toISOString().split('T')[0];
      if (!cohorts.has(date)) {
        cohorts.set(date, new Set());
      }
      if (signup.user_id) {
        cohorts.get(date).add(signup.user_id);
      }
    }

    // Calculate retention for each cohort
    const retentionData = [];
    for (const [date, userIds] of cohorts) {
      const cohortUsers = Array.from(userIds);
      const cohortStart = new Date(date).getTime();

      // Check activity for days 1, 7, 14, 30
      const retention = {
        date,
        cohortSize: cohortUsers.length,
        day1: 0,
        day7: 0,
        day14: 0,
        day30: 0,
      };

      // This would be expensive in practice - optimize for production
      for (const userId of cohortUsers) {
        const userEvents = await analyticsDb.getEvents({
          startTime: cohortStart + 24 * 60 * 60 * 1000,
          endTime: cohortStart + 2 * 24 * 60 * 60 * 1000,
          userId,
          limit: 1,
        });
        if (userEvents.length > 0) retention.day1++;
      }

      // Calculate percentages
      retention.day1Pct = cohortUsers.length > 0
        ? Math.round(retention.day1 / cohortUsers.length * 100)
        : 0;

      retentionData.push(retention);
    }

    return {
      cohorts: retentionData.slice(0, 7), // Last 7 cohorts
    };
  },
};

export default analyticsService;
