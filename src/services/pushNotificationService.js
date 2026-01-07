/**
 * Push Notification Service
 * Phase 3: Push notification system with Expo/Web Push
 */

import { api } from './api';

// Notification types
export const NotificationType = {
  FRIEND_REQUEST: 'friend_request',
  GAME_INVITE: 'game_invite',
  YOU_ARE_IT: 'you_are_it',
  ACHIEVEMENT: 'achievement',
  GAME_STARTING: 'game_starting',
  FRIEND_ONLINE: 'friend_online',
  TAG_RECEIVED: 'tag_received',
  GAME_ENDED: 'game_ended',
  CHALLENGE_COMPLETE: 'challenge_complete',
  DAILY_REWARD: 'daily_reward',
  IT_NEARBY: 'it_nearby',
  FRIEND_CREATED_GAME: 'friend_created_game',
  SAFE_ZONE_ENDING: 'safe_zone_ending',
  LEADERBOARD_RANK: 'leaderboard_rank',
};

class PushNotificationService {
  constructor() {
    this.permission = 'default';
    this.subscription = null;
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.preferences = this.loadPreferences();
  }

  /**
   * Load notification preferences from localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem('notification_preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load notification preferences');
    }

    // Default preferences - all enabled
    return {
      [NotificationType.FRIEND_REQUEST]: true,
      [NotificationType.GAME_INVITE]: true,
      [NotificationType.YOU_ARE_IT]: true,
      [NotificationType.ACHIEVEMENT]: true,
      [NotificationType.GAME_STARTING]: true,
      [NotificationType.FRIEND_ONLINE]: true,
      [NotificationType.TAG_RECEIVED]: true,
      [NotificationType.GAME_ENDED]: true,
      [NotificationType.CHALLENGE_COMPLETE]: true,
      [NotificationType.DAILY_REWARD]: true,
      [NotificationType.IT_NEARBY]: true,
      [NotificationType.FRIEND_CREATED_GAME]: true,
      [NotificationType.SAFE_ZONE_ENDING]: true,
      [NotificationType.LEADERBOARD_RANK]: true,
    };
  }

  /**
   * Save notification preferences
   */
  savePreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('Failed to save notification preferences');
    }
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported() {
    return this.isSupported;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported) {
      return { granted: false, reason: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        await this.subscribe();
        return { granted: true };
      }

      return { granted: false, reason: permission };
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return { granted: false, reason: 'error' };
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && this.vapidPublicKey) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
        });
      }

      if (subscription) {
        this.subscription = subscription;

        // Send subscription to server
        await api.request('/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) return;

    try {
      await this.subscription.unsubscribe();

      // Notify server
      await api.request('/notifications/unsubscribe', {
        method: 'POST',
      });

      this.subscription = null;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
      return null;
    }

    // Check if this notification type is enabled
    if (options.type && !this.preferences[options.type]) {
      return null;
    }

    const defaultOptions = {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      tag: options.type || 'default',
      requireInteraction: false,
      silent: false,
    };

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.showNotification(title, {
        ...defaultOptions,
        ...options,
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  /**
   * Notification templates
   */
  notifications = {
    friendRequest: (fromName) => ({
      title: '👋 New Friend Request',
      body: `${fromName} wants to be your friend!`,
      type: NotificationType.FRIEND_REQUEST,
      data: { action: 'view_friends' },
    }),

    gameInvite: (fromName, gameCode) => ({
      title: '🎮 Game Invite',
      body: `${fromName} invited you to play TAG!`,
      type: NotificationType.GAME_INVITE,
      data: { action: 'join_game', gameCode },
    }),

    youAreIt: (taggerName) => ({
      title: "🏃 You're IT!",
      body: `${taggerName} tagged you! Chase someone down!`,
      type: NotificationType.YOU_ARE_IT,
      data: { action: 'open_game' },
    }),

    achievement: (achievementName, achievementIcon) => ({
      title: '🏆 Achievement Unlocked!',
      body: `${achievementIcon} ${achievementName}`,
      type: NotificationType.ACHIEVEMENT,
      data: { action: 'view_achievements' },
    }),

    gameStarting: (gameName, timeUntilStart) => ({
      title: '⏰ Game Starting Soon',
      body: `${gameName} starts in ${timeUntilStart}!`,
      type: NotificationType.GAME_STARTING,
      data: { action: 'open_game' },
    }),

    friendOnline: (friendName) => ({
      title: '🟢 Friend Online',
      body: `${friendName} is now online. Invite them to play!`,
      type: NotificationType.FRIEND_ONLINE,
      data: { action: 'view_friend' },
    }),

    tagReceived: (taggerName) => ({
      title: '🎯 You Got Tagged!',
      body: `${taggerName} caught up to you!`,
      type: NotificationType.TAG_RECEIVED,
      data: { action: 'open_game' },
    }),

    gameEnded: (winnerName, isWinner) => ({
      title: isWinner ? '🏆 You Won!' : '🎮 Game Over',
      body: isWinner ? 'Congratulations on your victory!' : `${winnerName} won the game!`,
      type: NotificationType.GAME_ENDED,
      data: { action: 'view_results' },
    }),

    challengeComplete: (challengeName, reward) => ({
      title: '✅ Challenge Complete!',
      body: `You completed "${challengeName}" and earned ${reward}!`,
      type: NotificationType.CHALLENGE_COMPLETE,
      data: { action: 'view_challenges' },
    }),

    dailyReward: (rewardDescription) => ({
      title: '🎁 Daily Reward Available',
      body: rewardDescription || 'Claim your daily reward!',
      type: NotificationType.DAILY_REWARD,
      data: { action: 'claim_reward' },
    }),

    itNearby: (distance) => ({
      title: '⚠️ IT is Near!',
      body: `IT is only ${distance} away! Run!`,
      type: NotificationType.IT_NEARBY,
      data: { action: 'open_game' },
    }),

    friendCreatedGame: (friendName, gameCode) => ({
      title: '🎮 Friend Started a Game',
      body: `${friendName} created a new game! Join them now.`,
      type: NotificationType.FRIEND_CREATED_GAME,
      data: { action: 'join_game', gameCode },
    }),

    safeZoneEnding: (zoneName, timeLeft) => ({
      title: '🛡️ Safe Zone Ending Soon',
      body: `${zoneName || 'Your safe zone'} expires in ${timeLeft}!`,
      type: NotificationType.SAFE_ZONE_ENDING,
      data: { action: 'open_game' },
    }),

    leaderboardRank: (category, rank, change) => ({
      title: change > 0 ? '📈 Rank Up!' : '🏆 Leaderboard Update',
      body: change > 0
        ? `You moved up to #${rank} in ${category}!`
        : `You're now #${rank} in ${category}`,
      type: NotificationType.LEADERBOARD_RANK,
      data: { action: 'view_leaderboard', category },
    }),
  };

  /**
   * Helper: Convert VAPID key
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
