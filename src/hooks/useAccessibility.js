/**
 * Accessibility Hooks
 * Phase 8: Accessibility features and preferences
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';

/**
 * Accessibility settings defaults
 */
export const A11Y_DEFAULTS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenReaderMode: false,
  hapticFeedback: true,
  soundEffects: true,
  colorBlindMode: null, // 'protanopia', 'deuteranopia', 'tritanopia'
  focusIndicators: true,
  autoReadAlerts: true,
};

/**
 * Hook to manage accessibility preferences
 */
export function useAccessibilitySettings() {
  const { settings, updateSettings } = useStore();
  const a11ySettings = settings?.accessibility || A11Y_DEFAULTS;

  const updateA11y = useCallback((updates) => {
    updateSettings({
      accessibility: { ...a11ySettings, ...updates },
    });
  }, [a11ySettings, updateSettings]);

  return {
    settings: a11ySettings,
    updateSettings: updateA11y,
  };
}

/**
 * Hook to detect system accessibility preferences
 */
export function useSystemA11yPreferences() {
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDarkMode: true,
    prefersReducedTransparency: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');

    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: motionQuery.matches,
        prefersHighContrast: contrastQuery.matches,
        prefersDarkMode: darkQuery.matches,
        prefersReducedTransparency: transparencyQuery.matches,
      });
    };

    updatePreferences();

    // Listen for changes
    motionQuery.addEventListener('change', updatePreferences);
    contrastQuery.addEventListener('change', updatePreferences);
    darkQuery.addEventListener('change', updatePreferences);
    transparencyQuery.addEventListener('change', updatePreferences);

    return () => {
      motionQuery.removeEventListener('change', updatePreferences);
      contrastQuery.removeEventListener('change', updatePreferences);
      darkQuery.removeEventListener('change', updatePreferences);
      transparencyQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  return preferences;
}

/**
 * Hook for managing focus trap in modals
 */
export function useFocusTrap(isActive = true) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  const announce = useCallback((message, priority = 'polite') => {
    // Create or get announcement region
    let region = document.getElementById('a11y-announcer');
    if (!region) {
      region = document.createElement('div');
      region.id = 'a11y-announcer';
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(region);
    }

    // Update priority if needed
    region.setAttribute('aria-live', priority);

    // Clear and set message (triggers announcement)
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 100);
  }, []);

  return announce;
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNav(options = {}) {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onEscape?.(e);
          break;
        case 'Enter':
          onEnter?.(e);
          break;
        case 'ArrowUp':
          onArrowUp?.(e);
          break;
        case 'ArrowDown':
          onArrowDown?.(e);
          break;
        case 'ArrowLeft':
          onArrowLeft?.(e);
          break;
        case 'ArrowRight':
          onArrowRight?.(e);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);
}

/**
 * Hook for roving tabindex (menu navigation)
 */
export function useRovingTabIndex(items, options = {}) {
  const { orientation = 'vertical', loop = true } = options;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback((e) => {
    const isVertical = orientation === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    let newIndex = activeIndex;

    if (e.key === prevKey) {
      e.preventDefault();
      newIndex = activeIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? items.length - 1 : 0;
      }
    } else if (e.key === nextKey) {
      e.preventDefault();
      newIndex = activeIndex + 1;
      if (newIndex >= items.length) {
        newIndex = loop ? 0 : items.length - 1;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    }

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, items.length, orientation, loop]);

  const getItemProps = useCallback((index) => ({
    tabIndex: index === activeIndex ? 0 : -1,
    onKeyDown: handleKeyDown,
    onFocus: () => setActiveIndex(index),
    'aria-selected': index === activeIndex,
  }), [activeIndex, handleKeyDown]);

  return {
    activeIndex,
    setActiveIndex,
    getItemProps,
  };
}

/**
 * Hook for skip links
 */
export function useSkipLinks() {
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main, [role="main"], #main-content');
    if (main) {
      main.tabIndex = -1;
      main.focus();
      main.scrollIntoView();
    }
  }, []);

  const skipToNav = useCallback(() => {
    const nav = document.querySelector('nav, [role="navigation"]');
    if (nav) {
      const firstLink = nav.querySelector('a, button');
      firstLink?.focus();
    }
  }, []);

  return { skipToMain, skipToNav };
}

/**
 * Hook for color blind safe colors
 */
export function useColorBlindSafe(colorBlindMode = null) {
  const getColor = useCallback((colorName) => {
    const colorMaps = {
      protanopia: {
        red: '#B58900',
        green: '#268BD2',
        blue: '#268BD2',
        warning: '#B58900',
        danger: '#CB4B16',
        success: '#268BD2',
      },
      deuteranopia: {
        red: '#D33682',
        green: '#268BD2',
        blue: '#268BD2',
        warning: '#B58900',
        danger: '#D33682',
        success: '#268BD2',
      },
      tritanopia: {
        red: '#DC322F',
        green: '#859900',
        blue: '#DC322F',
        warning: '#DC322F',
        danger: '#DC322F',
        success: '#859900',
      },
    };

    const defaultColors = {
      red: '#EF4444',
      green: '#22C55E',
      blue: '#3B82F6',
      warning: '#F59E0B',
      danger: '#EF4444',
      success: '#22C55E',
    };

    if (colorBlindMode && colorMaps[colorBlindMode]) {
      return colorMaps[colorBlindMode][colorName] || defaultColors[colorName];
    }

    return defaultColors[colorName];
  }, [colorBlindMode]);

  return { getColor };
}

/**
 * Hook for haptic feedback
 */
export function useHaptics() {
  const { settings } = useAccessibilitySettings();
  const enabled = settings?.hapticFeedback !== false;

  const vibrate = useCallback((pattern = 50) => {
    if (!enabled) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enabled]);

  const vibrateSuccess = useCallback(() => vibrate([50, 50, 50]), [vibrate]);
  const vibrateError = useCallback(() => vibrate([100, 50, 100]), [vibrate]);
  const vibrateTag = useCallback(() => vibrate([200]), [vibrate]);

  return {
    vibrate,
    vibrateSuccess,
    vibrateError,
    vibrateTag,
    enabled,
  };
}

/**
 * Component: Skip Link
 */
export function SkipLink({ target = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={target}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-dark-800 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-cyan"
    >
      {children}
    </a>
  );
}

/**
 * Component: Visually Hidden (for screen readers)
 */
export function VisuallyHidden({ children, as: Component = 'span' }) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

export default {
  useAccessibilitySettings,
  useSystemA11yPreferences,
  useFocusTrap,
  useAnnounce,
  useKeyboardNav,
  useRovingTabIndex,
  useSkipLinks,
  useColorBlindSafe,
  useHaptics,
  SkipLink,
  VisuallyHidden,
};
