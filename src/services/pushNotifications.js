/**
 * Push Notifications Service
 * Handles Web Push subscription and notification management
 */

import { api } from './api.js';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.subscription = null;
    this.isSupported = this._checkSupport();
    this.permissionState = 'default';
    this.vapidPublicKey = null;
  }

  _checkSupport() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Check current permission state
      this.permissionState = Notification.permission;

      // Get existing subscription
      this.subscription = await this.swRegistration.pushManager.getSubscription();

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this._handleSwMessage.bind(this));

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  _handleSwMessage(event) {
    const { type, data } = event.data || {};

    switch (type) {
      case 'NOTIFICATION_CLICK':
        // Handle notification click from service worker
        window.dispatchEvent(new CustomEvent('push-notification-click', { detail: data }));
        break;
      case 'SYNC_COMPLETE':
        window.dispatchEvent(new CustomEvent('offline-sync-complete'));
        break;
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async subscribe() {
    if (!this.isSupported || this.permissionState !== 'granted') {
      return null;
    }

    try {
      // Unsubscribe from any existing subscription
      const existingSub = await this.swRegistration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Subscribe with VAPID key
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      await this._sendSubscriptionToServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      // Notify server about unsubscribe
      await api.post('/api/notifications/unsubscribe', {
        endpoint: this.subscription.endpoint,
      });

      // Unsubscribe from push manager
      await this.subscription.unsubscribe();
      this.subscription = null;

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async _sendSubscriptionToServer(subscription) {
    try {
      const subscriptionJson = subscription.toJSON();
      await api.post('/api/notifications/subscribe', {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
        expirationTime: subscriptionJson.expirationTime,
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

  // Check if currently subscribed
  isSubscribed() {
    return !!this.subscription;
  }

  // Get permission state
  getPermissionState() {
    return this.permissionState;
  }

  // Show local notification (for testing or instant feedback)
  async showLocalNotification(title, options = {}) {
    if (this.permissionState !== 'granted') {
      return false;
    }

    try {
      await this.swRegistration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Failed to show local notification:', error);
      return false;
    }
  }

  // Notification templates for common game events
  async notifyTagged(taggerName, gameId) {
    return this.showLocalNotification("You've been tagged!", {
      body: `${taggerName} just tagged you! You're now IT!`,
      tag: 'tagged',
      data: { type: 'tagged', gameId },
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      actions: [
        { action: 'view_game', title: 'View Game' },
      ],
    });
  }

  async notifyGameStart(gameName, gameId) {
    return this.showLocalNotification('Game Starting!', {
      body: `${gameName || 'Your game'} is starting now!`,
      tag: 'game-start',
      data: { type: 'game_start', gameId },
      vibrate: [500, 200, 500],
      requireInteraction: true,
    });
  }

  async notifyItNearby(distance, gameId) {
    return this.showLocalNotification('IT is nearby!', {
      body: `Watch out! IT is approximately ${Math.round(distance)}m away!`,
      tag: 'it-nearby',
      data: { type: 'it_nearby', gameId },
      vibrate: [100, 50, 100, 50, 100, 50, 100],
      silent: false,
    });
  }

  async notifyFriendInvite(friendName, gameCode, gameId) {
    return this.showLocalNotification('Game Invite!', {
      body: `${friendName} invited you to play TAG!`,
      tag: 'friend-invite',
      data: { type: 'friend_invite', gameCode, gameId },
      actions: [
        { action: 'accept_invite', title: 'Join Game' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  async notifyAchievement(achievementName, description) {
    return this.showLocalNotification('Achievement Unlocked!', {
      body: `${achievementName}: ${description}`,
      tag: 'achievement',
      data: { type: 'achievement' },
      icon: '/icon-achievement.png',
    });
  }
}

export const pushNotifications = new PushNotificationService();
