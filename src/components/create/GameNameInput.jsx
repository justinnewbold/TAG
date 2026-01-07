import React, { memo } from 'react';

/**
 * GameNameInput - Simple game name text input
 */
const GameNameInput = memo(function GameNameInput({
  value,
  onChange,
  maxLength = 30,
  placeholder = 'Enter game name',
}) {
  return (
    <section className="bg-white/5 rounded-2xl p-4">
      <label className="text-sm font-medium text-white/60 mb-2 block">
        Game Name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan"
        maxLength={maxLength}
      />
    </section>
  );
});

export default GameNameInput;
