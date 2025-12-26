/**
 * Game Utilities for TAG!
 * Helper functions for no-tag zones, times, and game logic
 */

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a player is within any no-tag zone
 * @param {number} lat - Player latitude
 * @param {number} lng - Player longitude
 * @param {Array} noTagZones - Array of no-tag zone objects
 * @returns {Object|null} - The zone player is in, or null if not in any zone
 */
export function isInNoTagZone(lat, lng, noTagZones = []) {
  if (!noTagZones || noTagZones.length === 0) return null;
  
  for (const zone of noTagZones) {
    if (!zone.active) continue;
    
    const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
    if (distance <= zone.radius) {
      return zone;
    }
  }
  
  return null;
}

/**
 * Check if current time falls within any no-tag time schedule
 * @param {Array} noTagTimes - Array of no-tag time schedule objects
 * @param {Date} currentTime - Optional current time (defaults to now)
 * @returns {Object|null} - The schedule that's active, or null if none
 */
export function isInNoTagTime(noTagTimes = [], currentTime = new Date()) {
  if (!noTagTimes || noTagTimes.length === 0) return null;
  
  const currentDay = currentTime.getDay(); // 0 = Sunday
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;
  
  for (const schedule of noTagTimes) {
    if (!schedule.active) continue;
    if (!schedule.days.includes(currentDay)) continue;
    
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight schedules (e.g., 22:00 - 06:00)
    if (endMinutes < startMinutes) {
      if (currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes) {
        return schedule;
      }
    } else {
      if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
        return schedule;
      }
    }
  }
  
  return null;
}

/**
 * Check if a tag can happen between two players
 * @param {Object} tagger - Tagger player object with lat/lng
 * @param {Object} target - Target player object with lat/lng
 * @param {Object} gameSettings - Game settings with noTagZones, noTagTimes, tagRadius
 * @returns {Object} - { canTag: boolean, reason?: string, zone?: Object, schedule?: Object }
 */
export function canTagNow(tagger, target, gameSettings = {}) {
  const { noTagZones = [], noTagTimes = [], tagRadius = 15 } = gameSettings;
  
  // Check if tagger is in a no-tag zone
  const taggerZone = isInNoTagZone(tagger.lat, tagger.lng, noTagZones);
  if (taggerZone) {
    return {
      canTag: false,
      reason: 'You are in a no-tag zone',
      zone: taggerZone
    };
  }
  
  // Check if target is in a no-tag zone
  const targetZone = isInNoTagZone(target.lat, target.lng, noTagZones);
  if (targetZone) {
    return {
      canTag: false,
      reason: 'Target is in a safe zone',
      zone: targetZone
    };
  }
  
  // Check if current time is in a no-tag schedule
  const activeSchedule = isInNoTagTime(noTagTimes);
  if (activeSchedule) {
    return {
      canTag: false,
      reason: 'Tagging is paused during scheduled time',
      schedule: activeSchedule
    };
  }
  
  // Check distance
  const distance = calculateDistance(tagger.lat, tagger.lng, target.lat, target.lng);
  if (distance > tagRadius) {
    return {
      canTag: false,
      reason: `Target is too far (${Math.round(distance)}m away, need ${tagRadius}m)`,
      distance
    };
  }
  
  return {
    canTag: true,
    distance: Math.round(distance)
  };
}

/**
 * Get time until next no-tag schedule ends
 * @param {Object} schedule - Active no-tag schedule
 * @returns {string} - Human readable time remaining
 */
export function getTimeUntilNoTagEnds(schedule) {
  if (!schedule) return '';
  
  const now = new Date();
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);
  
  let endTime = new Date(now);
  endTime.setHours(endHour, endMin, 0, 0);
  
  // If end time is before current time, it's tomorrow
  if (endTime <= now) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  const diffMs = endTime - now;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Format GPS interval for display
 * @param {number} ms - Interval in milliseconds
 * @returns {string} - Human readable interval
 */
export function formatGpsInterval(ms) {
  if (ms >= 86400000) {
    const days = ms / 86400000;
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (ms >= 3600000) {
    const hours = ms / 3600000;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const mins = ms / 60000;
  return mins === 1 ? '1 minute' : `${mins} minutes`;
}

/**
 * Get player status based on game settings
 * @param {Object} player - Player object with lat/lng
 * @param {Object} gameSettings - Game settings
 * @returns {Object} - Player status with zone/time info
 */
export function getPlayerStatus(player, gameSettings = {}) {
  const { noTagZones = [], noTagTimes = [] } = gameSettings;
  
  const zone = isInNoTagZone(player.lat, player.lng, noTagZones);
  const schedule = isInNoTagTime(noTagTimes);
  
  return {
    isSafe: !!zone || !!schedule,
    inZone: zone,
    inSchedule: schedule,
    statusText: zone 
      ? `Safe in ${zone.name}` 
      : schedule 
        ? `Paused: ${schedule.name}`
        : 'Active',
    statusColor: zone 
      ? 'green' 
      : schedule 
        ? 'amber' 
        : 'indigo'
  };
}

/**
 * Validate game settings
 * @param {Object} settings - Game settings to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateGameSettings(settings) {
  const errors = [];
  
  // GPS Interval validation (minimum 5 minutes = 300000ms)
  if (settings.gpsInterval && settings.gpsInterval < 300000) {
    errors.push('GPS interval must be at least 5 minutes');
  }
  
  // No-tag zones validation (max 10)
  if (settings.noTagZones && settings.noTagZones.length > 10) {
    errors.push('Maximum 10 no-tag zones allowed');
  }
  
  // No-tag times validation (max 5)
  if (settings.noTagTimes && settings.noTagTimes.length > 5) {
    errors.push('Maximum 5 no-tag time schedules allowed');
  }
  
  // Tag radius validation (5-100 meters)
  if (settings.tagRadius && (settings.tagRadius < 5 || settings.tagRadius > 100)) {
    errors.push('Tag radius must be between 5 and 100 meters');
  }
  
  // Max players validation (2-50)
  if (settings.maxPlayers && (settings.maxPlayers < 2 || settings.maxPlayers > 50)) {
    errors.push('Max players must be between 2 and 50');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  calculateDistance,
  isInNoTagZone,
  isInNoTagTime,
  canTagNow,
  getTimeUntilNoTagEnds,
  formatGpsInterval,
  getPlayerStatus,
  validateGameSettings
};
