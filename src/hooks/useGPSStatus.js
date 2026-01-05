/**
 * GPS Status Hook with Signal Loss Handling
 * Phase 1: Handle GPS signal loss with warning banner and last known location
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';

// GPS status states
export const GPSState = {
  ACQUIRING: 'acquiring',
  ACTIVE: 'active',
  WEAK: 'weak',
  LOST: 'lost',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
};

// Accuracy thresholds
const ACCURACY_THRESHOLDS = {
  EXCELLENT: 10, // meters
  GOOD: 20,
  FAIR: 50,
  POOR: 100,
  UNUSABLE: 500,
};

/**
 * Hook to monitor GPS status and handle signal loss
 */
export function useGPSStatus(options = {}) {
  const {
    onSignalLost = null,
    onSignalRestored = null,
    onPermissionDenied = null,
    minAccuracy = 50, // Minimum acceptable accuracy (meters)
    signalLostTimeout = 30000, // Time without update to consider signal lost (30s)
    enableHighAccuracy = true,
    maximumAge = 10000,
    timeout = 15000,
  } = options;

  const { updateUserLocation } = useStore();

  const [gpsState, setGpsState] = useState(GPSState.ACQUIRING);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastKnownLocation, setLastKnownLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');

  const watchIdRef = useRef(null);
  const signalLostTimerRef = useRef(null);

  // Calculate accuracy level
  const getAccuracyLevel = useCallback((acc) => {
    if (acc <= ACCURACY_THRESHOLDS.EXCELLENT) return 'excellent';
    if (acc <= ACCURACY_THRESHOLDS.GOOD) return 'good';
    if (acc <= ACCURACY_THRESHOLDS.FAIR) return 'fair';
    if (acc <= ACCURACY_THRESHOLDS.POOR) return 'poor';
    return 'unusable';
  }, []);

  // Handle successful position update
  const handlePositionSuccess = useCallback((position) => {
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };

    setCurrentLocation(location);
    setLastKnownLocation(location);
    setAccuracy(position.coords.accuracy);
    setLastUpdateTime(Date.now());
    setError(null);

    // Update store
    updateUserLocation({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
    });

    // Determine GPS state based on accuracy
    if (position.coords.accuracy > minAccuracy) {
      setGpsState(GPSState.WEAK);
    } else {
      if (gpsState === GPSState.LOST || gpsState === GPSState.ACQUIRING) {
        onSignalRestored?.(location);
      }
      setGpsState(GPSState.ACTIVE);
    }

    // Reset signal lost timer
    if (signalLostTimerRef.current) {
      clearTimeout(signalLostTimerRef.current);
    }
    signalLostTimerRef.current = setTimeout(() => {
      setGpsState(GPSState.LOST);
      onSignalLost?.(lastKnownLocation);
    }, signalLostTimeout);
  }, [gpsState, minAccuracy, signalLostTimeout, updateUserLocation, onSignalLost, onSignalRestored, lastKnownLocation]);

  // Handle position error
  const handlePositionError = useCallback((error) => {
    setError({
      code: error.code,
      message: error.message,
    });

    switch (error.code) {
      case error.PERMISSION_DENIED:
        setGpsState(GPSState.DENIED);
        setPermissionStatus('denied');
        onPermissionDenied?.();
        break;
      case error.POSITION_UNAVAILABLE:
        setGpsState(GPSState.UNAVAILABLE);
        break;
      case error.TIMEOUT:
        // Keep trying, but mark as weak
        if (gpsState !== GPSState.LOST) {
          setGpsState(GPSState.WEAK);
        }
        break;
    }
  }, [gpsState, onPermissionDenied]);

  // Check permission status
  const checkPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(result.state);

        result.addEventListener('change', () => {
          setPermissionStatus(result.state);
          if (result.state === 'denied') {
            setGpsState(GPSState.DENIED);
            onPermissionDenied?.();
          }
        });
      } catch (e) {
        // Permissions API not supported for geolocation
      }
    }
  }, [onPermissionDenied]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setGpsState(GPSState.UNAVAILABLE);
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPermissionStatus('granted');
          handlePositionSuccess(position);
          resolve(true);
        },
        (error) => {
          handlePositionError(error);
          resolve(false);
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, handlePositionSuccess, handlePositionError]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsState(GPSState.UNAVAILABLE);
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy,
        maximumAge,
        timeout,
      }
    );
  }, [enableHighAccuracy, maximumAge, timeout, handlePositionSuccess, handlePositionError]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (signalLostTimerRef.current) {
      clearTimeout(signalLostTimerRef.current);
      signalLostTimerRef.current = null;
    }
  }, []);

  // Get a single position update
  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not available'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePositionSuccess(position);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          handlePositionError(error);
          reject(error);
        },
        { enableHighAccuracy, maximumAge, timeout }
      );
    });
  }, [enableHighAccuracy, maximumAge, timeout, handlePositionSuccess, handlePositionError]);

  // Initialize on mount
  useEffect(() => {
    checkPermission();
    startWatching();

    return () => {
      stopWatching();
    };
  }, [checkPermission, startWatching, stopWatching]);

  return {
    gpsState,
    currentLocation,
    lastKnownLocation,
    accuracy,
    accuracyLevel: accuracy ? getAccuracyLevel(accuracy) : null,
    lastUpdateTime,
    error,
    permissionStatus,
    isActive: gpsState === GPSState.ACTIVE,
    isWeak: gpsState === GPSState.WEAK,
    isLost: gpsState === GPSState.LOST,
    isDenied: gpsState === GPSState.DENIED,
    requestPermission,
    startWatching,
    stopWatching,
    getCurrentPosition,
  };
}

export default useGPSStatus;
