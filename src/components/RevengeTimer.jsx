import React, { useState, useEffect, useCallback } from 'react';
import { Swords, Clock, Target, Shield } from 'lucide-react';

/**
 * RevengeTimer Component
 *
 * Dramatic countdown showing when you can tag back your tagger.
 * Creates tension for new IT knowing their victim is hunting them.
 */
export default function RevengeTimer({
  isActive = false,
  endTime = null,
  taggerName = 'Unknown',
  taggerId = null,
  onRevengeReady,
}) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    if (!isActive || !endTime) {
      setTimeRemaining(0);
      setIsReady(false);
      setProgress(0);
      return;
    }

    // Calculate total duration on mount
    const total = endTime - Date.now();
    if (total > 0) {
      setTotalDuration(total);
    }

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeRemaining(remaining);

      // Calculate progress (0-100)
      if (totalDuration > 0) {
        setProgress(Math.min(100, ((totalDuration - remaining) / totalDuration) * 100));
      }

      if (remaining <= 0 && !isReady) {
        setIsReady(true);
        onRevengeReady?.(taggerId);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [isActive, endTime, taggerId, totalDuration, isReady, onRevengeReady]);

  // Format time for display
  const formatTime = useCallback((ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  }, []);

  // Get urgency level for styling
  const getUrgencyLevel = useCallback((remaining) => {
    const seconds = remaining / 1000;
    if (seconds <= 10) return 'critical';
    if (seconds <= 30) return 'high';
    if (seconds <= 60) return 'medium';
    return 'low';
  }, []);

  if (!isActive) return null;

  const urgency = getUrgencyLevel(timeRemaining);

  // Revenge is ready!
  if (isReady) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-xl p-4 shadow-lg animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg">REVENGE UNLOCKED!</div>
              <div className="text-white/80 text-sm">You can now tag {taggerName}</div>
            </div>
          </div>
          <Target className="w-8 h-8 text-white animate-bounce" />
        </div>
      </div>
    );
  }

  // Countdown display
  return (
    <div
      className={`
        rounded-xl p-4 shadow-lg transition-all duration-300
        ${
          urgency === 'critical'
            ? 'bg-gradient-to-r from-red-900 to-red-700 animate-pulse'
            : urgency === 'high'
              ? 'bg-gradient-to-r from-orange-900 to-orange-700'
              : urgency === 'medium'
                ? 'bg-gradient-to-r from-amber-900 to-amber-700'
                : 'bg-gradient-to-r from-gray-800 to-gray-700'
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`
            w-14 h-14 rounded-full flex items-center justify-center
            ${urgency === 'critical' ? 'bg-red-500/30 animate-ping-slow' : 'bg-white/10'}
          `}
        >
          <Shield
            className={`w-7 h-7 ${urgency === 'critical' ? 'text-red-300' : 'text-gray-300'}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-xs uppercase tracking-wide">
              Revenge Cooldown
            </span>
          </div>
          <div className="text-white/70 text-sm">
            Protected from <span className="font-semibold text-white">{taggerName}</span>
          </div>
        </div>

        {/* Timer */}
        <div className="text-right">
          <div
            className={`
              font-mono font-bold tabular-nums
              ${
                urgency === 'critical'
                  ? 'text-4xl text-red-300 animate-pulse'
                  : urgency === 'high'
                    ? 'text-3xl text-orange-300'
                    : 'text-2xl text-white'
              }
            `}
          >
            {formatTime(timeRemaining)}
          </div>
          <div className="text-xs text-gray-400">until revenge</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
        <div
          className={`
            h-full transition-all duration-100 ease-linear
            ${
              urgency === 'critical'
                ? 'bg-red-500'
                : urgency === 'high'
                  ? 'bg-orange-500'
                  : urgency === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-gray-500'
            }
          `}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Urgency indicator */}
      {urgency === 'critical' && (
        <div className="mt-2 text-center">
          <span className="text-red-300 text-sm font-medium animate-pulse">
            Almost ready...
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * RevengeTimerCompact - Minimal version for HUD
 */
export function RevengeTimerCompact({ isActive, endTime, taggerName }) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!isActive || !endTime) return;

    const update = () => {
      setTimeRemaining(Math.max(0, endTime - Date.now()));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isActive, endTime]);

  if (!isActive || timeRemaining <= 0) return null;

  const seconds = Math.ceil(timeRemaining / 1000);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/90 rounded-full">
      <Shield className="w-4 h-4 text-amber-400" />
      <span className="text-xs text-gray-300">
        <span className="font-mono font-bold text-amber-400">{seconds}s</span>
        {' '}vs {taggerName}
      </span>
    </div>
  );
}
