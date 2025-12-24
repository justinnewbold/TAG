/**
 * Shared game logic utilities for TAG game.
 * These functions are used by both client (store.js) and server (GameManager.js).
 */

import { getDistance } from './distance';

/**
 * Check if current time is within a no-tag time period.
 * @param {Array<{days: number[], startTime: string, endTime: string}>} noTagTimes - Array of time rules
 * @returns {boolean} True if currently in a no-tag time period
 */
export const isInNoTagTime = (noTagTimes) => {
  if (!noTagTimes || noTagTimes.length === 0) return false;

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  return noTagTimes.some(rule => {
    // Check if current day is included
    if (!rule.days || !rule.days.includes(currentDay)) return false;

    // Parse times
    const [startHour, startMin] = (rule.startTime || '00:00').split(':').map(Number);
    const [endHour, endMin] = (rule.endTime || '00:00').split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;

    // Handle overnight times (e.g., 22:00 - 06:00)
    if (endMins < startMins) {
      return currentTime >= startMins || currentTime <= endMins;
    }

    return currentTime >= startMins && currentTime <= endMins;
  });
};

/**
 * Check if a location is within any no-tag zone.
 * @param {{lat: number, lng: number}} location - The location to check
 * @param {Array<{lat: number, lng: number, radius: number}>} noTagZones - Array of safe zones
 * @returns {boolean} True if location is in a no-tag zone
 */
export const isInNoTagZone = (location, noTagZones) => {
  if (!location || !noTagZones || noTagZones.length === 0) return false;

  return noTagZones.some(zone => {
    if (!zone.lat || !zone.lng || !zone.radius) return false;
    const distance = getDistance(location.lat, location.lng, zone.lat, zone.lng);
    return distance <= zone.radius;
  });
};

/**
 * Check if tagging is currently allowed based on game rules.
 * @param {Object} game - The game object with settings
 * @param {{lat: number, lng: number}} taggerLocation - Location of the tagger
 * @param {{lat: number, lng: number}} targetLocation - Location of the target
 * @returns {{allowed: boolean, reason: string|null}} Whether tagging is allowed and why not
 */
export const canTagNow = (game, taggerLocation, targetLocation) => {
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
};
