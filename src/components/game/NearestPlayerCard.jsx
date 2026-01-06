import React, { memo } from 'react';
import { isInNoTagZone } from '../../store';

/**
 * NearestPlayerCard - Shows info about the nearest taggable player
 * Displays player avatar, name, distance, and tag status
 */
const NearestPlayerCard = memo(function NearestPlayerCard({
  gameMode,
  isIt,
  nearestPlayer,
  nearestDistance,
  inTagRange,
  tagCheck,
  noTagZones,
}) {
  if (!nearestPlayer) return null;

  // Check if this is the freeze tag unfreeze scenario
  const isUnfreezeMode = gameMode === 'freezeTag' && !isIt && nearestPlayer?.isFrozen;

  // For IT players or team tag
  if (isIt || isUnfreezeMode) {
    const playerInZone = isInNoTagZone(nearestPlayer.location, noTagZones);

    return (
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className={`card p-3 flex items-center justify-between ${
          isUnfreezeMode ? 'bg-blue-500/20 border-blue-500/30' : ''
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {nearestPlayer.isFrozen ? '🧊' :
               nearestPlayer.team === 'red' ? '🔴' :
               nearestPlayer.team === 'blue' ? '🔵' :
               nearestPlayer.avatar || '🏃'}
            </span>
            <div>
              <p className="font-medium text-sm">{nearestPlayer.name}</p>
              <p className="text-xs text-white/50">
                {playerInZone ? '🛡️ In Safe Zone' :
                 isUnfreezeMode ? '🧊 Touch to unfreeze!' :
                 gameMode === 'teamTag' ? `Team ${nearestPlayer.team}` :
                 'Nearest target'}
              </p>
            </div>
          </div>
          <div className={`text-right ${inTagRange && tagCheck.allowed ? 'text-neon-orange' : isUnfreezeMode ? 'text-blue-400' : ''}`}>
            <p className="font-bold">
              {nearestDistance < 1000
                ? `${Math.round(nearestDistance)}m`
                : `${(nearestDistance / 1000).toFixed(1)}km`}
            </p>
            {inTagRange && tagCheck.allowed && (
              <p className="text-xs text-neon-orange animate-pulse">In range!</p>
            )}
            {inTagRange && !tagCheck.allowed && (
              <p className="text-xs text-yellow-400">Protected</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
});

export default NearestPlayerCard;
