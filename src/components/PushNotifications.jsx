import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, Smartphone, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';

/**
 * Push Notification Manager
 * Handles subscription, permissions, and notification preferences
 */

// VAPID public key (generate your own for production)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export default function PushNotifications() {
  const { user, updateUserProfile } = useStore();
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Notification preferences
  const [preferences, setPreferences] = useState({
    gameInvites: true,
    gameStarting: true,
    beingHunted: true,
    friendOnline: true,
    dailyChallenges: true,
    weeklyRewards: true,
    tagAlerts: true,
    bountyPlaced: true,
  });

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load saved preferences
    if (user?.notificationPrefs) {
      setPreferences(prev => ({ ...prev, ...user.notificationPrefs }));
    }

    // Check for existing subscription
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    }
  };

  const requestPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToNotifications();
      }
    } catch (err) {
      setError('Failed to request permission');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);

      // Save subscription to server
      await saveSubscriptionToServer(sub);

      // Show success notification
      new Notification('TAG Notifications Enabled! 🎮', {
        body: "You'll now receive alerts for games, hunts, and more!",
        icon: '/icon-192.png',
        badge: '/badge-72.png',
      });

    } catch (err) {
      setError('Failed to subscribe to notifications');
      console.error(err);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        // Remove from server
        await removeSubscriptionFromServer();
      }
    } catch (err) {
      setError('Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  const saveSubscriptionToServer = async (sub) => {
    // Save to user profile and backend
    await updateUserProfile({
      pushSubscription: JSON.stringify(sub),
      notificationsEnabled: true,
    });
  };

  const removeSubscriptionFromServer = async () => {
    await updateUserProfile({
      pushSubscription: null,
      notificationsEnabled: false,
    });
  };

  const updatePreference = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    await updateUserProfile({ notificationPrefs: newPrefs });
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('🎯 Test Notification', {
        body: 'Push notifications are working!',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'test',
      });
    }
  };

  const notSupported = !('Notification' in window) || !('serviceWorker' in navigator);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary-400" />
          Push Notifications
        </h2>
        {subscription && (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
            Active
          </span>
        )}
      </div>

      {/* Not Supported Warning */}
      {notSupported && (
        <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 font-medium">Not Supported</p>
            <p className="text-yellow-200/70 text-sm">
              Push notifications aren't available in this browser. Try Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      )}

      {/* Permission Request */}
      {!notSupported && permission !== 'granted' && (
        <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <Smartphone className="w-8 h-8 text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">Enable Notifications</h3>
              <p className="text-gray-400 text-sm mb-3">
                Get alerts when games start, you're being hunted, friends come online, and more!
              </p>
              <button
                onClick={requestPermission}
                disabled={loading || permission === 'denied'}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? 'Enabling...' : permission === 'denied' ? 'Blocked in Browser' : 'Enable Notifications'}
              </button>
              {permission === 'denied' && (
                <p className="text-red-400 text-xs mt-2">
                  Notifications are blocked. Enable them in your browser settings.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Subscription */}
      {subscription && (
        <>
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-green-300">Notifications are enabled</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={testNotification}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
              >
                Test
              </button>
              <button
                onClick={unsubscribe}
                disabled={loading}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
              >
                Disable
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3">
            <h3 className="font-medium text-white">Notification Types</h3>
            
            {[
              { key: 'gameInvites', label: 'Game Invites', desc: 'When friends invite you to play', icon: '🎮' },
              { key: 'gameStarting', label: 'Game Starting', desc: 'Countdown alerts before games begin', icon: '⏰' },
              { key: 'beingHunted', label: 'Being Hunted', desc: 'Alert when you become a target', icon: '🎯' },
              { key: 'tagAlerts', label: 'Tag Alerts', desc: 'When you tag or get tagged', icon: '👋' },
              { key: 'bountyPlaced', label: 'Bounty Alerts', desc: 'When bounties are placed on you', icon: '💰' },
              { key: 'friendOnline', label: 'Friend Activity', desc: 'When friends come online', icon: '👥' },
              { key: 'dailyChallenges', label: 'Daily Challenges', desc: 'New challenge reminders', icon: '📋' },
              { key: 'weeklyRewards', label: 'Weekly Rewards', desc: 'Claim your weekly bonuses', icon: '🎁' },
            ].map(({ key, label, desc, icon }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-dark-800 rounded-xl border border-dark-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => updatePreference(key, !preferences[key])}
                  className={`
                    w-12 h-6 rounded-full transition-colors relative
                    ${preferences[key] ? 'bg-primary-500' : 'bg-dark-600'}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                      ${preferences[key] ? 'translate-x-7' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
