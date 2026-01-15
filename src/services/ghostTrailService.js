/**
 * Ghost Trail Service
 *
 * Instead of showing real-time locations, IT sees where players were 30-60 seconds ago.
 * Players leave a fading "ghost trail" showing their recent movement path.
 * Creates cat-and-mouse tension - you might pass each other without knowing!
 */

class GhostTrailService {
  constructor() {
    // Location history for each player { playerId: [{ lat, lng, timestamp }, ...] }
    this.locationHistory = new Map();

    // Configuration
    this.config = {
      // How far back to delay location (ms)
      delayTime: 45000, // 45 seconds default

      // How long to keep trail points (ms)
      trailDuration: 120000, // 2 minutes

      // Maximum trail points per player
      maxTrailPoints: 50,

      // Trail fade segments (for visual gradient)
      fadeSegments: 5,

      // Minimum distance between trail points (meters) to avoid clutter
      minPointDistance: 5,
    };

    // Cleanup interval
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Record a player's location
   */
  recordLocation(playerId, location) {
    if (!location?.lat || !location?.lng) return;

    const history = this.locationHistory.get(playerId) || [];
    const now = Date.now();

    // Check minimum distance from last point
    if (history.length > 0) {
      const lastPoint = history[history.length - 1];
      const distance = this.calculateDistance(
        lastPoint.lat,
        lastPoint.lng,
        location.lat,
        location.lng
      );

      if (distance < this.config.minPointDistance) {
        return; // Too close, skip this point
      }
    }

    // Add new point
    history.push({
      lat: location.lat,
      lng: location.lng,
      timestamp: now,
      accuracy: location.accuracy,
    });

    // Trim to max points
    if (history.length > this.config.maxTrailPoints) {
      history.shift();
    }

    this.locationHistory.set(playerId, history);
  }

  /**
   * Get delayed location for a player (what IT sees)
   */
  getDelayedLocation(playerId, delayOverride = null) {
    const history = this.locationHistory.get(playerId);
    if (!history || history.length === 0) return null;

    const delay = delayOverride ?? this.config.delayTime;
    const targetTime = Date.now() - delay;

    // Find the location closest to the target time
    let closestPoint = null;
    let closestDiff = Infinity;

    for (const point of history) {
      const diff = Math.abs(point.timestamp - targetTime);
      if (diff < closestDiff && point.timestamp <= targetTime) {
        closestDiff = diff;
        closestPoint = point;
      }
    }

    // If no point is old enough, return oldest available
    if (!closestPoint && history.length > 0) {
      closestPoint = history[0];
    }

    return closestPoint
      ? {
          lat: closestPoint.lat,
          lng: closestPoint.lng,
          timestamp: closestPoint.timestamp,
          age: Date.now() - closestPoint.timestamp,
          isDelayed: true,
        }
      : null;
  }

  /**
   * Get the ghost trail for a player (for map visualization)
   */
  getTrail(playerId) {
    const history = this.locationHistory.get(playerId);
    if (!history || history.length < 2) return [];

    const now = Date.now();
    const trailDuration = this.config.trailDuration;

    // Filter to recent points and add opacity based on age
    return history
      .filter((point) => now - point.timestamp <= trailDuration)
      .map((point) => {
        const age = now - point.timestamp;
        const opacity = Math.max(0.1, 1 - age / trailDuration);

        return {
          lat: point.lat,
          lng: point.lng,
          opacity,
          age,
          fadeSegment: this.getFadeSegment(age, trailDuration),
        };
      });
  }

  /**
   * Get trail as line segments for map rendering
   */
  getTrailSegments(playerId) {
    const trail = this.getTrail(playerId);
    if (trail.length < 2) return [];

    const segments = [];
    for (let i = 1; i < trail.length; i++) {
      segments.push({
        from: { lat: trail[i - 1].lat, lng: trail[i - 1].lng },
        to: { lat: trail[i].lat, lng: trail[i].lng },
        opacity: (trail[i - 1].opacity + trail[i].opacity) / 2,
        fadeSegment: trail[i].fadeSegment,
      });
    }

    return segments;
  }

  /**
   * Get fade segment (0-4) for color gradient
   */
  getFadeSegment(age, duration) {
    const ratio = age / duration;
    return Math.min(
      this.config.fadeSegments - 1,
      Math.floor(ratio * this.config.fadeSegments)
    );
  }

  /**
   * Get predicted location (where player might be heading)
   */
  getPredictedLocation(playerId, predictionTime = 10000) {
    const history = this.locationHistory.get(playerId);
    if (!history || history.length < 2) return null;

    // Get last two points
    const recent = history.slice(-3);
    if (recent.length < 2) return null;

    // Calculate velocity
    const p1 = recent[recent.length - 2];
    const p2 = recent[recent.length - 1];
    const timeDiff = (p2.timestamp - p1.timestamp) / 1000; // seconds

    if (timeDiff === 0) return null;

    const latVelocity = (p2.lat - p1.lat) / timeDiff;
    const lngVelocity = (p2.lng - p1.lng) / timeDiff;

    // Predict position
    const predictionSeconds = predictionTime / 1000;

    return {
      lat: p2.lat + latVelocity * predictionSeconds,
      lng: p2.lng + lngVelocity * predictionSeconds,
      confidence: Math.max(0.2, 1 - predictionSeconds / 60), // Less confident further out
      isPredicted: true,
    };
  }

  /**
   * Get movement direction and speed
   */
  getMovementInfo(playerId) {
    const history = this.locationHistory.get(playerId);
    if (!history || history.length < 2) return null;

    const p1 = history[history.length - 2];
    const p2 = history[history.length - 1];
    const timeDiff = (p2.timestamp - p1.timestamp) / 1000;

    if (timeDiff === 0) return null;

    const distance = this.calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const speed = distance / timeDiff; // m/s

    // Calculate bearing
    const bearing = this.calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

    return {
      speed, // m/s
      speedKmh: speed * 3.6,
      bearing, // degrees
      direction: this.bearingToDirection(bearing),
      isMoving: speed > 0.5, // More than 0.5 m/s
    };
  }

  /**
   * Calculate distance between two points (meters)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = this.toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(this.toRad(lat2));
    const x =
      Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
      Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLng);
    return ((this.toDeg(Math.atan2(y, x)) + 360) % 360);
  }

  /**
   * Convert bearing to compass direction
   */
  bearingToDirection(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  /**
   * Set delay time configuration
   */
  setDelayTime(ms) {
    this.config.delayTime = Math.max(0, Math.min(ms, 120000)); // 0-2 minutes
  }

  /**
   * Clear history for a player
   */
  clearPlayer(playerId) {
    this.locationHistory.delete(playerId);
  }

  /**
   * Clear all history
   */
  clearAll() {
    this.locationHistory.clear();
  }

  /**
   * Start periodic cleanup of old data
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.trailDuration + this.config.delayTime;

      for (const [playerId, history] of this.locationHistory) {
        const filtered = history.filter(
          (point) => now - point.timestamp <= maxAge
        );

        if (filtered.length === 0) {
          this.locationHistory.delete(playerId);
        } else {
          this.locationHistory.set(playerId, filtered);
        }
      }
    }, 30000); // Cleanup every 30 seconds
  }

  /**
   * Stop cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

export const ghostTrailService = new GhostTrailService();
export default ghostTrailService;
