import React, { memo } from 'react';

/**
 * SwipeProgressOverlay - Visual feedback for swipe-to-tag gesture
 * Shows progress indicator when swiping up to tag
 */
const SwipeProgressOverlay = memo(function SwipeProgressOverlay({
  swipeProgress,
  isIt,
  inTagRange,
}) {
  if (swipeProgress <= 0 || !isIt || !inTagRange) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
      style={{ height: `${swipeProgress * 40}%` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-neon-orange/50 to-transparent" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-2xl font-bold text-white text-high-contrast animate-pulse">
          {swipeProgress >= 0.8 ? '🎯 RELEASE TO TAG!' : '⬆️ SWIPE UP TO TAG'}
        </p>
      </div>
    </div>
  );
});

export default SwipeProgressOverlay;
