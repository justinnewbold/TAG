import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Shield,
  AlertTriangle,
  Navigation,
  Zap,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store';
import { getDistance } from '../../shared/utils';

/**
 * QuickGlanceWidget Component
 *
 * Minimal widget showing essential game info at a glance.
 * Can be used as home screen widget or lock screen info.
 * Shows distance to threat, status, and one-tap panic button.
 */
export default function QuickGlanceWidget({
  itLocation,
  isIt,
  gameActive = false,
  onPanicPress,
  compact = false,
}) {
  const user = useStore((state) => state.user);
  const currentGame = useStore((state) => state.currentGame);
  const [distanceToIT, setDistanceToIT] = useState(null);
  const [dangerLevel, setDangerLevel] = useState('safe');
  const [direction, setDirection] = useState(null);

  // Calculate distance and danger level
  useEffect(() => {
    if (!user?.location || !itLocation || isIt) {
      setDistanceToIT(null);
      setDangerLevel('safe');
      return;
    }

    const distance = getDistance(
      user.location.lat,
      user.location.lng,
      itLocation.lat,
      itLocation.lng
    );

    setDistanceToIT(distance);

    // Calculate direction
    const bearing = calculateBearing(
      user.location.lat,
      user.location.lng,
      itLocation.lat,
      itLocation.lng
    );
    setDirection(bearingToDirection(bearing));

    // Set danger level
    if (distance < 50) {
      setDangerLevel('critical');
    } else if (distance < 100) {
      setDangerLevel('high');
    } else if (distance < 200) {
      setDangerLevel('medium');
    } else if (distance < 500) {
      setDangerLevel('low');
    } else {
      setDangerLevel('safe');
    }
  }, [user?.location, itLocation, isIt]);

  // Calculate bearing between two points
  const calculateBearing = (lat1, lng1, lat2, lng2) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  // Convert bearing to cardinal direction
  const bearingToDirection = (bearing) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  // Format distance for display
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Get status color and styling
  const getStatusStyles = () => {
    if (isIt) {
      return {
        bg: 'bg-gradient-to-r from-green-600 to-emerald-500',
        text: 'text-white',
        icon: Target,
        label: 'YOU ARE IT',
        sublabel: 'Find and tag someone!',
      };
    }

    switch (dangerLevel) {
      case 'critical':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-red-500',
          text: 'text-white',
          icon: AlertTriangle,
          label: 'DANGER!',
          sublabel: 'IT is very close',
          animate: 'animate-pulse',
        };
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-orange-600 to-orange-500',
          text: 'text-white',
          icon: AlertTriangle,
          label: 'WARNING',
          sublabel: 'IT is nearby',
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-amber-600 to-amber-500',
          text: 'text-white',
          icon: Navigation,
          label: 'ALERT',
          sublabel: 'IT in your area',
        };
      case 'low':
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-blue-500',
          text: 'text-white',
          icon: Shield,
          label: 'CAUTION',
          sublabel: 'IT detected',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-700 to-gray-600',
          text: 'text-white',
          icon: Shield,
          label: 'SAFE',
          sublabel: 'No immediate threat',
        };
    }
  };

  const status = getStatusStyles();
  const StatusIcon = status.icon;

  if (!gameActive) {
    return (
      <div className="bg-gray-800/90 rounded-xl p-4">
        <div className="text-center text-gray-500">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active game</p>
        </div>
      </div>
    );
  }

  // Compact version for minimal display
  if (compact) {
    return (
      <div
        className={`
          ${status.bg} rounded-lg px-3 py-2
          flex items-center gap-3
          ${status.animate || ''}
        `}
      >
        <StatusIcon className="w-5 h-5 text-white" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white/90">{status.label}</div>
          {distanceToIT && (
            <div className="text-sm font-mono font-bold text-white">
              {formatDistance(distanceToIT)} {direction}
            </div>
          )}
        </div>
        {!isIt && distanceToIT && distanceToIT < 200 && (
          <button
            onClick={onPanicPress}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2"
          >
            <Zap className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    );
  }

  // Full widget
  return (
    <div className={`rounded-xl overflow-hidden shadow-lg ${status.animate || ''}`}>
      {/* Main status area */}
      <div className={`${status.bg} ${status.text} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-wide">{status.label}</div>
              <div className="text-sm opacity-80">{status.sublabel}</div>
            </div>
          </div>

          {/* Quick action */}
          {!isIt && onPanicPress && (
            <button
              onClick={onPanicPress}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
            >
              <Zap className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Distance display (for non-IT) */}
        {!isIt && distanceToIT && (
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-4xl font-black font-mono tabular-nums">
                {formatDistance(distanceToIT)}
              </div>
              <div className="text-sm opacity-75">to IT</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-2xl">
                <Navigation
                  className="w-5 h-5"
                  style={{
                    transform: `rotate(${calculateBearing(
                      user?.location?.lat || 0,
                      user?.location?.lng || 0,
                      itLocation?.lat || 0,
                      itLocation?.lng || 0
                    )}deg)`,
                  }}
                />
                <span className="font-bold">{direction}</span>
              </div>
              <div className="text-sm opacity-75">direction</div>
            </div>
          </div>
        )}

        {/* IT view - closest player */}
        {isIt && currentGame?.players && (
          <div className="mt-4">
            <div className="text-sm opacity-75 mb-2">Nearest target</div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <span className="text-lg font-bold">
                Tracking {currentGame.players.filter((p) => !p.isIt).length} players
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-3 h-3" />
          <span>
            {currentGame?.startedAt
              ? `${Math.floor((Date.now() - currentGame.startedAt) / 60000)}m`
              : 'Starting...'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="w-3 h-3" />
          <span>
            {currentGame?.players?.length || 0} players
          </span>
        </div>

        <div className="flex items-center gap-1 text-gray-500">
          <span>Details</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

/**
 * QuickGlanceMini - Ultra-compact for notification bar
 */
export function QuickGlanceMini({ distanceToIT, isIt, dangerLevel }) {
  if (isIt) {
    return (
      <span className="text-green-400 font-bold">IT</span>
    );
  }

  const getColor = () => {
    switch (dangerLevel) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-amber-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <span className={`font-mono ${getColor()}`}>
      {distanceToIT ? `${Math.round(distanceToIT)}m` : '---'}
    </span>
  );
}

/**
 * QuickGlanceNotification - For push notification content
 */
export function getQuickGlanceNotificationContent(distanceToIT, isIt, dangerLevel) {
  if (isIt) {
    return {
      title: 'TAG - You are IT',
      body: 'Find and tag someone!',
      icon: '🎯',
    };
  }

  switch (dangerLevel) {
    case 'critical':
      return {
        title: 'DANGER! IT is very close!',
        body: `${Math.round(distanceToIT)}m away - RUN!`,
        icon: '🚨',
        urgency: 'critical',
      };
    case 'high':
      return {
        title: 'Warning: IT nearby',
        body: `${Math.round(distanceToIT)}m away`,
        icon: '⚠️',
        urgency: 'high',
      };
    case 'medium':
      return {
        title: 'IT in your area',
        body: `${Math.round(distanceToIT)}m away`,
        icon: '👀',
        urgency: 'normal',
      };
    default:
      return null;
  }
}
