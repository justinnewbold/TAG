import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * TagButton - The main tag action button
 * Large, thumb-friendly button for tagging in the game
 */
const TagButton = memo(function TagButton({
  gameMode,
  isIt,
  isTagging,
  isHidingPhase,
  inTagRange,
  canTag,
  tagCheck,
  tagAnimation,
  nearestPlayer,
  nearestDistance,
  onTag,
}) {
  // Determine if this button should be shown
  const showButton = isIt ||
    (gameMode === 'teamTag' && nearestPlayer) ||
    (gameMode === 'freezeTag' && !isIt && nearestPlayer?.isFrozen);

  if (!showButton) return null;

  // Determine button styling based on state
  const getButtonClass = () => {
    if (isHidingPhase) {
      return 'bg-pink-500/50 text-pink-200';
    }
    if (canTag && !isTagging) {
      if (gameMode === 'freezeTag' && !isIt) {
        return 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg shadow-blue-400/50 animate-pulse active:scale-90';
      }
      if (gameMode === 'hotPotato') {
        return 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/50 animate-pulse active:scale-90';
      }
      return 'bg-gradient-to-br from-neon-orange to-red-500 shadow-lg shadow-neon-orange/50 animate-pulse active:scale-90';
    }
    if (inTagRange && !tagCheck.allowed) {
      return 'bg-yellow-500/50 text-yellow-200';
    }
    return 'bg-white/10 text-white/30';
  };

  // Determine button content
  const getButtonContent = () => {
    if (isTagging) {
      return <Loader2 className="w-8 h-8 animate-spin mx-auto" />;
    }
    if (isHidingPhase) {
      return '👀';
    }
    if (!inTagRange) {
      if (gameMode === 'freezeTag' && !isIt) return <span className="text-4xl">❄️</span>;
      if (gameMode === 'hotPotato') return <span className="text-4xl">🥔</span>;
      if (gameMode === 'infection') return <span className="text-4xl">🧟</span>;
      return <span className="text-4xl">🏃</span>;
    }
    if (!tagCheck.allowed) {
      return '🛡️';
    }
    // In range and allowed to tag
    if (gameMode === 'freezeTag' && !isIt) return <span className="text-xl">FREE!</span>;
    if (gameMode === 'freezeTag' && isIt) return <span className="text-xl">FREEZE!</span>;
    if (gameMode === 'hotPotato') return <span className="text-xl">PASS!</span>;
    if (gameMode === 'infection') return <span className="text-xl">INFECT!</span>;
    return <span className="text-xl">TAG!</span>;
  };

  return (
    <div className="relative">
      {/* Swipe hint when in range */}
      {inTagRange && tagCheck.allowed && !isTagging && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-center animate-bounce">
          <span className="text-xs text-white/60">⬆️ Swipe or tap</span>
        </div>
      )}

      <button
        onClick={onTag}
        disabled={!inTagRange || isTagging || isHidingPhase}
        className={`w-28 h-28 rounded-full font-display font-bold text-2xl transition-all transform touch-manipulation ${getButtonClass()} ${tagAnimation ? 'scale-110' : ''}`}
      >
        {getButtonContent()}
      </button>

      {/* Range indicator */}
      {nearestPlayer && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
          <span className={`text-xs font-mono ${inTagRange ? 'text-neon-orange' : 'text-white/40'}`}>
            {nearestDistance < 1000 ? `${Math.round(nearestDistance)}m` : `${(nearestDistance / 1000).toFixed(1)}km`}
          </span>
        </div>
      )}
    </div>
  );
});

export default TagButton;
