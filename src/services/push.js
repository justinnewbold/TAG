import { api } from './api';
import { logger } from './errorLogger';

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.supported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.log = logger.scope('Push');
  }

  // Check if push notifications are supported
  isSupported() {
    return this.supported;
  }

  // Check current permission status
  getPermissionStatus() {
    if (!this.supported) return 'unsupported';
    return Notification.permission; // 'default', 'granted', 'denied'
  }

  // Request notification permission
  async requestPermission() {
    if (!this.supported) return 'unsupported';

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Get service worker registration
  async getRegistration() {
    if (!this.supported) return null;

    if (!this.registration) {
      this.registration = await navigator.serviceWorker.ready;
    }
    return this.registration;
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.supported) {
      this.log.debug('Push notifications not supported');
      return false;
    }

    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        this.log.info('Push notification permission denied');
        return false;
      }

      // Get VAPID public key from server
      const { publicKey, enabled } = await api.request('/push/vapid-public-key');
      if (!enabled || !publicKey) {
        this.log.info('Push notifications not configured on server');
        return false;
      }

      // Get service worker registration
      const registration = await this.getRegistration();
      if (!registration) {
        this.log.warn('Service worker not registered');
        return false;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // If no subscription, create one
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey),
        });
      }

      this.subscription = subscription;

      // Send subscription to server
      await api.request('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      this.log.info('Push notifications subscribed successfully');
      return true;
    } catch (error) {
      this.log.captureException(error, { action: 'subscribe' });
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.supported) return true;

    try {
      const registration = await this.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Notify server
      await api.request('/push/unsubscribe', { method: 'POST' });

      this.subscription = null;
      this.log.info('Push notifications unsubscribed');
      return true;
    } catch (error) {
      this.log.captureException(error, { action: 'unsubscribe' });
      return false;
    }
  }

  // Check if currently subscribed
  async isSubscribed() {
    if (!this.supported) return false;

    try {
      const registration = await this.getRegistration();
      if (!registration) return false;

      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }

  // Helper to convert VAPID key
  urlBase64ToUint8Array(base64String) {
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

  // Show local notification (for testing or fallback)
  async showLocalNotification(title, options = {}) {
    if (!this.supported) return false;

    const permission = this.getPermissionStatus();
    if (permission !== 'granted') return false;

    try {
      const registration = await this.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          ...options,
        });
        return true;
      }
    } catch (error) {
      this.log.captureException(error, { action: 'showNotification', title });
    }
    return false;
  }

  // Convenience methods for game-specific notifications
  async notifyTagged(taggerName) {
    return this.showLocalNotification('You were tagged!', {
      body: `${taggerName} tagged you. You're now IT!`,
      tag: 'tag-event',
      renotify: true,
      vibrate: [200, 100, 200],
    });
  }

  async notifyGameStarted(gameName) {
    return this.showLocalNotification('Game Started!', {
      body: `${gameName} has begun. Find your target!`,
      tag: 'game-start',
    });
  }

  async notifyPlayerJoined(playerName, gameName) {
    return this.showLocalNotification('Player Joined', {
      body: `${playerName} joined ${gameName}`,
      tag: 'player-join',
    });
  }

  async notifyGameEnded(winnerName) {
    return this.showLocalNotification('Game Over!', {
      body: `${winnerName} won the game!`,
      tag: 'game-end',
    });
  }
}

export const pushService = new PushNotificationService();
export default pushService;
