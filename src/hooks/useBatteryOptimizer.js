import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { batteryOptimizer } from '../services/batteryOptimizer';

/**
 * Hook to integrate battery optimizer with store settings
 * Syncs the battery mode setting and provides battery info
 */
export function useBatteryOptimizer() {
  const { settings, updateSettings, currentGame, updateUserLocation } = useStore();
  const [batteryInfo, setBatteryInfo] = useState(batteryOptimizer.getBatteryInfo());
  const [isTracking, setIsTracking] = useState(false);

  // Sync battery mode from store to optimizer
  useEffect(() => {
    if (settings.batteryMode) {
      batteryOptimizer.setMode(settings.batteryMode);
    }
  }, [settings.batteryMode]);

  // Monitor battery level changes
  useEffect(() => {
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();

          const updateBatteryInfo = () => {
            setBatteryInfo({
              level: battery.level,
              isCharging: battery.charging,
              percentage: Math.round(battery.level * 100),
            });
          };

          updateBatteryInfo();
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);

          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        } catch (e) {
          console.log('Battery API not available');
        }
      }
    };

    checkBattery();
  }, []);

  // Start location tracking
  const startTracking = useCallback(() => {
    const success = batteryOptimizer.startTracking((position) => {
      updateUserLocation({
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        timestamp: position.timestamp,
      });
    });

    setIsTracking(success);
    return success;
  }, [updateUserLocation]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    batteryOptimizer.stopTracking();
    setIsTracking(false);
  }, []);

  // Set battery mode
  const setMode = useCallback((mode) => {
    batteryOptimizer.setMode(mode);
    updateSettings({ batteryMode: mode });
  }, [updateSettings]);

  // Get recommended mode for current game
  const getRecommendedMode = useCallback(() => {
    if (currentGame?.settings) {
      return batteryOptimizer.getRecommendedMode(currentGame.settings);
    }
    return 'balanced';
  }, [currentGame]);

  // Apply recommended mode
  const applyRecommendedMode = useCallback(() => {
    const recommended = getRecommendedMode();
    setMode(recommended);
    return recommended;
  }, [getRecommendedMode, setMode]);

  // Estimate battery usage
  const estimateBatteryUsage = useCallback((durationMinutes) => {
    return batteryOptimizer.estimateBatteryUsage(settings.batteryMode, durationMinutes);
  }, [settings.batteryMode]);

  return {
    // Battery info
    batteryInfo,
    isTracking,
    currentMode: settings.batteryMode || 'balanced',
    modeConfig: batteryOptimizer.getModeConfig(),

    // Actions
    startTracking,
    stopTracking,
    setMode,

    // Recommendations
    getRecommendedMode,
    applyRecommendedMode,
    estimateBatteryUsage,
  };
}

export default useBatteryOptimizer;
