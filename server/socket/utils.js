/**
 * Socket utility classes for rate limiting and anti-cheat
 */

import { calculateSpeed, isValidSpeed } from '../../shared/utils.js';

/**
 * Rate limiter for socket events
 * Tracks event counts per user and enforces limits
 */
export class RateLimiter {
  constructor() {
    this.events = new Map(); // userId -> { eventType -> { count, resetTime } }
  }

  check(userId, eventType, limit) {
    const now = Date.now();
    const userEvents = this.events.get(userId) || new Map();
    const eventData = userEvents.get(eventType) || { count: 0, resetTime: now + 60000 };

    // Reset if minute has passed
    if (now > eventData.resetTime) {
      eventData.count = 0;
      eventData.resetTime = now + 60000;
    }

    eventData.count++;
    userEvents.set(eventType, eventData);
    this.events.set(userId, userEvents);

    return eventData.count <= limit;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [userId, userEvents] of this.events) {
      for (const [eventType, data] of userEvents) {
        if (now > data.resetTime + 60000) {
          userEvents.delete(eventType);
        }
      }
      if (userEvents.size === 0) {
        this.events.delete(userId);
      }
    }
  }
}

/**
 * Anti-cheat: track player location history
 * Detects teleportation and speed hacks
 */
export class LocationTracker {
  constructor() {
    this.history = new Map(); // playerId -> { lat, lng, timestamp }
    this.violations = new Map(); // playerId -> { count, lastViolation }
  }

  update(playerId, location) {
    const now = Date.now();
    const previous = this.history.get(playerId);
    let cheatCheck = { valid: true };

    if (previous && previous.timestamp) {
      const speed = calculateSpeed(
        { ...previous, timestamp: previous.timestamp },
        { ...location, timestamp: now }
      );

      cheatCheck = isValidSpeed(speed);

      if (!cheatCheck.valid) {
        // Track violations
        const violations = this.violations.get(playerId) || { count: 0, lastViolation: 0 };
        violations.count++;
        violations.lastViolation = now;
        this.violations.set(playerId, violations);

        console.warn(`[AntiCheat] Player ${playerId}: ${cheatCheck.reason} (speed: ${speed.toFixed(1)} m/s, violations: ${violations.count})`);
      }
    }

    // Store current location for next check
    this.history.set(playerId, { ...location, timestamp: now });

    return cheatCheck;
  }

  getViolationCount(playerId) {
    return this.violations.get(playerId)?.count || 0;
  }

  // Check if player should be flagged for cheating
  shouldFlag(playerId) {
    const violations = this.violations.get(playerId);
    if (!violations) return false;
    // Flag if 5+ violations in last 5 minutes
    return violations.count >= 5 && (Date.now() - violations.lastViolation < 300000);
  }
}

// Global instances
export const rateLimiter = new RateLimiter();
export const locationTracker = new LocationTracker();

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);
