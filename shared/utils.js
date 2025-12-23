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
