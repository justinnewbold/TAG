/**
 * Shared utility functions used by both client and server
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate speed between two location updates
 * @param {Object} loc1 - First location {lat, lng, timestamp}
 * @param {Object} loc2 - Second location {lat, lng, timestamp}
 * @returns {number} Speed in meters per second
 */
export function calculateSpeed(loc1, loc2) {
  if (!loc1 || !loc2 || !loc1.timestamp || !loc2.timestamp) return 0;

  const distance = getDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  const timeMs = Math.abs(loc2.timestamp - loc1.timestamp);

  if (timeMs === 0) return 0;

  return distance / (timeMs / 1000); // meters per second
}

/**
 * Check if a speed is humanly possible (anti-cheat)
 * @param {number} speedMps - Speed in meters per second
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function isValidSpeed(speedMps) {
  // Maximum running speed is about 12 m/s (Usain Bolt)
  // Allow up to 15 m/s to account for GPS drift
  const MAX_RUNNING_SPEED = 15;

  // Allow up to 35 m/s for vehicles (about 126 km/h)
  const MAX_VEHICLE_SPEED = 35;

  // Teleport threshold - anything above this is definitely cheating
  const TELEPORT_THRESHOLD = 100; // 100 m/s = 360 km/h

  if (speedMps > TELEPORT_THRESHOLD) {
    return { valid: false, reason: 'teleport_detected', severity: 'high' };
  }

  if (speedMps > MAX_VEHICLE_SPEED) {
    return { valid: false, reason: 'speed_too_high', severity: 'medium' };
  }

  if (speedMps > MAX_RUNNING_SPEED) {
    return { valid: true, reason: 'possibly_in_vehicle', severity: 'low' };
  }

  return { valid: true };
}

/**
 * Format milliseconds as MM:SS
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds as human readable interval
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted interval string (e.g., "5m", "2h", "1d")
 */
export function formatInterval(ms) {
  if (ms < 60 * 1000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))}m`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))}h`;
  return `${Math.floor(ms / (24 * 60 * 60 * 1000))}d`;
}

// ============================================
// Distance Formatting (Metric/Imperial)
// ============================================

const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;
const FEET_PER_MILE = 5280;

/**
 * Convert meters to feet
 * @param {number} meters
 * @returns {number}
 */
export function metersToFeet(meters) {
  return meters / METERS_PER_FOOT;
}

/**
 * Convert meters to miles
 * @param {number} meters
 * @returns {number}
 */
export function metersToMiles(meters) {
  return meters / METERS_PER_MILE;
}

/**
 * Format distance for display with metric or imperial units
 * @param {number} meters - Distance in meters
 * @param {boolean} useImperial - If true, use feet/miles; if false, use meters/km
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters, useImperial = false) {
  if (useImperial) {
    const feet = metersToFeet(meters);
    if (feet < FEET_PER_MILE / 4) {
      return `${Math.round(feet)}ft`;
    }
    const miles = feet / FEET_PER_MILE;
    if (miles >= 10) {
      return `${Math.round(miles)}mi`;
    }
    return `${miles.toFixed(1)}mi`;
  }

  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  if (km >= 10) {
    return `${Math.round(km)}km`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format radius for game settings (supports global scale)
 * @param {number} meters - Radius in meters
 * @param {boolean} useImperial - If true, use feet/miles; if false, use meters/km
 * @returns {string} Formatted radius string
 */
export function formatRadius(meters, useImperial = false) {
  if (meters >= 20015000) return '🌍 Global';

  if (useImperial) {
    const feet = metersToFeet(meters);
    const miles = metersToMiles(meters);

    if (miles >= 1000) {
      return `${(miles / 1000).toFixed(0)}K mi`;
    }
    if (miles >= 1) {
      return `${miles >= 10 ? Math.round(miles) : miles.toFixed(1)} mi`;
    }
    if (feet >= 1000) {
      return `${(feet / 1000).toFixed(1)}K ft`;
    }
    return `${Math.round(feet)}ft`;
  }

  if (meters >= 1000000) {
    return `${(meters / 1000000).toFixed(0)}K km`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
  }
  return `${meters}m`;
}

/**
 * Generate a unique ID
 * @returns {string} Random ID string
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generate a 6-character game code
 * @returns {string} Uppercase alphanumeric game code
 */
export function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum milliseconds between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Check if current time is in a no-tag period
 * @param {Array} noTagTimes - Array of no-tag time rules
 * @returns {boolean} True if currently in a no-tag period
 */
export function isInNoTagTime(noTagTimes) {
  if (!noTagTimes || noTagTimes.length === 0) return false;

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  return noTagTimes.some(rule => {
    // Check if current day is included
    if (!rule.days.includes(currentDay)) return false;

    // Parse times
    const [startHour, startMin] = rule.startTime.split(':').map(Number);
    const [endHour, endMin] = rule.endTime.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;

    // Handle overnight times (e.g., 22:00 - 06:00)
    if (endMins < startMins) {
      return currentTime >= startMins || currentTime <= endMins;
    }

    return currentTime >= startMins && currentTime <= endMins;
  });
}

/**
 * Check if a location is in a no-tag zone (safe zone)
 * @param {Object} location - Location with lat and lng properties
 * @param {Array} noTagZones - Array of no-tag zones with lat, lng, radius
 * @returns {boolean} True if location is in a no-tag zone
 */
export function isInNoTagZone(location, noTagZones) {
  if (!location || !noTagZones || noTagZones.length === 0) return false;

  return noTagZones.some(zone => {
    const distance = getDistance(location.lat, location.lng, zone.lat, zone.lng);
    return distance <= zone.radius;
  });
}

/**
 * Check if tagging is currently allowed based on game rules
 * @param {Object} game - Game object with settings
 * @param {Object} taggerLocation - Tagger's location
 * @param {Object} targetLocation - Target's location
 * @returns {Object} { allowed: boolean, reason: string|null }
 */
export function canTagNow(game, taggerLocation, targetLocation) {
  // Check no-tag times
  if (isInNoTagTime(game?.settings?.noTagTimes)) {
    return { allowed: false, reason: 'No-tag time period active' };
  }

  // Check if tagger is in no-tag zone
  if (isInNoTagZone(taggerLocation, game?.settings?.noTagZones)) {
    return { allowed: false, reason: 'You are in a safe zone' };
  }

  // Check if target is in no-tag zone
  if (isInNoTagZone(targetLocation, game?.settings?.noTagZones)) {
    return { allowed: false, reason: 'Target is in a safe zone' };
  }

  return { allowed: true, reason: null };
}
