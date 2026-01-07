import React, { memo } from 'react';

/**
 * CountdownOverlay - Full-screen countdown before game starts
 */
const CountdownOverlay = memo(function CountdownOverlay({ countdown }) {
  if (countdown === null) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-900/95 flex items-center justify-center">
      <div className="text-center">
        <div className="text-9xl font-display font-bold text-neon-cyan mb-4 animate-bounce">
          {countdown}
        </div>
        <p className="text-2xl text-white/60">Get Ready!</p>
      </div>
    </div>
  );
});

export default CountdownOverlay;
