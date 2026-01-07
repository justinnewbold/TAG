import React, { memo } from 'react';
import { Settings, Play, Loader2 } from 'lucide-react';

/**
 * CreateActionBar - Fixed bottom action bar with settings and create button
 */
const CreateActionBar = memo(function CreateActionBar({
  isCreating,
  isDisabled,
  onSettingsClick,
  onCreate,
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
      <div className="flex gap-3">
        <button
          onClick={onSettingsClick}
          className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center"
        >
          <Settings className="w-6 h-6" />
        </button>

        <button
          onClick={onCreate}
          disabled={isCreating || isDisabled}
          className="flex-1 h-14 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-xl flex items-center justify-center gap-3 text-lg font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Create Game
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default CreateActionBar;
