import React from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Hand, Palette, Type, Vibrate, Bell, Sun, Moon } from 'lucide-react';

// Accessibility settings and utilities

export const ACCESSIBILITY_SETTINGS = {
  // Visual
  colorblindMode: {
    id: 'colorblindMode',
    label: 'Colorblind Mode',
    description: 'Use patterns and shapes instead of colors',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
      { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
      { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' },
      { value: 'highContrast', label: 'High Contrast' },
    ],
    default: 'none',
    icon: Palette,
  },
  largeText: {
    id: 'largeText',
    label: 'Large Text',
    description: 'Increase text size throughout the app',
    type: 'toggle',
    default: false,
    icon: Type,
  },
  reducedMotion: {
    id: 'reducedMotion',
    label: 'Reduced Motion',
    description: 'Minimize animations and transitions',
    type: 'toggle',
    default: false,
    icon: Eye,
  },
  largeTouchTargets: {
    id: 'largeTouchTargets',
    label: 'Large Touch Targets',
    description: 'Increase button and tap target sizes',
    type: 'toggle',
    default: false,
    icon: Hand,
  },
  
  // Audio
  audioCues: {
    id: 'audioCues',
    label: 'Audio Cues',
    description: 'Play sounds for important events',
    type: 'toggle',
    default: true,
    icon: Volume2,
  },
  voiceAnnouncements: {
    id: 'voiceAnnouncements',
    label: 'Voice Announcements',
    description: 'Speak important game events aloud',
    type: 'toggle',
    default: false,
    icon: Volume2,
  },
  
  // Haptic
  hapticFeedback: {
    id: 'hapticFeedback',
    label: 'Haptic Feedback',
    description: 'Vibration for game events',
    type: 'toggle',
    default: true,
    icon: Vibrate,
  },
  strongHaptics: {
    id: 'strongHaptics',
    label: 'Strong Haptics',
    description: 'Use stronger vibration patterns',
    type: 'toggle',
    default: false,
    icon: Vibrate,
  },
};

// Colorblind-safe color palettes
export const COLOR_PALETTES = {
  none: {
    it: '#f97316', // Orange
    safe: '#22c55e', // Green
    danger: '#ef4444', // Red
    info: '#00f5ff', // Cyan
    warning: '#fbbf24', // Yellow
  },
  protanopia: {
    it: '#0077bb', // Blue
    safe: '#33bbee', // Light Blue
    danger: '#ee7733', // Orange
    info: '#009988', // Teal
    warning: '#ccbb44', // Yellow-Green
  },
  deuteranopia: {
    it: '#0077bb', // Blue
    safe: '#33bbee', // Light Blue
    danger: '#cc3311', // Red-Orange
    info: '#009988', // Teal
    warning: '#ee7733', // Orange
  },
  tritanopia: {
    it: '#ee3377', // Pink
    safe: '#009988', // Teal
    danger: '#cc3311', // Red-Orange
    info: '#33bbee', // Light Blue
    warning: '#ee7733', // Orange
  },
  highContrast: {
    it: '#ffffff', // White
    safe: '#00ff00', // Bright Green
    danger: '#ff0000', // Bright Red
    info: '#00ffff', // Bright Cyan
    warning: '#ffff00', // Bright Yellow
  },
};

// Get accessible color based on user setting
export const getAccessibleColor = (colorType, colorblindMode = 'none') => {
  const palette = COLOR_PALETTES[colorblindMode] || COLOR_PALETTES.none;
  return palette[colorType] || palette.info;
};

// Speak text using Web Speech API
export const speakText = (text, rate = 1.0) => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  }
};

// Announce game events
export const announceEvent = (event, settings) => {
  if (!settings?.voiceAnnouncements) return;
  
  const announcements = {
    tagged: 'You have been tagged! You are now it!',
    youTagged: 'Tag successful!',
    gameStart: 'The game has started. Good luck!',
    gameEnd: 'Game over!',
    playerNear: 'A player is nearby!',
    inSafeZone: 'You are in a safe zone',
    leftSafeZone: 'You left the safe zone',
    countdown5: '5 seconds remaining',
    countdown10: '10 seconds remaining',
    countdown30: '30 seconds remaining',
    countdown60: '1 minute remaining',
  };
  
  const message = announcements[event];
  if (message) {
    speakText(message);
  }
};

// Accessibility Provider Component
function AccessibilitySettings({ settings, onUpdateSettings }) {
  const handleToggle = (settingId) => {
    onUpdateSettings({
      [settingId]: !settings[settingId],
    });
  };

  const handleSelect = (settingId, value) => {
    onUpdateSettings({
      [settingId]: value,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold flex items-center gap-2">
        <Eye className="w-5 h-5 text-neon-cyan" />
        Accessibility
      </h2>

      {/* Visual Settings */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Visual
        </h3>
        <div className="space-y-4">
          {/* Colorblind Mode */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Palette className="w-5 h-5 text-white/60 mt-0.5" />
              <div>
                <p className="font-medium">Colorblind Mode</p>
                <p className="text-xs text-white/50">Adjust colors for visibility</p>
              </div>
            </div>
            <select
              value={settings.colorblindMode || 'none'}
              onChange={(e) => handleSelect('colorblindMode', e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
            >
              {ACCESSIBILITY_SETTINGS.colorblindMode.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Large Text */}
          <ToggleSetting
            icon={Type}
            label="Large Text"
            description="Increase text size"
            value={settings.largeText}
            onChange={() => handleToggle('largeText')}
          />

          {/* Reduced Motion */}
          <ToggleSetting
            icon={Eye}
            label="Reduced Motion"
            description="Minimize animations"
            value={settings.reducedMotion}
            onChange={() => handleToggle('reducedMotion')}
          />

          {/* Large Touch Targets */}
          <ToggleSetting
            icon={Hand}
            label="Large Buttons"
            description="Bigger tap targets"
            value={settings.largeTouchTargets}
            onChange={() => handleToggle('largeTouchTargets')}
          />
        </div>
      </div>

      {/* Audio Settings */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Audio
        </h3>
        <div className="space-y-4">
          <ToggleSetting
            icon={Volume2}
            label="Audio Cues"
            description="Sound effects for events"
            value={settings.audioCues !== false}
            onChange={() => handleToggle('audioCues')}
          />

          <ToggleSetting
            icon={Volume2}
            label="Voice Announcements"
            description="Speak game events aloud"
            value={settings.voiceAnnouncements}
            onChange={() => handleToggle('voiceAnnouncements')}
          />
        </div>
      </div>

      {/* Haptic Settings */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Haptic
        </h3>
        <div className="space-y-4">
          <ToggleSetting
            icon={Vibrate}
            label="Haptic Feedback"
            description="Vibration for events"
            value={settings.hapticFeedback !== false}
            onChange={() => handleToggle('hapticFeedback')}
          />

          <ToggleSetting
            icon={Vibrate}
            label="Strong Haptics"
            description="Stronger vibration patterns"
            value={settings.strongHaptics}
            onChange={() => handleToggle('strongHaptics')}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
          Color Preview
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(COLOR_PALETTES[settings.colorblindMode || 'none']).map(([name, color]) => (
            <div key={name} className="text-center">
              <div
                className="w-full aspect-square rounded-lg mb-1"
                style={{ backgroundColor: color }}
              />
              <p className="text-xs text-white/50 capitalize">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({ icon: Icon, label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-white/60 mt-0.5" />
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-white/50">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-all ${
          value ? 'bg-neon-cyan' : 'bg-white/20'
        }`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default AccessibilitySettings;
