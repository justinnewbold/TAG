import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store';

// Accessibility context
const AccessibilityContext = createContext(null);

// Colorblind mode CSS filters
const COLORBLIND_FILTERS = {
  none: '',
  protanopia: 'url(#protanopia)',
  deuteranopia: 'url(#deuteranopia)',
  tritanopia: 'url(#tritanopia)',
  achromatopsia: 'grayscale(100%)',
};

// SVG filters for colorblind modes
const ColorblindFilters = () => (
  <svg className="hidden" aria-hidden="true">
    <defs>
      {/* Protanopia (red-blind) */}
      <filter id="protanopia">
        <feColorMatrix
          type="matrix"
          values="0.567, 0.433, 0,     0, 0
                  0.558, 0.442, 0,     0, 0
                  0,     0.242, 0.758, 0, 0
                  0,     0,     0,     1, 0"
        />
      </filter>

      {/* Deuteranopia (green-blind) */}
      <filter id="deuteranopia">
        <feColorMatrix
          type="matrix"
          values="0.625, 0.375, 0,   0, 0
                  0.7,   0.3,   0,   0, 0
                  0,     0.3,   0.7, 0, 0
                  0,     0,     0,   1, 0"
        />
      </filter>

      {/* Tritanopia (blue-blind) */}
      <filter id="tritanopia">
        <feColorMatrix
          type="matrix"
          values="0.95, 0.05,  0,     0, 0
                  0,    0.433, 0.567, 0, 0
                  0,    0.475, 0.525, 0, 0
                  0,    0,     0,     1, 0"
        />
      </filter>
    </defs>
  </svg>
);

// Accessibility provider component
export function AccessibilityProvider({ children }) {
  const { settings, updateSettings } = useStore();

  const {
    colorblindMode = 'none',
    largeText = false,
    reducedMotion = false,
    largeTouchTargets = false,
    audioCues = true,
    voiceAnnouncements = false,
    strongHaptics = false,
  } = settings;

  // Apply colorblind filter to root
  useEffect(() => {
    const root = document.documentElement;
    const filter = COLORBLIND_FILTERS[colorblindMode] || '';
    root.style.filter = filter;

    return () => {
      root.style.filter = '';
    };
  }, [colorblindMode]);

  // Apply large text class
  useEffect(() => {
    const root = document.documentElement;
    if (largeText) {
      root.classList.add('text-lg');
      root.style.fontSize = '18px';
    } else {
      root.classList.remove('text-lg');
      root.style.fontSize = '';
    }

    return () => {
      root.classList.remove('text-lg');
      root.style.fontSize = '';
    };
  }, [largeText]);

  // Apply reduced motion
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.classList.add('reduce-motion');
      root.style.setProperty('--animation-duration', '0.01ms');
    } else {
      root.classList.remove('reduce-motion');
      root.style.removeProperty('--animation-duration');
    }

    // Also respect system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => {
      if (e.matches && !reducedMotion) {
        updateSettings({ reducedMotion: true });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      root.classList.remove('reduce-motion');
      root.style.removeProperty('--animation-duration');
    };
  }, [reducedMotion, updateSettings]);

  // Apply large touch targets
  useEffect(() => {
    const root = document.documentElement;
    if (largeTouchTargets) {
      root.classList.add('large-touch-targets');
    } else {
      root.classList.remove('large-touch-targets');
    }

    return () => {
      root.classList.remove('large-touch-targets');
    };
  }, [largeTouchTargets]);

  // Voice announcement function
  const announce = useCallback((message, priority = 'polite') => {
    if (!voiceAnnouncements) return;

    // Use Web Speech API if available
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }

    // Also announce via ARIA live region
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, [voiceAnnouncements]);

  // Play audio cue
  const playAudioCue = useCallback((type) => {
    if (!audioCues) return;

    // This would integrate with the existing sound system
    // For now, just a placeholder
    const soundTypes = {
      success: { freq: 800, duration: 0.1 },
      error: { freq: 200, duration: 0.2 },
      warning: { freq: 400, duration: 0.15 },
      notification: { freq: 600, duration: 0.1 },
    };

    const sound = soundTypes[type];
    if (!sound) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = sound.freq;
      gainNode.gain.value = 0.2;

      oscillator.start();
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch (e) {
      // Audio context not available
    }
  }, [audioCues]);

  // Haptic feedback
  const hapticFeedback = useCallback((pattern = 'light') => {
    if (!strongHaptics && pattern === 'strong') return;
    if (!('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [30],
      strong: [50, 30, 50],
      success: [10, 50, 10],
      error: [50, 50, 50],
    };

    const vibrationPattern = patterns[pattern] || patterns.light;
    navigator.vibrate(strongHaptics ? vibrationPattern.map(v => v * 1.5) : vibrationPattern);
  }, [strongHaptics]);

  const value = useMemo(() => ({
    // Settings
    colorblindMode,
    largeText,
    reducedMotion,
    largeTouchTargets,
    audioCues,
    voiceAnnouncements,
    strongHaptics,

    // Functions
    announce,
    playAudioCue,
    hapticFeedback,

    // Update settings
    setColorblindMode: (mode) => updateSettings({ colorblindMode: mode }),
    setLargeText: (enabled) => updateSettings({ largeText: enabled }),
    setReducedMotion: (enabled) => updateSettings({ reducedMotion: enabled }),
    setLargeTouchTargets: (enabled) => updateSettings({ largeTouchTargets: enabled }),
    setAudioCues: (enabled) => updateSettings({ audioCues: enabled }),
    setVoiceAnnouncements: (enabled) => updateSettings({ voiceAnnouncements: enabled }),
    setStrongHaptics: (enabled) => updateSettings({ strongHaptics: enabled }),
  }), [
    colorblindMode,
    largeText,
    reducedMotion,
    largeTouchTargets,
    audioCues,
    voiceAnnouncements,
    strongHaptics,
    announce,
    playAudioCue,
    hapticFeedback,
    updateSettings,
  ]);

  return (
    <AccessibilityContext.Provider value={value}>
      <ColorblindFilters />
      {/* ARIA live region for announcements */}
      <div
        id="aria-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Hook to use accessibility context
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Higher-order component for accessible components
export function withAccessibility(Component) {
  return function AccessibleComponent(props) {
    const accessibility = useAccessibility();
    return <Component {...props} accessibility={accessibility} />;
  };
}

export default AccessibilityContext;
