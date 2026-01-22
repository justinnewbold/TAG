import React, { useEffect, useState, useCallback } from 'react';
import { Heart, AlertTriangle } from 'lucide-react';
import { heartbeatService } from '../services/heartbeatService';
import { useStore } from '../store';

/**
 * HeartbeatIndicator Component
 *
 * Visual indicator of proximity danger level.
 * Pulses in sync with haptic feedback.
 */
export default function HeartbeatIndicator({ distance, isIt, enabled = true }) {
  const [currentLevel, setCurrentLevel] = useState(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const settings = useStore((state) => state.settings);

  // Update heartbeat service when distance changes
  useEffect(() => {
    if (!enabled || isIt) {
      heartbeatService.deactivate();
      setCurrentLevel(null);
      return;
    }

    heartbeatService.activate();
    heartbeatService.setEnabled(settings.vibration);
    heartbeatService.updateDistance(distance, {
      playSound: settings.sound,
      vibrate: settings.vibration,
    });

    const level = heartbeatService.getCurrentLevel();
    setCurrentLevel(level);

    return () => {
      heartbeatService.deactivate();
    };
  }, [distance, isIt, enabled, settings.vibration, settings.sound]);

  // Pulse animation sync
  useEffect(() => {
    if (!currentLevel) return;

    const interval = heartbeatService.thresholds.find(
      (t) => t.level === currentLevel.level
    )?.interval;

    if (!interval) return;

    const pulseInterval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 200);
    }, interval);

    return () => clearInterval(pulseInterval);
  }, [currentLevel?.level]);

  if (!currentLevel || isIt) return null;

  const getLevelColor = (level) => {
    switch (level) {
      case 'critical':
        return 'text-red-500 bg-red-500/20';
      case 'danger':
        return 'text-orange-500 bg-orange-500/20';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/20';
      case 'alert':
        return 'text-blue-500 bg-blue-500/20';
      case 'aware':
        return 'text-gray-400 bg-gray-500/20';
      default:
        return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getLevelText = (level) => {
    switch (level) {
      case 'critical':
        return 'DANGER!';
      case 'danger':
        return 'Very Close';
      case 'warning':
        return 'Nearby';
      case 'alert':
        return 'In Area';
      case 'aware':
        return 'Detected';
      default:
        return '';
    }
  };

  const colorClass = getLevelColor(currentLevel.level);

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        ${colorClass}
        transition-all duration-200
        ${isPulsing ? 'scale-110' : 'scale-100'}
      `}
    >
      <div className="relative">
        <Heart
          className={`w-6 h-6 ${isPulsing ? 'animate-ping' : ''}`}
          fill={currentLevel.level === 'critical' ? 'currentColor' : 'none'}
        />
        {currentLevel.level === 'critical' && (
          <AlertTriangle className="w-3 h-3 absolute -top-1 -right-1" />
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase">
          {getLevelText(currentLevel.level)}
        </span>
        <span className="text-xs opacity-75">
          IT is ~{Math.round(distance)}m away
        </span>
      </div>

      {/* Intensity bar */}
      <div className="w-16 h-2 bg-black/20 rounded-full overflow-hidden ml-2">
        <div
          className={`h-full transition-all duration-300 ${
            currentLevel.level === 'critical'
              ? 'bg-red-500'
              : currentLevel.level === 'danger'
                ? 'bg-orange-500'
                : 'bg-current'
          }`}
          style={{ width: `${currentLevel.intensity}%` }}
        />
      </div>
    </div>
  );
}
