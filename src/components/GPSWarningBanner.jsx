/**
 * GPS Signal Warning Banner Component
 * Phase 1: Shows warning when GPS signal is lost
 */

import React, { memo } from 'react';
import { AlertTriangle, MapPin, RefreshCw, Settings } from 'lucide-react';
import { GPSState } from '../hooks/useGPSStatus';

/**
 * GPS Warning Banner - displays at top of screen when GPS issues detected
 */
function GPSWarningBanner({
  gpsState,
  lastKnownLocation,
  lastUpdateTime,
  accuracy,
  onRetry,
  onOpenSettings,
}) {
  if (gpsState === GPSState.ACTIVE) {
    return null;
  }

  const getTimeSinceUpdate = () => {
    if (!lastUpdateTime) return 'unknown';
    const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return 'long time ago';
  };

  const getBannerConfig = () => {
    switch (gpsState) {
      case GPSState.ACQUIRING:
        return {
          bgColor: 'bg-blue-500/90',
          icon: <RefreshCw className="w-5 h-5 animate-spin" />,
          title: 'Acquiring GPS Signal',
          message: 'Please wait while we find your location...',
          showRetry: false,
        };

      case GPSState.WEAK:
        return {
          bgColor: 'bg-yellow-500/90',
          icon: <AlertTriangle className="w-5 h-5" />,
          title: 'Weak GPS Signal',
          message: `Accuracy: ~${Math.round(accuracy || 0)}m. Move to open area for better signal.`,
          showRetry: true,
        };

      case GPSState.LOST:
        return {
          bgColor: 'bg-orange-500/90',
          icon: <MapPin className="w-5 h-5" />,
          title: 'GPS Signal Lost',
          message: lastKnownLocation
            ? `Using last known location (${getTimeSinceUpdate()})`
            : 'Unable to determine your location',
          showRetry: true,
        };

      case GPSState.DENIED:
        return {
          bgColor: 'bg-red-500/90',
          icon: <AlertTriangle className="w-5 h-5" />,
          title: 'Location Permission Denied',
          message: 'Please enable location access in your device settings.',
          showRetry: false,
          showSettings: true,
        };

      case GPSState.UNAVAILABLE:
        return {
          bgColor: 'bg-red-500/90',
          icon: <AlertTriangle className="w-5 h-5" />,
          title: 'GPS Unavailable',
          message: 'Your device does not support GPS or it is disabled.',
          showRetry: true,
          showSettings: true,
        };

      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <div
      className={`
        ${config.bgColor} backdrop-blur-sm
        px-4 py-3 flex items-center justify-between
        text-white shadow-lg
        animate-slideDown
      `}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <div>
          <div className="font-semibold text-sm">{config.title}</div>
          <div className="text-xs opacity-90">{config.message}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {config.showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {config.showSettings && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            title="Open Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Accuracy indicator for mini display
 */
export function GPSAccuracyIndicator({ accuracy, gpsState }) {
  if (!accuracy && gpsState === GPSState.ACTIVE) return null;

  const getColor = () => {
    if (gpsState === GPSState.LOST || gpsState === GPSState.DENIED) return 'text-red-400';
    if (gpsState === GPSState.WEAK || accuracy > 50) return 'text-yellow-400';
    if (accuracy > 20) return 'text-blue-400';
    return 'text-green-400';
  };

  const getLabel = () => {
    if (gpsState === GPSState.LOST) return 'Lost';
    if (gpsState === GPSState.DENIED) return 'Denied';
    if (gpsState === GPSState.ACQUIRING) return 'Acquiring...';
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 20) return 'Good';
    if (accuracy <= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${getColor()}`}>
      <MapPin className="w-3 h-3" />
      <span>{getLabel()}</span>
      {accuracy && gpsState === GPSState.ACTIVE && (
        <span className="opacity-75">(~{Math.round(accuracy)}m)</span>
      )}
    </div>
  );
}

export default memo(GPSWarningBanner);
