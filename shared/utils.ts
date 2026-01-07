/**
 * Shared utility functions used by both client and server
 */

import type { Location, TimeRule, NoTagZone, GameSettings } from './validation';

// ============================================
// Types
// ============================================

export interface LocationWithTimestamp extends Location {
  timestamp: number;
}

export interface SpeedValidation {
  valid: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface TagPermission {
  allowed: boolean;
  reason: string | null;
}

// ============================================
// Distance & Location Calculations
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
 * @param loc1 - First location with timestamp
 * @param loc2 - Second location with timestamp
 * @returns Speed in meters per second
 */
export function calculateSpeed(loc1: LocationWithTimestamp | null, loc2: LocationWithTimestamp | null): number {
  if (!loc1 || !loc2 || !loc1.timestamp || !loc2.timestamp) return 0;

  const distance = getDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  const timeMs = Math.abs(loc2.timestamp - loc1.timestamp);

  if (timeMs === 0) return 0;

  return distance / (timeMs / 1000); // meters per second
}

// ============================================
// Anti-Cheat Validation
// ============================================

// Speed limits in meters per second
const MAX_RUNNING_SPEED = 15;     // ~54 km/h (allows for GPS drift)
const MAX_VEHICLE_SPEED = 35;    // ~126 km/h
const TELEPORT_THRESHOLD = 100;  // 100 m/s = 360 km/h

/**
 * Check if a speed is humanly possible (anti-cheat)
 * @param speedMps - Speed in meters per second
 * @returns Validation result with severity
 */
export function isValidSpeed(speedMps: number): SpeedValidation {
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

// ============================================
// Time Formatting
// ============================================

/**
 * Format milliseconds as MM:SS
 * @param ms - Milliseconds
 * @returns Formatted time string
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds as human readable interval
 * @param ms - Milliseconds
 * @returns Formatted interval string (e.g., "5m", "2h", "1d")
 */
export function formatInterval(ms: number): string {
  if (ms < 60 * 1000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))}m`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))}h`;
  return `${Math.floor(ms / (24 * 60 * 60 * 1000))}d`;
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique ID
 * @returns Random ID string
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generate a 6-character game code
 * @returns Uppercase alphanumeric game code
 */
export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================
// Function Utilities
// ============================================

/**
 * Throttle function execution
 * @param func - Function to throttle
 * @param limit - Minimum milliseconds between calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;
  return function(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return func.apply(this, args) as ReturnType<T>;
    }
    return undefined;
  };
}

/**
 * Debounce function execution
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function(this: unknown, ...args: Parameters<T>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================
// Game Rule Validation
// ============================================

/**
 * Check if current time is in a no-tag period
 * @param noTagTimes - Array of no-tag time rules
 * @returns True if currently in a no-tag period
 */
export function isInNoTagTime(noTagTimes: TimeRule[] | undefined | null): boolean {
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
 * @param location - Location with lat and lng properties
 * @param noTagZones - Array of no-tag zones with lat, lng, radius
 * @returns True if location is in a no-tag zone
 */
export function isInNoTagZone(
  location: Location | undefined | null,
  noTagZones: NoTagZone[] | undefined | null
): boolean {
  if (!location || !noTagZones || noTagZones.length === 0) return false;

  return noTagZones.some(zone => {
    const distance = getDistance(location.lat, location.lng, zone.lat, zone.lng);
    return distance <= zone.radius;
  });
}

/**
 * Game object interface for canTagNow
 */
interface GameWithSettings {
  settings?: GameSettings;
}

/**
 * Check if tagging is currently allowed based on game rules
 * @param game - Game object with settings
 * @param taggerLocation - Tagger's location
 * @param targetLocation - Target's location
 * @returns Permission result with reason
 */
export function canTagNow(
  game: GameWithSettings | undefined | null,
  taggerLocation: Location | undefined | null,
  targetLocation: Location | undefined | null
): TagPermission {
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
