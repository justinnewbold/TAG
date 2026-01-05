/**
 * Smart Notification Service
 * Context-aware notifications with priority, batching, and quiet hours
 */

import { cacheService } from './cacheService';

// Notification priorities
export const NOTIFICATION_PRIORITY = {
  CRITICAL: 'critical',    // Always show immediately (tag incoming, game ending)
  HIGH: 'high',           // Important game events (near player, objective)
  MEDIUM: 'medium',       // Regular updates (power-ups, score changes)
  LOW: 'low',             // Nice to know (achievements, tips)
  SILENT: 'silent',       // Log only, no alert
};

// Notification categories
export const NOTIFICATION_CATEGORY = {
  GAME_EVENT: 'game_event',
  PROXIMITY: 'proximity',
  ACHIEVEMENT: 'achievement',
  SOCIAL: 'social',
  SYSTEM: 'system',
  POWER_UP: 'power_up',
  OBJECTIVE: 'objective',
  CLAN: 'clan',
  RANKED: 'ranked',
};

// Notification templates
const NOTIFICATION_TEMPLATES = {
  // Game events
  tag_incoming: {
    category: NOTIFICATION_CATEGORY.GAME_EVENT,
    priority: NOTIFICATION_PRIORITY.CRITICAL,
    title: 'Incoming Tag!',
    body: '{taggerName} is {distance}m away!',
    icon: '🏃',
    vibrate: [200, 100, 200],
    sound: 'alert',
    ttl: 10000,
  },
  tagged: {
    category: NOTIFICATION_CATEGORY.GAME_EVENT,
    priority: NOTIFICATION_PRIORITY.CRITICAL,
    title: 'You\'ve Been Tagged!',
    body: '{taggerName} got you!',
    icon: '👆',
    vibrate: [500],
    sound: 'tagged',
    ttl: 30000,
  },
  tag_success: {
    category: NOTIFICATION_CATEGORY.GAME_EVENT,
    priority: NOTIFICATION_PRIORITY.HIGH,
    title: 'Tag Successful!',
    body: 'You tagged {targetName}!',
    icon: '🎯',
    vibrate: [100, 50, 100],
    sound: 'success',
    ttl: 15000,
  },
  game_starting: {
    category: NOTIFICATION_CATEGORY.GAME_EVENT,
    priority: NOTIFICATION_PRIORITY.HIGH,
    title: 'Game Starting!',
    body: '{gameName} starts in {countdown} seconds',
    icon: '🎮',
    vibrate: [100],
    sound: 'gamestart',
    ttl: 60000,
  },
  game_ending: {
    category: NOTIFICATION_CATEGORY.GAME_EVENT,
    priority: NOTIFICATION_PRIORITY.CRITICAL,
    title: 'Game Ending Soon!',
    body: '{timeLeft} left in the game!',
    icon: '⏰',
    vibrate: [100, 50, 100, 50, 100],
    sound: 'warning',
    ttl: 30000,
  },
  zone_shrinking: {
    category: NOTIFICATION_CATEGORY.GAME_EVENT,
    priority: NOTIFICATION_PRIORITY.HIGH,
    title: 'Zone Shrinking!',
    body: 'Safe zone shrinks in {countdown}s. Move {direction}!',
    icon: '🌀',
    vibrate: [200, 100, 200],
    sound: 'warning',
    ttl: 20000,
  },

  // Proximity
  player_nearby: {
    category: NOTIFICATION_CATEGORY.PROXIMITY,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Player Nearby',
    body: '{playerName} is {distance}m away',
    icon: '📍',
    vibrate: [50],
    cooldown: 30000, // Don't repeat within 30s for same player
    ttl: 10000,
  },
  hunter_approaching: {
    category: NOTIFICATION_CATEGORY.PROXIMITY,
    priority: NOTIFICATION_PRIORITY.HIGH,
    title: 'Hunter Approaching!',
    body: 'A hunter is getting closer...',
    icon: '👁️',
    vibrate: [100, 50, 100],
    sound: 'danger',
    ttl: 15000,
  },
  entering_safe_zone: {
    category: NOTIFICATION_CATEGORY.PROXIMITY,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Safe Zone',
    body: 'You entered a safe area',
    icon: '🏠',
    vibrate: [50],
    ttl: 5000,
  },

  // Power-ups
  powerup_available: {
    category: NOTIFICATION_CATEGORY.POWER_UP,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Power-Up Nearby!',
    body: '{powerupName} spawned {distance}m away',
    icon: '⚡',
    vibrate: [50, 25, 50],
    ttl: 30000,
  },
  powerup_expiring: {
    category: NOTIFICATION_CATEGORY.POWER_UP,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Power-Up Expiring',
    body: '{powerupName} expires in {countdown}s',
    icon: '⏳',
    vibrate: [50],
    ttl: 10000,
  },

  // Objectives
  objective_nearby: {
    category: NOTIFICATION_CATEGORY.OBJECTIVE,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Objective Nearby',
    body: '{objectiveName} is {distance}m away',
    icon: '🚩',
    vibrate: [50],
    ttl: 20000,
  },
  objective_captured: {
    category: NOTIFICATION_CATEGORY.OBJECTIVE,
    priority: NOTIFICATION_PRIORITY.HIGH,
    title: 'Objective Captured!',
    body: '{playerName} captured {objectiveName}',
    icon: '🏆',
    vibrate: [100, 50, 100],
    sound: 'capture',
    ttl: 15000,
  },

  // Achievements
  achievement_unlocked: {
    category: NOTIFICATION_CATEGORY.ACHIEVEMENT,
    priority: NOTIFICATION_PRIORITY.LOW,
    title: 'Achievement Unlocked!',
    body: '{achievementName}',
    icon: '🏅',
    vibrate: [50, 25, 50, 25, 50],
    sound: 'achievement',
    ttl: 60000,
  },
  level_up: {
    category: NOTIFICATION_CATEGORY.ACHIEVEMENT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Level Up!',
    body: 'You reached level {level}!',
    icon: '⬆️',
    vibrate: [100, 50, 100, 50, 100],
    sound: 'levelup',
    ttl: 30000,
  },

  // Social
  friend_online: {
    category: NOTIFICATION_CATEGORY.SOCIAL,
    priority: NOTIFICATION_PRIORITY.LOW,
    title: 'Friend Online',
    body: '{friendName} is now playing',
    icon: '👋',
    ttl: 30000,
  },
  game_invite: {
    category: NOTIFICATION_CATEGORY.SOCIAL,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Game Invite',
    body: '{playerName} invited you to {gameName}',
    icon: '✉️',
    vibrate: [100],
    sound: 'invite',
    ttl: 300000, // 5 minutes
  },
  chat_message: {
    category: NOTIFICATION_CATEGORY.SOCIAL,
    priority: NOTIFICATION_PRIORITY.LOW,
    title: 'New Message',
    body: '{senderName}: {messagePreview}',
    icon: '💬',
    vibrate: [25],
    ttl: 60000,
  },

  // Clan
  clan_war_started: {
    category: NOTIFICATION_CATEGORY.CLAN,
    priority: NOTIFICATION_PRIORITY.HIGH,
    title: 'Clan War Started!',
    body: 'Your clan is at war with {enemyClan}',
    icon: '⚔️',
    vibrate: [200, 100, 200],
    sound: 'war',
    ttl: 300000,
  },
  clan_invite: {
    category: NOTIFICATION_CATEGORY.CLAN,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Clan Invite',
    body: '{clanName} invited you to join',
    icon: '🏰',
    vibrate: [100],
    ttl: 86400000, // 24 hours
  },

  // Ranked
  rank_change: {
    category: NOTIFICATION_CATEGORY.RANKED,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: '{direction} Rank!',
    body: 'You are now {rank}',
    icon: '{icon}',
    vibrate: [100, 50, 100],
    sound: 'rank',
    ttl: 60000,
  },
  season_ending: {
    category: NOTIFICATION_CATEGORY.RANKED,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    title: 'Season Ending',
    body: 'Ranked season ends in {timeLeft}',
    icon: '📅',
    ttl: 86400000,
  },
};

// Default preferences
const DEFAULT_PREFERENCES = {
  enabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  categories: {
    [NOTIFICATION_CATEGORY.GAME_EVENT]: true,
    [NOTIFICATION_CATEGORY.PROXIMITY]: true,
    [NOTIFICATION_CATEGORY.ACHIEVEMENT]: true,
    [NOTIFICATION_CATEGORY.SOCIAL]: true,
    [NOTIFICATION_CATEGORY.SYSTEM]: true,
    [NOTIFICATION_CATEGORY.POWER_UP]: true,
    [NOTIFICATION_CATEGORY.OBJECTIVE]: true,
    [NOTIFICATION_CATEGORY.CLAN]: true,
    [NOTIFICATION_CATEGORY.RANKED]: true,
  },
  priorities: {
    [NOTIFICATION_PRIORITY.CRITICAL]: true,
    [NOTIFICATION_PRIORITY.HIGH]: true,
    [NOTIFICATION_PRIORITY.MEDIUM]: true,
    [NOTIFICATION_PRIORITY.LOW]: false, // Low priority off by default
    [NOTIFICATION_PRIORITY.SILENT]: false,
  },
  sounds: true,
  vibration: true,
  batching: {
    enabled: true,
    maxBatchSize: 5,
    batchDelayMs: 2000,
  },
};

class SmartNotificationService {
  constructor() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.notificationQueue = [];
    this.recentNotifications = new Map(); // For cooldown tracking
    this.batchTimeout = null;
    this.listeners = new Map();
    this.permission = 'default';
    this.isInGame = false;
    this.gameContext = null;

    // Initialize
    this.loadPreferences();
    this.requestPermission();
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    this.permission = 'denied';
    return false;
  }

  /**
   * Load user preferences
   */
  async loadPreferences() {
    try {
      const stored = await cacheService.get('notification_preferences');
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...stored };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  /**
   * Save user preferences
   */
  async savePreferences() {
    try {
      await cacheService.set('notification_preferences', this.preferences, Infinity);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Update preferences
   */
  async updatePreferences(updates) {
    this.preferences = { ...this.preferences, ...updates };
    await this.savePreferences();
    this.emit('preferences_changed', this.preferences);
  }

  /**
   * Set game context for smart notifications
   */
  setGameContext(context) {
    this.isInGame = !!context;
    this.gameContext = context;
  }

  /**
   * Send a notification using a template
   */
  async notify(templateId, data = {}) {
    const template = NOTIFICATION_TEMPLATES[templateId];
    if (!template) {
      console.warn('Unknown notification template:', templateId);
      return null;
    }

    // Check if should send
    if (!this.shouldSendNotification(template)) {
      return null;
    }

    // Check cooldown
    if (template.cooldown && data.uniqueId) {
      const cooldownKey = `${templateId}_${data.uniqueId}`;
      const lastSent = this.recentNotifications.get(cooldownKey);
      if (lastSent && Date.now() - lastSent < template.cooldown) {
        return null;
      }
      this.recentNotifications.set(cooldownKey, Date.now());
    }

    // Build notification
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      ...template,
      title: this.interpolate(template.title, data),
      body: this.interpolate(template.body, data),
      icon: this.interpolate(template.icon, data),
      data,
      timestamp: Date.now(),
    };

    // Handle batching for non-critical notifications
    if (this.preferences.batching.enabled && template.priority !== NOTIFICATION_PRIORITY.CRITICAL) {
      return this.queueNotification(notification);
    }

    // Send immediately for critical or when batching disabled
    return this.sendNotification(notification);
  }

  /**
   * Check if notification should be sent
   */
  shouldSendNotification(template) {
    // Master switch
    if (!this.preferences.enabled) return false;

    // Permission check
    if (this.permission !== 'granted') return false;

    // Category check
    if (!this.preferences.categories[template.category]) return false;

    // Priority check (critical always goes through)
    if (template.priority !== NOTIFICATION_PRIORITY.CRITICAL) {
      if (!this.preferences.priorities[template.priority]) return false;
    }

    // Quiet hours (critical still goes through)
    if (this.isQuietHours() && template.priority !== NOTIFICATION_PRIORITY.CRITICAL) {
      return false;
    }

    return true;
  }

  /**
   * Check if currently in quiet hours
   */
  isQuietHours() {
    if (!this.preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * Queue notification for batching
   */
  queueNotification(notification) {
    this.notificationQueue.push(notification);

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Check if batch is full
    if (this.notificationQueue.length >= this.preferences.batching.maxBatchSize) {
      return this.flushNotificationQueue();
    }

    // Set timeout to flush
    this.batchTimeout = setTimeout(() => {
      this.flushNotificationQueue();
    }, this.preferences.batching.batchDelayMs);

    return notification;
  }

  /**
   * Flush notification queue
   */
  async flushNotificationQueue() {
    if (this.notificationQueue.length === 0) return;

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = [...this.notificationQueue];
    this.notificationQueue = [];

    // Single notification
    if (batch.length === 1) {
      return this.sendNotification(batch[0]);
    }

    // Batch notification
    const batchedNotification = {
      id: `batch_${Date.now()}`,
      title: `${batch.length} New Notifications`,
      body: batch.map(n => n.title).join(', '),
      icon: '🔔',
      priority: Math.max(...batch.map(n => this.getPriorityValue(n.priority))),
      data: { batch },
      timestamp: Date.now(),
    };

    return this.sendNotification(batchedNotification);
  }

  /**
   * Send a single notification
   */
  async sendNotification(notification) {
    // Emit event for in-app handling
    this.emit('notification', notification);

    // Play sound if enabled
    if (this.preferences.sounds && notification.sound) {
      this.playSound(notification.sound);
    }

    // Vibrate if enabled
    if (this.preferences.vibration && notification.vibrate && navigator.vibrate) {
      navigator.vibrate(notification.vibrate);
    }

    // Show system notification if permission granted
    if (this.permission === 'granted') {
      try {
        const systemNotification = new Notification(notification.title, {
          body: notification.body,
          icon: `/icons/${notification.icon || 'default'}.png`,
          badge: '/icons/badge.png',
          tag: notification.id,
          renotify: true,
          requireInteraction: notification.priority === NOTIFICATION_PRIORITY.CRITICAL,
          data: notification.data,
        });

        systemNotification.onclick = () => {
          this.handleNotificationClick(notification);
          systemNotification.close();
        };

        // Auto close after TTL
        if (notification.ttl) {
          setTimeout(() => {
            systemNotification.close();
          }, notification.ttl);
        }
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    }

    return notification;
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notification) {
    this.emit('notification_click', notification);

    // Focus app window
    if (window.focus) {
      window.focus();
    }

    // Navigate based on notification type
    // This would integrate with your routing system
  }

  /**
   * Play notification sound
   */
  playSound(soundId) {
    try {
      const audio = new Audio(`/sounds/${soundId}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Autoplay might be blocked
      });
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Get numeric priority value
   */
  getPriorityValue(priority) {
    const values = {
      [NOTIFICATION_PRIORITY.CRITICAL]: 5,
      [NOTIFICATION_PRIORITY.HIGH]: 4,
      [NOTIFICATION_PRIORITY.MEDIUM]: 3,
      [NOTIFICATION_PRIORITY.LOW]: 2,
      [NOTIFICATION_PRIORITY.SILENT]: 1,
    };
    return values[priority] || 0;
  }

  /**
   * Interpolate template string
   */
  interpolate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  // ============ SMART NOTIFICATION HELPERS ============

  /**
   * Notify about proximity events intelligently
   */
  async notifyProximity(playerId, playerName, distance, role) {
    // Determine urgency based on distance and game context
    if (role === 'hunter' && distance < 50) {
      await this.notify('tag_incoming', {
        taggerName: playerName,
        distance: Math.round(distance),
        uniqueId: playerId,
      });
    } else if (role === 'hunter' && distance < 100) {
      await this.notify('hunter_approaching', {
        uniqueId: playerId,
      });
    } else if (distance < 200) {
      await this.notify('player_nearby', {
        playerName,
        distance: Math.round(distance),
        uniqueId: playerId,
      });
    }
  }

  /**
   * Notify about game timing events
   */
  async notifyGameTiming(event, data) {
    switch (event) {
      case 'starting':
        await this.notify('game_starting', data);
        break;
      case 'ending':
        await this.notify('game_ending', data);
        break;
      case 'zone_shrink':
        await this.notify('zone_shrinking', data);
        break;
    }
  }

  /**
   * Notify about achievements with context
   */
  async notifyAchievement(achievement) {
    await this.notify('achievement_unlocked', {
      achievementName: achievement.name,
      achievementDesc: achievement.description,
    });
  }

  /**
   * Notify about rank changes
   */
  async notifyRankChange(oldRank, newRank, isPromotion) {
    await this.notify('rank_change', {
      direction: isPromotion ? 'Promoted' : 'Demoted',
      rank: newRank.name,
      icon: newRank.icon,
    });
  }

  // ============ EVENT EMITTER ============

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return Object.keys(NOTIFICATION_TEMPLATES);
  }

  /**
   * Clear recent notifications cache
   */
  clearRecentCache() {
    this.recentNotifications.clear();
  }
}

// Singleton
export const smartNotificationService = new SmartNotificationService();
export default smartNotificationService;
