import React, { memo } from 'react';

const MAX_RADIUS = 20015000; // Half Earth's circumference

/**
 * RadiusSlider - Reusable logarithmic radius slider with quick select chips
 */
const RadiusSlider = memo(function RadiusSlider({
  value,
  onChange,
  min = 10,
  label,
  icon: Icon,
  color = 'purple',
  quickOptions = [],
  formatRadius,
}) {
  // Color variants
  const colors = {
    purple: {
      text: 'text-neon-purple',
      bg: 'bg-neon-purple',
      gradient: '#a855f7',
    },
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500',
      gradient: '#6366f1',
    },
  };
  const colorConfig = colors[color] || colors.purple;

  // Calculate slider position (logarithmic scale)
  const sliderValue = Math.log10(value) / Math.log10(MAX_RADIUS) * 100;

  const handleSliderChange = (e) => {
    const logValue = parseFloat(e.target.value) / 100 * Math.log10(MAX_RADIUS);
    onChange(Math.max(min, Math.round(Math.pow(10, logValue))));
  };

  return (
    <section className="bg-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-5 h-5 ${colorConfig.text}`} />}
          <span className="font-medium">{label}</span>
        </div>
        <span className={`text-xl font-bold ${colorConfig.text}`}>
          {formatRadius(value)}
        </span>
      </div>

      {/* Large Thumb Slider */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        onChange={handleSliderChange}
        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${colorConfig.gradient} ${sliderValue}%, rgba(255,255,255,0.1) 0%)`
        }}
      />

      {/* Quick Select Chips */}
      {quickOptions.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {quickOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                value === opt.value
                  ? `${colorConfig.bg} text-white`
                  : 'bg-white/10 text-white/70 active:scale-95'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
});

export default RadiusSlider;
