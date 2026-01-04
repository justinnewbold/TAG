/**
 * Network Status Hook with Offline Detection
 * Phase 1: Implements offline detection with NetInfo
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Network status states
export const NetworkState = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SLOW: 'slow',
  UNKNOWN: 'unknown',
};

/**
 * Hook to detect and monitor network status
 */
export function useNetworkStatus(options = {}) {
  const {
    pingUrl = '/api/health', // Endpoint to ping for connection check
    pingInterval = 30000, // How often to verify connection (30s)
    slowThreshold = 2000, // Response time considered "slow" (2s)
    onOnline = null,
    onOffline = null,
    onSlowConnection = null,
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkState, setNetworkState] = useState(
    navigator.onLine ? NetworkState.ONLINE : NetworkState.OFFLINE
  );
  const [connectionSpeed, setConnectionSpeed] = useState(null);
  const [lastOnlineTime, setLastOnlineTime] = useState(
    navigator.onLine ? Date.now() : null
  );
  const [offlineDuration, setOfflineDuration] = useState(0);

  const pingIntervalRef = useRef(null);
  const offlineTimerRef = useRef(null);

  // Ping server to verify connection
  const checkConnection = useCallback(async () => {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseTime = Date.now() - startTime;
        setConnectionSpeed(responseTime);

        if (responseTime > slowThreshold) {
          setNetworkState(NetworkState.SLOW);
          onSlowConnection?.(responseTime);
        } else {
          setNetworkState(NetworkState.ONLINE);
        }

        if (!isOnline) {
          setIsOnline(true);
          setLastOnlineTime(Date.now());
          onOnline?.();
        }

        return true;
      }
    } catch (error) {
      // Connection failed
      if (isOnline) {
        setIsOnline(false);
        setNetworkState(NetworkState.OFFLINE);
        onOffline?.();
      }
    }

    return false;
  }, [pingUrl, slowThreshold, isOnline, onOnline, onOffline, onSlowConnection]);

  // Handle browser online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineTime(Date.now());
    setNetworkState(NetworkState.ONLINE);

    // Clear offline timer
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }

    // Verify connection is actually working
    checkConnection();
    onOnline?.();
  }, [checkConnection, onOnline]);

  // Handle browser offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setNetworkState(NetworkState.OFFLINE);

    // Start tracking offline duration
    const offlineStart = Date.now();
    offlineTimerRef.current = setInterval(() => {
      setOfflineDuration(Date.now() - offlineStart);
    }, 1000);

    onOffline?.();
  }, [onOffline]);

  // Set up event listeners and ping interval
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkConnection();

    // Set up periodic connection check
    pingIntervalRef.current = setInterval(checkConnection, pingInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
      }
    };
  }, [handleOnline, handleOffline, checkConnection, pingInterval]);

  // Get connection type from Network Information API if available
  const getConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        type: conn.type,
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      };
    }
    return null;
  }, []);

  // Force a connection check
  const forceCheck = useCallback(() => {
    return checkConnection();
  }, [checkConnection]);

  return {
    isOnline,
    networkState,
    connectionSpeed,
    lastOnlineTime,
    offlineDuration,
    connectionInfo: getConnectionInfo(),
    forceCheck,
  };
}

/**
 * Simple hook that just returns online status
 */
export function useOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useNetworkStatus;
