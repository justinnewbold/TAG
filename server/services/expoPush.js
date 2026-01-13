import { Expo } from 'expo-server-sdk';
import { db, isPostgres } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Create a new Expo SDK client
const expo = new Expo();

// Notification types
export const NotificationType = {
  GAME_INVITE: 'game_invite',
  GAME_STARTING: 'game_starting',
  YOU_ARE_IT: 'you_are_it',
  PLAYER_TAGGED: 'player_tagged',
  IT_NEARBY: 'it_nearby',
  GAME_ENDED: 'game_ended',
  FRIEND_REQUEST: 'friend_request',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  POWER_UP_AVAILABLE: 'power_up_available',
};

// Database operations for push tokens
const pushTokenDb = {
  async saveToken(userId, token, platform, deviceId = null) {
    const id = uuidv4();
    const now = Date.now();

    if (isPostgres()) {
      await db.query(
        `INSERT INTO push_tokens (id, user_id, token, platform, device_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, token) DO UPDATE SET updated_at = $7`,
        [id, userId, token, platform, deviceId, now, now]
      );
    } else {
      const stmt = db.prepare(
        `INSERT INTO push_tokens (id, user_id, token, platform, device_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, token) DO UPDATE SET updated_at = ?`
      );
      stmt.run(id, userId, token, platform, deviceId, now, now, now);
    }

    logger.info('Push token saved', { userId, platform });
    return true;
  },

  async removeToken(userId, token) {
    if (isPostgres()) {
      await db.query('DELETE FROM push_tokens WHERE user_id = $1 AND token = $2', [userId, token]);
    } else {
      db.prepare('DELETE FROM push_tokens WHERE user_id = ? AND token = ?').run(userId, token);
    }
    logger.info('Push token removed', { userId });
  },

  async getTokensForUser(userId) {
    if (isPostgres()) {
      const result = await db.query('SELECT * FROM push_tokens WHERE user_id = $1', [userId]);
      return result.rows;
    } else {
      return db.prepare('SELECT * FROM push_tokens WHERE user_id = ?').all(userId);
    }
  },

  async getTokensForUsers(userIds) {
    if (userIds.length === 0) return [];

    if (isPostgres()) {
      const result = await db.query(
        'SELECT * FROM push_tokens WHERE user_id = ANY($1)',
        [userIds]
      );
      return result.rows;
    } else {
      const placeholders = userIds.map(() => '?').join(',');
      return db.prepare(`SELECT * FROM push_tokens WHERE user_id IN (${placeholders})`).all(...userIds);
    }
  },

  async removeInvalidToken(token) {
    if (isPostgres()) {
      await db.query('DELETE FROM push_tokens WHERE token = $1', [token]);
    } else {
      db.prepare('DELETE FROM push_tokens WHERE token = ?').run(token);
    }
    logger.info('Invalid push token removed', { token: token.substring(0, 20) + '...' });
  },
};

// Database operations for notification preferences
const notificationPrefsDb = {
  async getPreferences(userId) {
    if (isPostgres()) {
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        // Return defaults
        return {
          game_invites: true,
          game_events: true,
          proximity_alerts: true,
          friend_activity: true,
          achievements: true,
          quiet_hours_start: null,
          quiet_hours_end: null,
        };
      }
      return result.rows[0];
    } else {
      const prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);
      if (!prefs) {
        return {
          game_invites: true,
          game_events: true,
          proximity_alerts: true,
          friend_activity: true,
          achievements: true,
          quiet_hours_start: null,
          quiet_hours_end: null,
        };
      }
      return {
        ...prefs,
        game_invites: !!prefs.game_invites,
        game_events: !!prefs.game_events,
        proximity_alerts: !!prefs.proximity_alerts,
        friend_activity: !!prefs.friend_activity,
        achievements: !!prefs.achievements,
      };
    }
  },

  async updatePreferences(userId, preferences) {
    const now = Date.now();
    const prefs = await this.getPreferences(userId);

    if (isPostgres()) {
      await db.query(
        `INSERT INTO notification_preferences (user_id, game_invites, game_events, proximity_alerts, friend_activity, achievements, quiet_hours_start, quiet_hours_end, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id) DO UPDATE SET
           game_invites = $2, game_events = $3, proximity_alerts = $4, friend_activity = $5,
           achievements = $6, quiet_hours_start = $7, quiet_hours_end = $8, updated_at = $9`,
        [
          userId,
          preferences.game_invites ?? prefs.game_invites,
          preferences.game_events ?? prefs.game_events,
          preferences.proximity_alerts ?? prefs.proximity_alerts,
          preferences.friend_activity ?? prefs.friend_activity,
          preferences.achievements ?? prefs.achievements,
          preferences.quiet_hours_start ?? prefs.quiet_hours_start,
          preferences.quiet_hours_end ?? prefs.quiet_hours_end,
          now,
        ]
      );
    } else {
      db.prepare(
        `INSERT INTO notification_preferences (user_id, game_invites, game_events, proximity_alerts, friend_activity, achievements, quiet_hours_start, quiet_hours_end, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           game_invites = ?, game_events = ?, proximity_alerts = ?, friend_activity = ?,
           achievements = ?, quiet_hours_start = ?, quiet_hours_end = ?, updated_at = ?`
      ).run(
        userId,
        preferences.game_invites ?? prefs.game_invites ? 1 : 0,
        preferences.game_events ?? prefs.game_events ? 1 : 0,
        preferences.proximity_alerts ?? prefs.proximity_alerts ? 1 : 0,
        preferences.friend_activity ?? prefs.friend_activity ? 1 : 0,
        preferences.achievements ?? prefs.achievements ? 1 : 0,
        preferences.quiet_hours_start ?? prefs.quiet_hours_start,
        preferences.quiet_hours_end ?? prefs.quiet_hours_end,
        now,
        preferences.game_invites ?? prefs.game_invites ? 1 : 0,
        preferences.game_events ?? prefs.game_events ? 1 : 0,
        preferences.proximity_alerts ?? prefs.proximity_alerts ? 1 : 0,
        preferences.friend_activity ?? prefs.friend_activity ? 1 : 0,
        preferences.achievements ?? prefs.achievements ? 1 : 0,
        preferences.quiet_hours_start ?? prefs.quiet_hours_start,
        preferences.quiet_hours_end ?? prefs.quiet_hours_end,
        now
      );
    }
  },
};

// Check if we're in quiet hours for a user
function isInQuietHours(prefs) {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();

  if (prefs.quiet_hours_start <= prefs.quiet_hours_end) {
    return currentHour >= prefs.quiet_hours_start && currentHour < prefs.quiet_hours_end;
  } else {
    // Quiet hours span midnight
    return currentHour >= prefs.quiet_hours_start || currentHour < prefs.quiet_hours_end;
  }
}

// Map notification type to preference key
function getPreferenceKeyForType(type) {
  switch (type) {
    case NotificationType.GAME_INVITE:
      return 'game_invites';
    case NotificationType.GAME_STARTING:
    case NotificationType.YOU_ARE_IT:
    case NotificationType.PLAYER_TAGGED:
    case NotificationType.GAME_ENDED:
      return 'game_events';
    case NotificationType.IT_NEARBY:
      return 'proximity_alerts';
    case NotificationType.FRIEND_REQUEST:
      return 'friend_activity';
    case NotificationType.ACHIEVEMENT_UNLOCKED:
    case NotificationType.POWER_UP_AVAILABLE:
      return 'achievements';
    default:
      return null;
  }
}

// Expo Push Service
export const expoPushService = {
  // Check if a token is a valid Expo push token
  isValidExpoPushToken(token) {
    return Expo.isExpoPushToken(token);
  },

  // Register a device token
  async registerToken(userId, token, platform, deviceId = null) {
    if (!this.isValidExpoPushToken(token)) {
      logger.warn('Invalid Expo push token', { userId, token: token.substring(0, 20) });
      return false;
    }

    return pushTokenDb.saveToken(userId, token, platform, deviceId);
  },

  // Unregister a device token
  async unregisterToken(userId, token) {
    return pushTokenDb.removeToken(userId, token);
  },

  // Get notification preferences
  async getPreferences(userId) {
    return notificationPrefsDb.getPreferences(userId);
  },

  // Update notification preferences
  async updatePreferences(userId, preferences) {
    return notificationPrefsDb.updatePreferences(userId, preferences);
  },

  // Send notification to a single user
  async sendToUser(userId, notification, type = null) {
    const tokens = await pushTokenDb.getTokensForUser(userId);
    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Check preferences
    if (type) {
      const prefs = await notificationPrefsDb.getPreferences(userId);
      const prefKey = getPreferenceKeyForType(type);

      if (prefKey && !prefs[prefKey]) {
        logger.debug('Notification blocked by user preference', { userId, type });
        return { sent: 0, failed: 0, blocked: true };
      }

      if (isInQuietHours(prefs)) {
        logger.debug('Notification blocked by quiet hours', { userId, type });
        return { sent: 0, failed: 0, blocked: true };
      }
    }

    return this._sendToTokens(tokens.map(t => t.token), notification);
  },

  // Send notification to multiple users
  async sendToUsers(userIds, notification, type = null) {
    const allTokens = await pushTokenDb.getTokensForUsers(userIds);
    if (allTokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Filter by preferences if type is provided
    let filteredTokens = allTokens;
    if (type) {
      const prefKey = getPreferenceKeyForType(type);
      if (prefKey) {
        const userPrefs = new Map();
        for (const userId of userIds) {
          userPrefs.set(userId, await notificationPrefsDb.getPreferences(userId));
        }

        filteredTokens = allTokens.filter(t => {
          const prefs = userPrefs.get(t.user_id);
          return prefs && prefs[prefKey] && !isInQuietHours(prefs);
        });
      }
    }

    if (filteredTokens.length === 0) {
      return { sent: 0, failed: 0, blocked: true };
    }

    return this._sendToTokens(filteredTokens.map(t => t.token), notification);
  },

  // Internal method to send to tokens
  async _sendToTokens(tokens, notification) {
    const messages = [];

    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token)) {
        logger.warn('Skipping invalid Expo push token', { token: token.substring(0, 20) });
        continue;
      }

      messages.push({
        to: token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        priority: notification.priority || 'high',
        channelId: notification.channelId || 'default',
        categoryId: notification.categoryId,
        ttl: notification.ttl,
      });
    }

    if (messages.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Chunk messages for Expo's rate limiting
    const chunks = expo.chunkPushNotifications(messages);
    let sent = 0;
    let failed = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            if (ticket.details?.error === 'DeviceNotRegistered') {
              // Token is invalid, remove it
              await pushTokenDb.removeInvalidToken(chunk[i].to);
            }
            logger.error('Push notification failed', {
              error: ticket.message,
              details: ticket.details,
            });
          }
        }
      } catch (error) {
        logger.error('Error sending push notification chunk', { error: error.message });
        failed += chunk.length;
      }
    }

    return { sent, failed };
  },

  // Notification templates
  notifications: {
    gameInvite(senderName, gameCode) {
      return {
        title: 'Game Invite!',
        body: `${senderName} invited you to play TAG!`,
        sound: 'default',
        data: {
          type: NotificationType.GAME_INVITE,
          gameCode,
          action: 'join_game',
        },
        categoryId: 'game_invite',
      };
    },

    gameStarting(gameName, itPlayerName) {
      return {
        title: 'Game Starting!',
        body: `${gameName} is starting. ${itPlayerName} is IT!`,
        sound: 'default',
        data: {
          type: NotificationType.GAME_STARTING,
          action: 'open_game',
        },
      };
    },

    youAreIt(taggerName = null) {
      return {
        title: "You're IT!",
        body: taggerName ? `${taggerName} tagged you! Time to chase!` : 'You were tagged! Time to chase!',
        sound: 'default',
        data: {
          type: NotificationType.YOU_ARE_IT,
          action: 'open_game',
        },
        priority: 'high',
      };
    },

    playerTagged(taggerName, taggedName) {
      return {
        title: 'Tag!',
        body: `${taggerName} tagged ${taggedName}!`,
        sound: 'default',
        data: {
          type: NotificationType.PLAYER_TAGGED,
          action: 'open_game',
        },
      };
    },

    itNearby(distance) {
      return {
        title: 'IT is nearby!',
        body: `IT is ${Math.round(distance)}m away! Run!`,
        sound: 'default',
        data: {
          type: NotificationType.IT_NEARBY,
          distance,
          action: 'open_game',
        },
        priority: 'high',
      };
    },

    gameEnded(winnerName, result) {
      return {
        title: 'Game Over!',
        body: winnerName ? `${winnerName} wins!` : 'Game has ended',
        sound: 'default',
        data: {
          type: NotificationType.GAME_ENDED,
          result,
          action: 'view_results',
        },
      };
    },

    friendRequest(senderName) {
      return {
        title: 'Friend Request',
        body: `${senderName} wants to be your friend!`,
        sound: 'default',
        data: {
          type: NotificationType.FRIEND_REQUEST,
          action: 'view_friends',
        },
      };
    },

    achievementUnlocked(achievementName, description) {
      return {
        title: 'Achievement Unlocked!',
        body: `${achievementName}: ${description}`,
        sound: 'default',
        data: {
          type: NotificationType.ACHIEVEMENT_UNLOCKED,
          achievementName,
          action: 'view_achievements',
        },
      };
    },
  },
};

export { pushTokenDb, notificationPrefsDb };
export default expoPushService;
