import { useState, useEffect, useCallback } from 'react';

/**
 * Day/Night Cycle Effects Hook
 * Calculates time of day and provides visual/gameplay modifiers
 */

// Sun position calculation (simplified)
function getSunPosition(date, latitude = 40) {
  const hour = date.getHours() + date.getMinutes() / 60;
  
  // Day of year (0-365)
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Declination angle (varies through year)
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);
  
  // Hour angle
  const hourAngle = 15 * (hour - 12);
  
  // Solar elevation
  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const hourRad = hourAngle * Math.PI / 180;
  
  const elevation = Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad)
  ) * 180 / Math.PI;
  
  return {
    elevation,
    azimuth: hourAngle + 180
  };
}

// Time period classification
function getTimePeriod(date) {
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'dusk';
  if (hour >= 20 && hour < 22) return 'evening';
  return 'night';
}

// Visual styles for different times
const TIME_STYLES = {
  dawn: {
    skyGradient: 'from-orange-500/20 via-pink-500/10 to-blue-500/10',
    overlayOpacity: 0.1,
    ambientColor: '#ffb347',
    brightness: 0.8,
    contrast: 1.0,
    saturation: 1.1
  },
  morning: {
    skyGradient: 'from-blue-400/10 via-cyan-300/5 to-white/5',
    overlayOpacity: 0,
    ambientColor: '#87ceeb',
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0
  },
  noon: {
    skyGradient: 'from-blue-300/5 to-white/0',
    overlayOpacity: 0,
    ambientColor: '#fff5e0',
    brightness: 1.1,
    contrast: 1.1,
    saturation: 0.95
  },
  afternoon: {
    skyGradient: 'from-yellow-400/10 via-orange-300/5 to-blue-400/5',
    overlayOpacity: 0,
    ambientColor: '#ffd27f',
    brightness: 1.0,
    contrast: 1.05,
    saturation: 1.0
  },
  dusk: {
    skyGradient: 'from-orange-600/20 via-purple-500/15 to-blue-600/10',
    overlayOpacity: 0.15,
    ambientColor: '#ff6b6b',
    brightness: 0.85,
    contrast: 1.0,
    saturation: 1.2
  },
  evening: {
    skyGradient: 'from-purple-700/20 via-blue-800/15 to-indigo-900/20',
    overlayOpacity: 0.25,
    ambientColor: '#6b5b95',
    brightness: 0.7,
    contrast: 0.95,
    saturation: 0.9
  },
  night: {
    skyGradient: 'from-indigo-900/30 via-purple-900/25 to-black/30',
    overlayOpacity: 0.4,
    ambientColor: '#1a1a2e',
    brightness: 0.5,
    contrast: 0.9,
    saturation: 0.7
  }
};

// Gameplay modifiers based on time
const TIME_MODIFIERS = {
  dawn: {
    visibilityRange: 1.0,
    detectionRadius: 0.9,
    description: 'Early morning fog may reduce visibility'
  },
  morning: {
    visibilityRange: 1.0,
    detectionRadius: 1.0,
    description: 'Clear conditions'
  },
  noon: {
    visibilityRange: 1.0,
    detectionRadius: 1.0,
    description: 'Maximum visibility'
  },
  afternoon: {
    visibilityRange: 1.0,
    detectionRadius: 1.0,
    description: 'Good conditions'
  },
  dusk: {
    visibilityRange: 0.85,
    detectionRadius: 0.9,
    description: 'Fading light reduces visibility'
  },
  evening: {
    visibilityRange: 0.7,
    detectionRadius: 0.8,
    description: 'Limited visibility in low light'
  },
  night: {
    visibilityRange: 0.5,
    detectionRadius: 0.6,
    description: 'Darkness provides cover'
  }
};

export function useDayNightCycle({ enabled = true, location = null } = {}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timePeriod, setTimePeriod] = useState(getTimePeriod(new Date()));
  const [sunPosition, setSunPosition] = useState({ elevation: 45, azimuth: 180 });

  // Update time every minute
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setTimePeriod(getTimePeriod(now));
      
      const lat = location?.latitude || 40;
      setSunPosition(getSunPosition(now, lat));
    }, 60000);

    // Initial calculation
    const now = new Date();
    setTimePeriod(getTimePeriod(now));
    setSunPosition(getSunPosition(now, location?.latitude || 40));

    return () => clearInterval(interval);
  }, [enabled, location?.latitude]);

  // Get visual styles
  const getStyles = useCallback(() => {
    if (!enabled) return TIME_STYLES.morning;
    return TIME_STYLES[timePeriod] || TIME_STYLES.morning;
  }, [enabled, timePeriod]);

  // Get gameplay modifiers
  const getModifiers = useCallback(() => {
    if (!enabled) return TIME_MODIFIERS.morning;
    return TIME_MODIFIERS[timePeriod] || TIME_MODIFIERS.morning;
  }, [enabled, timePeriod]);

  // Get CSS filter for map overlay
  const getMapFilter = useCallback(() => {
    const styles = getStyles();
    return `brightness(${styles.brightness}) contrast(${styles.contrast}) saturate(${styles.saturation})`;
  }, [getStyles]);

  // Check if it's dark enough for night mode
  const isDark = useCallback(() => {
    return ['evening', 'night', 'dawn'].includes(timePeriod);
  }, [timePeriod]);

  // Get time-appropriate player marker glow
  const getMarkerGlow = useCallback((isIt = false) => {
    const styles = getStyles();
    
    if (timePeriod === 'night') {
      // Enhanced glow at night for visibility
      return isIt 
        ? '0 0 20px 8px rgba(255, 100, 100, 0.6)'
        : '0 0 15px 5px rgba(0, 245, 255, 0.5)';
    }
    
    return isIt
      ? '0 0 10px 4px rgba(255, 100, 100, 0.4)'
      : '0 0 8px 3px rgba(0, 245, 255, 0.3)';
  }, [timePeriod, getStyles]);

  // Format current time for display
  const getTimeDisplay = useCallback(() => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, [currentTime]);

  return {
    currentTime,
    timePeriod,
    sunPosition,
    styles: getStyles(),
    modifiers: getModifiers(),
    mapFilter: getMapFilter(),
    isDark: isDark(),
    markerGlow: getMarkerGlow,
    timeDisplay: getTimeDisplay()
  };
}

// Component for visual overlay
export function DayNightOverlay({ enabled = true, className = '' }) {
  const { styles, timePeriod } = useDayNightCycle({ enabled });

  if (!enabled) return null;

  return (
    <>
      {/* Gradient overlay */}
      <div 
        className={`pointer-events-none fixed inset-0 z-10 bg-gradient-to-b ${styles.skyGradient} transition-all duration-[60000ms] ${className}`}
        style={{ opacity: styles.overlayOpacity }}
      />
      
      {/* Stars at night */}
      {timePeriod === 'night' && (
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: 0.3 + Math.random() * 0.5
              }}
            />
          ))}
        </div>
      )}

      {/* Moon at night */}
      {(timePeriod === 'night' || timePeriod === 'evening') && (
        <div 
          className="pointer-events-none fixed z-10 w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-300"
          style={{
            top: '10%',
            right: '15%',
            boxShadow: '0 0 20px 5px rgba(255, 255, 255, 0.3)'
          }}
        />
      )}
    </>
  );
}

export default useDayNightCycle;
