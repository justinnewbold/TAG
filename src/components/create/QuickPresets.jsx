import React, { memo } from 'react';

/**
 * QuickPresets - Grid of quick game preset buttons
 */
const QuickPresets = memo(function QuickPresets({
  presets,
  selectedPreset,
  onSelect,
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className={`py-3 px-2 rounded-xl text-center transition-all ${
            selectedPreset === preset.id
              ? 'bg-neon-purple/20 border-2 border-neon-purple'
              : 'bg-white/5 border border-white/10 active:scale-95'
          }`}
        >
          <span className="text-2xl block mb-1">{preset.icon}</span>
          <span className={`text-xs font-medium ${selectedPreset === preset.id ? 'text-neon-purple' : 'text-white/70'}`}>
            {preset.name}
          </span>
        </button>
      ))}
    </div>
  );
});

export default QuickPresets;
