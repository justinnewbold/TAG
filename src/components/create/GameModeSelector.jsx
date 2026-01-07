import React, { memo } from 'react';

/**
 * GameModeSelector - Horizontal scrolling game mode selection
 */
const GameModeSelector = memo(function GameModeSelector({
  modes,
  selectedMode,
  onSelect,
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-white/60 mb-2 px-1">Game Mode</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {Object.values(modes).slice(0, 6).map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`flex-shrink-0 w-28 p-3 rounded-xl text-center transition-all snap-start ${
              selectedMode === mode.id
                ? 'bg-neon-cyan/20 border-2 border-neon-cyan'
                : 'bg-white/5 border border-white/10 active:scale-95'
            }`}
          >
            <span className="text-2xl block mb-1">{mode.icon}</span>
            <span className={`text-xs font-medium line-clamp-1 ${selectedMode === mode.id ? 'text-neon-cyan' : ''}`}>
              {mode.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
});

export default GameModeSelector;
