// Anti-Cheat Service
// Detects GPS spoofing, teleportation, and other cheating behaviors

const MAX_SPEED_MPS = 15; // Maximum human running speed ~15 m/s (54 km/h)
const TELEPORT_THRESHOLD = 500; // 500 meters in 1 second = teleport
const SUSPICIOUS_ACCURACY_THRESHOLD = 0.5; // GPS accuracy below 0.5m is suspicious
const MIN_LOCATION_VARIANCE = 0.00001; // Minimum expected GPS variance

class AntiCheatService {
  constructor() {
    this.locationHistory = [];
    this.violations = [];
    this.suspicionScore = 0;
    this.maxHistoryLength = 100;
  }

  // Record a new location and check for cheating
  checkLocation(location, timestamp = Date.now()) {
    const result = {
      valid: true,
      violations: [],
      suspicionScore: this.suspicionScore,
    };

    if (this.locationHistory.length > 0) {
      const lastLocation = this.locationHistory[this.locationHistory.length - 1];
      const timeDelta = (timestamp - lastLocation.timestamp) / 1000; // seconds

      if (timeDelta > 0) {
        const distance = this.getDistance(
          lastLocation.lat, lastLocation.lng,
          location.lat, location.lng
        );
        const speed = distance / timeDelta;

        // Check for teleportation
        if (distance > TELEPORT_THRESHOLD && timeDelta < 5) {
          result.violations.push({
            type: 'TELEPORT',
            severity: 'high',
            message: `Moved ${Math.round(distance)}m in ${timeDelta.toFixed(1)}s`,
            distance,
            timeDelta,
          });
          this.suspicionScore += 50;
          result.valid = false;
        }
        // Check for impossible speed
        else if (speed > MAX_SPEED_MPS) {
          result.violations.push({
            type: 'SPEED_HACK',
            severity: 'medium',
            message: `Speed: ${(speed * 3.6).toFixed(1)} km/h exceeds maximum`,
            speed: speed * 3.6,
          });
          this.suspicionScore += 20;
        }
      }
    }

    // Check for suspicious GPS accuracy
    if (location.accuracy !== undefined && location.accuracy < SUSPICIOUS_ACCURACY_THRESHOLD) {
      result.violations.push({
        type: 'FAKE_GPS',
        severity: 'low',
        message: `GPS accuracy (${location.accuracy}m) is suspiciously high`,
        accuracy: location.accuracy,
      });
      this.suspicionScore += 5;
    }

    // Check for lack of GPS variance (mock locations often have exact same coords)
    if (this.locationHistory.length >= 5) {
      const recent = this.locationHistory.slice(-5);
      const variance = this.calculateVariance(recent);
      
      if (variance < MIN_LOCATION_VARIANCE && this.locationHistory.length > 10) {
        result.violations.push({
          type: 'STATIC_LOCATION',
          severity: 'low',
          message: 'Location has not varied naturally',
          variance,
        });
        this.suspicionScore += 3;
      }
    }

    // Check for mock location provider (if available)
    if (location.isMock === true) {
      result.violations.push({
        type: 'MOCK_PROVIDER',
        severity: 'high',
        message: 'Mock location provider detected',
      });
      this.suspicionScore += 100;
      result.valid = false;
    }

    // Add to history
    this.locationHistory.push({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp,
    });

    // Trim history
    if (this.locationHistory.length > this.maxHistoryLength) {
      this.locationHistory.shift();
    }

    // Decay suspicion score over time
    this.suspicionScore = Math.max(0, this.suspicionScore - 0.1);

    // Store violations
    if (result.violations.length > 0) {
      this.violations.push({
        timestamp,
        violations: result.violations,
      });
    }

    result.suspicionScore = this.suspicionScore;
    return result;
  }

  // Calculate distance between two points in meters
  getDistance(lat1, lng1, lat2, lng2) {
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

  // Calculate variance in location data
  calculateVariance(locations) {
    if (locations.length < 2) return 0;

    const lats = locations.map(l => l.lat);
    const lngs = locations.map(l => l.lng);

    const latMean = lats.reduce((a, b) => a + b, 0) / lats.length;
    const lngMean = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    const latVariance = lats.reduce((sum, lat) => sum + Math.pow(lat - latMean, 2), 0) / lats.length;
    const lngVariance = lngs.reduce((sum, lng) => sum + Math.pow(lng - lngMean, 2), 0) / lngs.length;

    return Math.sqrt(latVariance + lngVariance);
  }

  // Get current suspicion level
  getSuspicionLevel() {
    if (this.suspicionScore >= 100) return 'banned';
    if (this.suspicionScore >= 50) return 'high';
    if (this.suspicionScore >= 20) return 'medium';
    if (this.suspicionScore >= 5) return 'low';
    return 'clean';
  }

  // Check if player should be flagged
  isFlagged() {
    return this.suspicionScore >= 20;
  }

  // Check if player should be blocked from tagging
  isBlocked() {
    return this.suspicionScore >= 50;
  }

  // Get violation report
  getViolationReport() {
    return {
      suspicionScore: this.suspicionScore,
      suspicionLevel: this.getSuspicionLevel(),
      totalViolations: this.violations.length,
      recentViolations: this.violations.slice(-10),
      locationHistoryLength: this.locationHistory.length,
    };
  }

  // Reset (for new game)
  reset() {
    this.locationHistory = [];
    this.violations = [];
    this.suspicionScore = 0;
  }

  // Verify a tag attempt
  verifyTag(taggerLocation, targetLocation, maxDistance = 20) {
    const result = {
      valid: true,
      reason: null,
    };

    // Check if tagger is blocked due to cheating
    if (this.isBlocked()) {
      result.valid = false;
      result.reason = 'Account flagged for suspicious activity';
      return result;
    }

    // Verify distance
    const distance = this.getDistance(
      taggerLocation.lat, taggerLocation.lng,
      targetLocation.lat, targetLocation.lng
    );

    if (distance > maxDistance) {
      result.valid = false;
      result.reason = `Target is ${Math.round(distance)}m away (max: ${maxDistance}m)`;
      return result;
    }

    return result;
  }
}

// Singleton instance
export const antiCheat = new AntiCheatService();

// Export class for testing
export { AntiCheatService };
