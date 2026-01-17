import webpush from 'web-push';
import { logger } from '../utils/logger.js';

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tag.game';

// In-memory cache for quick lookups (backed by database)
const subscriptionCache = new Map(); // userId -> subscription

// Database reference (set during init)
let db = null;
let isPostgres = false;

// Initialize web-push if VAPID keys are configured
let pushEnabled = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushEnabled = true;
  logger.info('Push notifications enabled');
} else {
  logger.warn('Push notifications disabled - VAPID keys not configured');
}

// Initialize database connection for persistent storage
async function initPushDatabase(database, postgres = false) {
  db = database;
  isPostgres = postgres;

  // Create push_subscriptions table if it doesn't exist
  const createTableSQL = isPostgres
    ? `CREATE TABLE IF NOT EXISTS push_subscriptions (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        keys JSONB NOT NULL,
        expiration_time BIGINT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);`
    : `CREATE TABLE IF NOT EXISTS push_subscriptions (
        user_id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL,
        keys TEXT NOT NULL,
        expiration_time INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);`;

  try {
    if (isPostgres) {
      await db.query(createTableSQL);
    } else {
      db.exec(createTableSQL);
    }
    logger.info('Push subscriptions table initialized');

    // Load existing subscriptions into cache
    await loadSubscriptionsToCache();
  } catch (error) {
    logger.error('Failed to initialize push subscriptions table:', error);
  }
}

// Load subscriptions from database to cache
async function loadSubscriptionsToCache() {
  if (!db) return;

  try {
    const query = 'SELECT user_id, endpoint, keys FROM push_subscriptions';
    let rows;

    if (isPostgres) {
      const result = await db.query(query);
      rows = result.rows;
    } else {
      rows = db.prepare(query).all();
    }

    for (const row of rows) {
      const keys = typeof row.keys === 'string' ? JSON.parse(row.keys) : row.keys;
      subscriptionCache.set(row.user_id, {
        endpoint: row.endpoint,
        keys,
      });
    }

    logger.info(`Loaded ${rows.length} push subscriptions to cache`);
  } catch (error) {
    logger.error('Failed to load push subscriptions to cache:', error);
  }
}

// Save subscription to database
async function saveSubscriptionToDb(userId, subscription) {
  if (!db) return;

  const now = Date.now();
  const keys = JSON.stringify(subscription.keys);

  try {
    if (isPostgres) {
      await db.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, keys, expiration_time, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           endpoint = EXCLUDED.endpoint,
           keys = EXCLUDED.keys,
           expiration_time = EXCLUDED.expiration_time,
           updated_at = EXCLUDED.updated_at`,
        [userId, subscription.endpoint, keys, subscription.expirationTime || null, now]
      );
    } else {
      db.prepare(
        `INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, keys, expiration_time, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(userId, subscription.endpoint, keys, subscription.expirationTime || null, now);
    }
  } catch (error) {
    logger.error('Failed to save push subscription to database:', error);
  }
}

// Remove subscription from database
async function removeSubscriptionFromDb(userId) {
  if (!db) return;

  try {
    if (isPostgres) {
      await db.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    } else {
      db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
    }
  } catch (error) {
    logger.error('Failed to remove push subscription from database:', error);
  }
}

export const pushService = {
  // Initialize database (call during server startup)
  async init(database, postgres = false) {
    await initPushDatabase(database, postgres);
  },

  // Check if push is enabled
  isEnabled() {
    return pushEnabled;
  },

  // Get public VAPID key for frontend
  getPublicKey() {
    return VAPID_PUBLIC_KEY;
  },

  // Save subscription for a user (with database persistence)
  async subscribe(userId, subscription) {
    if (!pushEnabled) return false;

    // Update cache
    subscriptionCache.set(userId, subscription);

    // Persist to database
    await saveSubscriptionToDb(userId, subscription);

    logger.info('Push subscription added', { userId });
    return true;
  },

  // Remove subscription for a user (with database persistence)
  async unsubscribe(userId) {
    // Update cache
    subscriptionCache.delete(userId);

    // Remove from database
    await removeSubscriptionFromDb(userId);

    logger.info('Push subscription removed', { userId });
  },

  // Send notification to a specific user
  async sendToUser(userId, notification) {
    if (!pushEnabled) return false;

    const subscription = subscriptionCache.get(userId);
    if (!subscription) {
      return false;
    }

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify(notification)
      );
      return true;
    } catch (error) {
      logger.error('Push notification failed', {
        userId,
        error: error.message,
      });

      // Remove invalid subscriptions (expired or unsubscribed)
      if (error.statusCode === 410 || error.statusCode === 404) {
        subscriptionCache.delete(userId);
        await removeSubscriptionFromDb(userId);
      }
      return false;
    }
  },

  // Send notification to multiple users
  async sendToUsers(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification))
    );

    return results.filter(r => r.status === 'fulfilled' && r.value).length;
  },

  // Game notification templates
  notifications: {
    gameStarting(gameName, itPlayerName) {
      return {
        title: 'Game Starting!',
        body: `${gameName} is starting. ${itPlayerName} is IT!`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'game-start',
        data: { type: 'game-start' },
      };
    },

    youAreIt(taggerName = null) {
      return {
        title: "You're IT!",
        body: taggerName ? `${taggerName} tagged you! Time to chase!` : 'You were tagged! Time to chase!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'tagged',
        vibrate: [200, 100, 200],
        data: { type: 'tagged' },
      };
    },

    playerTagged(taggerName, taggedName) {
      return {
        title: 'Tag!',
        body: `${taggerName} tagged ${taggedName}!`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'player-tagged',
        data: { type: 'player-tagged' },
      };
    },

    itNearby(distance) {
      return {
        title: 'IT is nearby!',
        body: `IT is ${Math.round(distance)}m away! Run!`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'it-nearby',
        vibrate: [100, 50, 100],
        data: { type: 'it-nearby' },
        requireInteraction: false,
      };
    },

    gameEnded(winnerName) {
      return {
        title: 'Game Over!',
        body: winnerName ? `${winnerName} wins!` : 'Game has ended',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'game-ended',
        data: { type: 'game-ended' },
      };
    },

    playerJoined(playerName, gameName) {
      return {
        title: 'Player Joined',
        body: `${playerName} joined ${gameName}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'player-joined',
        data: { type: 'player-joined' },
      };
    },
  },
};

export default pushService;
