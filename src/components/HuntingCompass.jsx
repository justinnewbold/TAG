/**
 * Hunting Compass Component
 * Shows directional arrow pointing toward nearest target (for IT) or away from IT (for runners)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Compass, Navigation, AlertTriangle, Eye, EyeOff } from 'lucide-react';

// Calculate bearing between two points
function calculateBearing(from, to) {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

// Calculate distance between two points in meters
function calculateDistance(from, to) {
  const R = 6371000; // Earth radius in meters
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format distance for display
function formatDistance(meters) {
  if (meters < 100) {
    return `${Math.round(meters)}m`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 10) * 10}m`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)}km`;
  } else {
    return `${Math.round(meters / 1000)}km`;
  }
}

// Get urgency level based on distance
function getUrgencyLevel(distance, isIt) {
  if (isIt) {
    // IT player - closer is better
    if (distance < 20) return 'critical';
    if (distance < 50) return 'high';
    if (distance < 100) return 'medium';
    return 'low';
  } else {
    // Runner - closer is worse
    if (distance < 30) return 'critical';
    if (distance < 75) return 'high';
    if (distance < 150) return 'medium';
    return 'low';
  }
}

// Urgency colors
const URGENCY_COLORS = {
  critical: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-400',
    arrow: '#ef4444',
    pulse: true,
  },
  high: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500',
    text: 'text-orange-400',
    arrow: '#f97316',
    pulse: true,
  },
  medium: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    arrow: '#eab308',
    pulse: false,
  },
  low: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500',
    text: 'text-cyan-400',
    arrow: '#06b6d4',
    pulse: false,
  },
};

export default function HuntingCompass({
  myLocation,
  players,
  isIt,
  itPlayerId,
  tagRadius = 10,
  deviceHeading = 0,
  onTargetSelect,
  showMultipleTargets = false,
  className = '',
}) {
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastVibration, setLastVibration] = useState(0);

  // Find targets based on role
  const targets = useMemo(() => {
    if (!myLocation || !players || players.length === 0) return [];

    if (isIt) {
      // IT player: targets are all non-IT players with locations
      return players
        .filter(p => !p.isIt && p.location && p.id !== itPlayerId)
        .map(p => ({
          ...p,
          distance: calculateDistance(myLocation, p.location),
          bearing: calculateBearing(myLocation, p.location),
        }))
        .sort((a, b) => a.distance - b.distance);
    } else {
      // Runner: target is the IT player
      const itPlayer = players.find(p => p.isIt || p.id === itPlayerId);
      if (!itPlayer?.location) return [];

      return [{
        ...itPlayer,
        distance: calculateDistance(myLocation, itPlayer.location),
        bearing: calculateBearing(myLocation, itPlayer.location),
        isIt: true,
      }];
    }
  }, [myLocation, players, isIt, itPlayerId]);

  // Get primary target
  const primaryTarget = useMemo(() => {
    if (selectedTargetId) {
      return targets.find(t => t.id === selectedTargetId) || targets[0];
    }
    return targets[0];
  }, [targets, selectedTargetId]);

  // Calculate arrow rotation (relative to device heading)
  const arrowRotation = useMemo(() => {
    if (!primaryTarget) return 0;
    let rotation = primaryTarget.bearing - deviceHeading;

    // For runners, point AWAY from IT
    if (!isIt) {
      rotation += 180;
    }

    return rotation;
  }, [primaryTarget, deviceHeading, isIt]);

  // Get urgency level
  const urgency = useMemo(() => {
    if (!primaryTarget) return 'low';
    return getUrgencyLevel(primaryTarget.distance, isIt);
  }, [primaryTarget, isIt]);

  const urgencyStyle = URGENCY_COLORS[urgency];

  // Haptic feedback for proximity
  useEffect(() => {
    if (!primaryTarget || typeof navigator.vibrate !== 'function') return;

    const now = Date.now();
    const distance = primaryTarget.distance;

    // Vibration patterns based on distance (only for runners when IT is close)
    if (!isIt && distance < 100 && now - lastVibration > 2000) {
      if (distance < 30) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      } else if (distance < 50) {
        navigator.vibrate([100, 100, 100]);
      } else {
        navigator.vibrate([50, 100, 50]);
      }
      setLastVibration(now);
    }
  }, [primaryTarget, isIt, lastVibration]);

  // Handle target selection
  const handleTargetSelect = useCallback((targetId) => {
    setSelectedTargetId(targetId);
    onTargetSelect?.(targetId);
  }, [onTargetSelect]);

  if (!myLocation) {
    return (
      <div className={`bg-gray-800/80 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Waiting for GPS...</span>
        </div>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className={`bg-gray-800/80 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <Compass className="w-5 h-5" />
          <span>{isIt ? 'No targets in range' : 'IT location unknown'}</span>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`${urgencyStyle.bg} ${urgencyStyle.border} border rounded-full p-3 ${className} ${urgencyStyle.pulse ? 'animate-pulse' : ''}`}
      >
        <Navigation
          className="w-6 h-6"
          style={{
            color: urgencyStyle.arrow,
            transform: `rotate(${arrowRotation}deg)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
      </button>
    );
  }

  return (
    <div className={`${urgencyStyle.bg} ${urgencyStyle.border} border rounded-xl overflow-hidden ${className} ${urgencyStyle.pulse ? 'animate-pulse' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30">
        <div className="flex items-center gap-2">
          <Compass className={`w-4 h-4 ${urgencyStyle.text}`} />
          <span className="text-sm font-medium text-white">
            {isIt ? 'Hunt Mode' : 'Escape Mode'}
          </span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 hover:bg-white/10 rounded"
        >
          <EyeOff className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Main compass */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Arrow */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Compass ring */}
            <div className="absolute inset-0 rounded-full border-2 border-gray-600/50" />
            <div className="absolute inset-2 rounded-full border border-gray-700/50" />

            {/* Cardinal directions */}
            <span className="absolute top-1 text-xs text-gray-500">N</span>
            <span className="absolute bottom-1 text-xs text-gray-500">S</span>
            <span className="absolute left-1 text-xs text-gray-500">W</span>
            <span className="absolute right-1 text-xs text-gray-500">E</span>

            {/* Direction arrow */}
            <div
              className="transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${arrowRotation}deg)` }}
            >
              <svg width="48" height="48" viewBox="0 0 48 48">
                <path
                  d="M24 4 L32 40 L24 32 L16 40 Z"
                  fill={urgencyStyle.arrow}
                  stroke={urgencyStyle.arrow}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Tag radius indicator (for IT when close) */}
            {isIt && primaryTarget && primaryTarget.distance <= tagRadius * 2 && (
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed animate-ping"
                style={{
                  borderColor: primaryTarget.distance <= tagRadius ? '#22c55e' : '#eab308',
                  opacity: 0.5,
                }}
              />
            )}
          </div>

          {/* Target info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{primaryTarget.avatar || '👤'}</span>
              <div>
                <div className="font-medium text-white truncate max-w-[120px]">
                  {primaryTarget.name || 'Unknown'}
                </div>
                <div className={`text-xs ${urgencyStyle.text}`}>
                  {isIt ? 'Target' : 'IT Player'}
                </div>
              </div>
            </div>

            {/* Distance */}
            <div className={`text-3xl font-bold ${urgencyStyle.text}`}>
              {formatDistance(primaryTarget.distance)}
            </div>

            {/* Status message */}
            <div className="text-xs text-gray-400 mt-1">
              {isIt ? (
                primaryTarget.distance <= tagRadius ? (
                  <span className="text-green-400 font-medium">IN TAG RANGE!</span>
                ) : (
                  `${formatDistance(primaryTarget.distance - tagRadius)} to tag range`
                )
              ) : (
                urgency === 'critical' ? (
                  <span className="text-red-400 font-medium">RUN NOW!</span>
                ) : urgency === 'high' ? (
                  <span className="text-orange-400">IT is closing in!</span>
                ) : (
                  'Keep moving'
                )
              )}
            </div>
          </div>
        </div>

        {/* Multiple targets selector (for IT) */}
        {isIt && showMultipleTargets && targets.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="text-xs text-gray-400 mb-2">Other targets ({targets.length - 1})</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {targets.slice(0, 5).map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleTargetSelect(target.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap ${
                    selectedTargetId === target.id
                      ? 'bg-cyan-500/30 border border-cyan-500'
                      : 'bg-gray-700/50 border border-transparent hover:border-gray-600'
                  }`}
                >
                  <span>{target.avatar || '👤'}</span>
                  <span className="text-gray-300">{formatDistance(target.distance)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
