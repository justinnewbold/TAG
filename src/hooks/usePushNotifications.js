/**
 * React Hook for Push Notifications
 * Provides easy access to push notification functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { pushNotifications } from '../services/pushNotifications.js';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const supported = await pushNotifications.init();
        if (!mounted) return;

        setIsSupported(supported);
        setPermission(pushNotifications.getPermissionState());
        setIsSubscribed(pushNotifications.isSubscribed());
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    setError(null);
    try {
      const result = await pushNotifications.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      setError(err.message);
      return 'error';
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Request permission first if needed
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      const subscription = await pushNotifications.subscribe();
      setIsSubscribed(!!subscription);
      return !!subscription;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await pushNotifications.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle subscription
  const toggle = useCallback(async () => {
    if (isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  // Show a local notification
  const showNotification = useCallback(async (title, options) => {
    if (permission !== 'granted') {
      setError('Notification permission not granted');
      return false;
    }
    return pushNotifications.showLocalNotification(title, options);
  }, [permission]);

  // Game-specific notification helpers
  const notifyTagged = useCallback((taggerName, gameId) => {
    return pushNotifications.notifyTagged(taggerName, gameId);
  }, []);

  const notifyGameStart = useCallback((gameName, gameId) => {
    return pushNotifications.notifyGameStart(gameName, gameId);
  }, []);

  const notifyItNearby = useCallback((distance, gameId) => {
    return pushNotifications.notifyItNearby(distance, gameId);
  }, []);

  return {
    // State
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,

    // Computed
    canSubscribe: isSupported && permission !== 'denied',
    isPending: permission === 'default',
    isDenied: permission === 'denied',
    isGranted: permission === 'granted',

    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
    toggle,
    showNotification,

    // Game helpers
    notifyTagged,
    notifyGameStart,
    notifyItNearby,
  };
}

export default usePushNotifications;
