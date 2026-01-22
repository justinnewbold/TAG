import React, { useEffect, useState, useRef } from 'react';
import { Target, Crosshair, Zap, Clock } from 'lucide-react';
import { showdownService } from '../services/showdownService';
import { useStore } from '../store';

/**
 * ShowdownOverlay Component
 *
 * Dramatic UI overlay when IT is within striking distance.
 * Creates cinematic tension for the final chase.
 */
export default function ShowdownOverlay({ onShowdownStart, onShowdownEnd }) {
  const user = useStore((state) => state.user);
  const [showdown, setShowdown] = useState(null);
  const [pulse, setPulse] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleStart = (data) => {
      setShowdown({
        ...data,
        isIt: data.itPlayerId === user?.id,
      });
      onShowdownStart?.(data);
    };

    const handleUpdate = (data) => {
      setShowdown((prev) =>
        prev
          ? {
              ...prev,
              ...data,
              isIt: data.itPlayerId === user?.id,
            }
          : null
      );
    };

    const handlePulse = () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 200);
    };

    const handleEnd = (data) => {
      setShowdown(null);
      onShowdownEnd?.(data);
    };

    showdownService.on('showdownStarted', handleStart);
    showdownService.on('showdownUpdate', handleUpdate);
    showdownService.on('showdownPulse', handlePulse);
    showdownService.on('showdownEnded', handleEnd);

    return () => {
      showdownService.off('showdownStarted', handleStart);
      showdownService.off('showdownUpdate', handleUpdate);
      showdownService.off('showdownPulse', handlePulse);
      showdownService.off('showdownEnded', handleEnd);
    };
  }, [user?.id, onShowdownStart, onShowdownEnd]);

  if (!showdown) return null;

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getIntensityColor = (intensity) => {
    if (intensity >= 80) return 'from-red-600 to-red-900';
    if (intensity >= 60) return 'from-orange-600 to-red-800';
    if (intensity >= 40) return 'from-amber-600 to-orange-800';
    return 'from-yellow-600 to-amber-800';
  };

  return (
    <>
      {/* Screen border pulse effect */}
      <div
        ref={overlayRef}
        className={`
          fixed inset-0 pointer-events-none z-40
          transition-all duration-200
          ${pulse ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div
          className={`
            absolute inset-0 border-8
            ${showdown.isIt ? 'border-green-500' : 'border-red-500'}
            animate-pulse
          `}
        />
      </div>

      {/* Vignette effect based on intensity */}
      <div
        className="fixed inset-0 pointer-events-none z-30"
        style={{
          background: `radial-gradient(circle at center, transparent 30%, rgba(${
            showdown.isIt ? '34, 197, 94' : '239, 68, 68'
          }, ${showdown.intensity / 400}) 100%)`,
        }}
      />

      {/* Top banner */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-50
          bg-gradient-to-b ${getIntensityColor(showdown.intensity)}
          text-white py-3 px-4
          transform transition-transform duration-300
          ${pulse ? 'scale-y-110' : 'scale-y-100'}
        `}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Left: Status */}
          <div className="flex items-center gap-2">
            {showdown.isIt ? (
              <Crosshair className="w-6 h-6 animate-pulse" />
            ) : (
              <Target className="w-6 h-6 animate-pulse" />
            )}
            <div>
              <div className="text-xs uppercase opacity-75">
                {showdown.isIt ? 'Target Acquired' : 'Danger Zone'}
              </div>
              <div className="font-bold text-lg tracking-wide">
                SHOWDOWN
              </div>
            </div>
          </div>

          {/* Center: Distance */}
          <div className="text-center">
            <div className="text-3xl font-black tabular-nums">
              {Math.round(showdown.distance)}m
            </div>
            <div className="text-xs opacity-75">distance</div>
          </div>

          {/* Right: Timer */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 opacity-75" />
            <div className="text-right">
              <div className="font-mono text-lg">
                {formatDuration(Date.now() - showdown.startedAt)}
              </div>
              <div className="text-xs opacity-75">duration</div>
            </div>
          </div>
        </div>

        {/* Intensity bar */}
        <div className="mt-2 h-1 bg-black/30 rounded-full overflow-hidden max-w-lg mx-auto">
          <div
            className={`
              h-full bg-white/80 transition-all duration-300
              ${pulse ? 'opacity-100' : 'opacity-70'}
            `}
            style={{ width: `${showdown.intensity}%` }}
          />
        </div>
      </div>

      {/* Bottom action hint */}
      <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div
          className={`
            px-4 py-2 rounded-full
            ${showdown.isIt ? 'bg-green-500/90' : 'bg-red-500/90'}
            text-white text-sm font-medium
            animate-bounce
          `}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {showdown.isIt ? (
              <span>Close in for the tag!</span>
            ) : (
              <span>Run! IT is closing in!</span>
            )}
          </div>
        </div>
      </div>

      {/* Corner indicators */}
      <div className="fixed top-16 left-4 z-50">
        <div className={`p-2 rounded-lg ${showdown.isIt ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <div className="text-xs text-gray-300">Real-time tracking</div>
          <div className="text-xs text-gray-500">GPS: 2s intervals</div>
        </div>
      </div>
    </>
  );
}

/**
 * ShowdownMiniIndicator - Compact indicator for the map
 */
export function ShowdownMiniIndicator({ isActive, intensity, isIt }) {
  if (!isActive) return null;

  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold
        ${isIt ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
        animate-pulse
      `}
    >
      {isIt ? <Crosshair className="w-3 h-3" /> : <Target className="w-3 h-3" />}
      <span>SHOWDOWN</span>
      <span className="opacity-75">{intensity}%</span>
    </div>
  );
}
