import React, { useEffect, useState } from 'react';
import { Zap, TrendingUp, Activity } from 'lucide-react';
import { momentumService } from '../services/momentumService';

/**
 * MomentumMeter Component
 *
 * Shows player's current momentum level and tier.
 * Higher momentum = harder to track, encourages movement.
 */
export default function MomentumMeter({ playerId, location, compact = false }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!playerId) return;

    // Initialize player if needed
    if (!momentumService.playerMomentum.has(playerId)) {
      momentumService.initPlayer(playerId, location);
    }

    // Update on location change
    if (location) {
      const newStatus = momentumService.updateLocation(playerId, location);
      setStatus(newStatus);
    }

    // Subscribe to changes
    const handleChange = (data) => {
      if (data.playerId === playerId) {
        setStatus(momentumService.getMomentumStatus(playerId));
      }
    };

    momentumService.on('momentumChanged', handleChange);
    momentumService.on('tierChanged', handleChange);

    return () => {
      momentumService.off('momentumChanged', handleChange);
      momentumService.off('tierChanged', handleChange);
    };
  }, [playerId, location]);

  if (!status) return null;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${status.tierColor}20`, color: status.tierColor }}
      >
        <span>{status.tierIcon}</span>
        <span>{status.momentum}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/90 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 uppercase">Momentum</span>
        </div>
        {status.isOnStreak && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <TrendingUp className="w-3 h-3" />
            <span>Streak!</span>
          </div>
        )}
      </div>

      {/* Main meter */}
      <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
        {/* Tier sections */}
        <div className="absolute inset-0 flex">
          {momentumService.config.tiers.map((tier, index) => (
            <div
              key={tier.name}
              className="h-full opacity-20"
              style={{
                width: `${((tier.maxMomentum - tier.minMomentum) / 100) * 100}%`,
                backgroundColor: tier.color,
              }}
            />
          ))}
        </div>

        {/* Current progress */}
        <div
          className="absolute h-full transition-all duration-500 ease-out"
          style={{
            width: `${status.momentum}%`,
            backgroundColor: status.tierColor,
          }}
        />

        {/* Glow effect at current position */}
        <div
          className="absolute h-full w-2 blur-sm transition-all duration-500"
          style={{
            left: `${Math.max(0, status.momentum - 1)}%`,
            backgroundColor: status.tierColor,
          }}
        />
      </div>

      {/* Tier info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.tierIcon}</span>
          <div>
            <div className="text-sm font-medium" style={{ color: status.tierColor }}>
              {status.tierName}
            </div>
            <div className="text-xs text-gray-500">
              {status.gpsMultiplier < 1
                ? `${Math.round((1 - status.gpsMultiplier) * 100)}% harder to track`
                : status.gpsMultiplier > 1
                  ? `${Math.round((status.gpsMultiplier - 1) * 100)}% easier to track`
                  : 'Normal tracking'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: status.tierColor }}>
            {status.momentum}
          </div>
          <div className="text-xs text-gray-500">{status.percentToNextTier}% to next</div>
        </div>
      </div>

      {/* Speed indicator */}
      {status.currentSpeed > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Speed</span>
            <span>
              {(status.currentSpeed * 3.6).toFixed(1)} km/h
              {status.currentSpeed > 2 && <span className="ml-1 text-green-400">(Running)</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MomentumTierBadge - Compact badge showing current tier
 */
export function MomentumTierBadge({ playerId }) {
  const [tier, setTier] = useState(null);

  useEffect(() => {
    const status = momentumService.getMomentumStatus(playerId);
    if (status) {
      setTier(status);
    }
  }, [playerId]);

  if (!tier) return null;

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${tier.tierColor}20`, color: tier.tierColor }}
    >
      <span>{tier.tierIcon}</span>
      <span>{tier.tierName}</span>
    </div>
  );
}
