import webpush from 'web-push';
import { logger } from '../utils/logger.js';
import { socialDb } from '../db/social.js';

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tag.game';

// In-memory cache for quick lookups (backed by database)
const subscriptionCache = new Map(); // userId -> subscription

// Initialize web-push if VAPID keys are configured
let pushEnabled = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushEnabled = true;
  logger.info('Push notifications enabled');
} else {
  logger.warn('Push notifications disabled - VAPID keys not configured');
}

export const pushService = {
  // Check if push is enabled
  isEnabled() {
    return pushEnabled;
  },

  // Get public VAPID key for frontend
  getPublicKey() {
    return VAPID_PUBLIC_KEY;
  },

  // Save subscription for a user (persisted to database)
  async subscribe(userId, subscription) {
    if (!pushEnabled) return false;

    try {
      // Save to database for persistence
      await socialDb.savePushSubscription(userId, subscription);
      // Also cache in memory for quick access
      subscriptionCache.set(userId, subscription);
      logger.info('Push subscription added', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to save push subscription', { userId, error: error.message });
      return false;
    }
  },

  // Remove subscription for a user
  async unsubscribe(userId, endpoint = null) {
    subscriptionCache.delete(userId);
    if (endpoint) {
      try {
        await socialDb.removePushSubscription(endpoint);
      } catch (error) {
        logger.error('Failed to remove push subscription', { userId, error: error.message });
      }
    }
    logger.info('Push subscription removed', { userId });
  },

  // Get subscription for a user (from cache or database)
  async getSubscription(userId) {
    // Check cache first
    if (subscriptionCache.has(userId)) {
      return subscriptionCache.get(userId);
    }

    // Load from database
    try {
      const subs = await socialDb.getPushSubscriptions(userId);
      if (subs && subs.length > 0) {
        // Reconstruct subscription object
        const sub = subs[0];
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        subscriptionCache.set(userId, subscription);
        return subscription;
      }
    } catch (error) {
      logger.error('Failed to load push subscription', { userId, error: error.message });
    }
    return null;
  },

  // Send notification to a specific user
  async sendToUser(userId, notification) {
    if (!pushEnabled) return false;

    const subscription = await this.getSubscription(userId);
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

      // Remove invalid subscriptions
      if (error.statusCode === 410) {
        await this.unsubscribe(userId, subscription.endpoint);
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
