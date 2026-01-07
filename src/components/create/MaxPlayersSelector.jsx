import React, { memo } from 'react';
import { Users } from 'lucide-react';

const PLAYER_OPTIONS = [4, 6, 8, 10, 15, 20, 50, 100];

/**
 * MaxPlayersSelector - Grid of player count options
 */
const MaxPlayersSelector = memo(function MaxPlayersSelector({
  value,
  onChange,
  options = PLAYER_OPTIONS,
}) {
  return (
    <section className="bg-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <span className="font-medium">Max Players</span>
        </div>
        <span className="text-xl font-bold text-amber-400">{value}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`min-w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all flex-shrink-0 ${
              value === num
                ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-400'
                : 'bg-white/10 text-white/70 active:scale-95'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </section>
  );
});

export default MaxPlayersSelector;
