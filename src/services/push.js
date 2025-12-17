import { api } from './api';

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.supported = 'serviceWorker' in navigator && 'PushManager' in window;
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
      console.log('Push notifications not supported');
      return false;
    }

    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Get VAPID public key from server
      const { publicKey, enabled } = await api.request('/push/vapid-public-key');
      if (!enabled || !publicKey) {
        console.log('Push notifications not configured on server');
        return false;
      }

      // Get service worker registration
      const registration = await this.getRegistration();
      if (!registration) {
        console.log('Service worker not registered');
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

      console.log('Push notifications subscribed');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
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
      console.log('Push notifications unsubscribed');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
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
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          ...options,
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
    return false;
  }
}

export const pushService = new PushNotificationService();
export default pushService;
