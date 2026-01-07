import React, { memo } from 'react';
import { Share2, Play, Loader2 } from 'lucide-react';

/**
 * LobbyActionBar - Bottom action bar with start/share buttons
 */
const LobbyActionBar = memo(function LobbyActionBar({
  isHost,
  canStart,
  isStarting,
  minPlayersNeeded,
  onInvite,
  onStart,
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
      <div className="flex gap-3">
        <button
          onClick={onInvite}
          className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center"
        >
          <Share2 className="w-6 h-6" />
        </button>

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart || isStarting}
            className={`flex-1 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
              canStart && !isStarting
                ? 'bg-gradient-to-r from-neon-purple to-neon-cyan'
                : 'bg-white/10 text-white/40'
            }`}
          >
            {isStarting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Starting...
              </>
            ) : canStart ? (
              <>
                <Play className="w-6 h-6" />
                Start Game
              </>
            ) : (
              `Waiting for ${minPlayersNeeded} more...`
            )}
          </button>
        ) : (
          <div className="flex-1 h-14 bg-white/5 rounded-xl flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            <span className="text-white/60">Waiting for host...</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default LobbyActionBar;
