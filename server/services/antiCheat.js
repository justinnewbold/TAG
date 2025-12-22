// Anti-cheat Server-side Validation
// Validates player movements and actions for cheating detection

const SPEED_LIMIT_MPS = 15; // ~54 km/h - reasonable max running/biking speed
const TELEPORT_THRESHOLD_M = 100; // Max distance in 1 second
const MIN_UPDATE_INTERVAL_MS = 500; // Minimum time between updates
const MAX_ACCURACY_DEVIATION = 50; // Max GPS accuracy in meters
const SUSPICIOUS_THRESHOLD = 5; // Number of violations before flagging

class AntiCheat {
  constructor() {
    // Track player location history for validation
    this.playerHistory = new Map(); // playerId -> { locations: [], violations: [], lastUpdate: Date }
    this.flaggedPlayers = new Set();
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Validate a location update
  validateLocation(playerId, location, gameId) {
    const now = Date.now();
    const result = {
      valid: true,
      violations: [],
      isFlagged: false
    };

    // Get or create player history
    if (!this.playerHistory.has(playerId)) {
      this.playerHistory.set(playerId, {
        locations: [],
        violations: [],
        lastUpdate: null,
        gameId
      });
    }

    const history = this.playerHistory.get(playerId);
    
    // Check if same game
    if (history.gameId !== gameId) {
      // Player joined new game, reset history
      history.locations = [];
      history.violations = [];
      history.gameId = gameId;
    }

    // Validate location data structure
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      result.valid = false;
      result.violations.push({ type: 'invalid_data', message: 'Missing or invalid location data' });
      return result;
    }

    // Validate coordinate bounds
    if (location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
      result.valid = false;
      result.violations.push({ type: 'invalid_coords', message: 'Coordinates out of bounds' });
      return result;
    }

    // Check update frequency
    if (history.lastUpdate) {
      const timeSinceLastUpdate = now - history.lastUpdate;
      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL_MS) {
        result.violations.push({ 
          type: 'rapid_updates', 
          message: `Updates too frequent: ${timeSinceLastUpdate}ms`,
          severity: 'low'
        });
      }
    }

    // Check GPS accuracy if provided
    if (location.accuracy && location.accuracy > MAX_ACCURACY_DEVIATION) {
      result.violations.push({ 
        type: 'poor_accuracy', 
        message: `GPS accuracy too poor: ${location.accuracy}m`,
        severity: 'info'
      });
    }

    // Check for speed hacks / teleportation
    if (history.locations.length > 0) {
      const lastLocation = history.locations[history.locations.length - 1];
      const timeDelta = (now - lastLocation.timestamp) / 1000; // seconds
      
      if (timeDelta > 0) {
        const distance = this.calculateDistance(
          lastLocation.lat, lastLocation.lng,
          location.lat, location.lng
        );
        const speed = distance / timeDelta; // meters per second
        
        // Check for teleportation (instant large distance)
        if (timeDelta < 2 && distance > TELEPORT_THRESHOLD_M) {
          result.violations.push({
            type: 'teleport',
            message: `Suspicious teleport: ${Math.round(distance)}m in ${timeDelta.toFixed(1)}s`,
            severity: 'high',
            distance,
            timeDelta
          });
        }
        // Check for speed hacks
        else if (speed > SPEED_LIMIT_MPS) {
          result.violations.push({
            type: 'speed_hack',
            message: `Impossible speed: ${(speed * 3.6).toFixed(1)} km/h`,
            severity: 'medium',
            speed: speed * 3.6, // km/h
            distance,
            timeDelta
          });
        }
      }
    }

    // Check for GPS spoofing patterns
    if (history.locations.length >= 5) {
      // Check for perfectly linear movement (bot-like)
      const recentLocations = history.locations.slice(-5);
      if (this.isLinearMovement(recentLocations, location)) {
        result.violations.push({
          type: 'linear_movement',
          message: 'Suspiciously linear movement pattern detected',
          severity: 'medium'
        });
      }
      
      // Check for repeated coordinates (mock location)
      const exactMatches = recentLocations.filter(
        l => l.lat === location.lat && l.lng === location.lng
      ).length;
      if (exactMatches >= 3) {
        result.violations.push({
          type: 'static_location',
          message: 'Location not changing (possible mock location)',
          severity: 'low'
        });
      }
    }

    // Record violations
    const highSeverityViolations = result.violations.filter(
      v => v.severity === 'high' || v.severity === 'medium'
    );
    
    if (highSeverityViolations.length > 0) {
      history.violations.push(...highSeverityViolations.map(v => ({
        ...v,
        timestamp: now,
        location
      })));
    }

    // Check if player should be flagged
    const recentViolations = history.violations.filter(
      v => now - v.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );
    
    if (recentViolations.length >= SUSPICIOUS_THRESHOLD) {
      this.flaggedPlayers.add(playerId);
      result.isFlagged = true;
    }

    // Store location in history (keep last 100)
    history.locations.push({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: now
    });
    if (history.locations.length > 100) {
      history.locations.shift();
    }
    history.lastUpdate = now;

    return result;
  }

  // Check if movement is suspiciously linear (bot behavior)
  isLinearMovement(recentLocations, newLocation) {
    if (recentLocations.length < 3) return false;
    
    // Calculate angle consistency
    let angleSum = 0;
    let angleCount = 0;
    
    for (let i = 1; i < recentLocations.length; i++) {
      const prev = recentLocations[i - 1];
      const curr = recentLocations[i];
      const angle = Math.atan2(curr.lng - prev.lng, curr.lat - prev.lat);
      
      if (i > 1) {
        const prevAngle = Math.atan2(
          recentLocations[i - 1].lng - recentLocations[i - 2].lng,
          recentLocations[i - 1].lat - recentLocations[i - 2].lat
        );
        angleSum += Math.abs(angle - prevAngle);
        angleCount++;
      }
    }
    
    // If angle variance is very low, movement is suspiciously linear
    const avgAngleChange = angleCount > 0 ? angleSum / angleCount : 0;
    return avgAngleChange < 0.01; // ~0.5 degrees
  }

  // Validate a tag action
  validateTag(taggerId, targetId, taggerLocation, targetLocation, tagRadius) {
    const result = {
      valid: true,
      violations: [],
      actualDistance: 0
    };

    if (!taggerLocation || !targetLocation) {
      result.valid = false;
      result.violations.push({ type: 'missing_location', message: 'Location data missing' });
      return result;
    }

    // Calculate actual distance
    const distance = this.calculateDistance(
      taggerLocation.lat, taggerLocation.lng,
      targetLocation.lat, targetLocation.lng
    );
    result.actualDistance = distance;

    // Check if within tag radius (with small buffer for latency)
    const allowedRadius = tagRadius * 1.2; // 20% buffer for network latency
    
    if (distance > allowedRadius) {
      result.valid = false;
      result.violations.push({
        type: 'distance_hack',
        message: `Tag distance ${Math.round(distance)}m exceeds radius ${tagRadius}m`,
        severity: 'high',
        distance,
        allowedRadius
      });
    }

    // Check if tagger is flagged
    if (this.flaggedPlayers.has(taggerId)) {
      result.violations.push({
        type: 'flagged_player',
        message: 'Player is flagged for suspicious activity',
        severity: 'info'
      });
    }

    return result;
  }

  // Validate powerup usage
  validatePowerup(playerId, powerupId, gameStartTime) {
    const result = { valid: true, violations: [] };
    
    // Check if player is flagged
    if (this.flaggedPlayers.has(playerId)) {
      result.violations.push({
        type: 'flagged_player',
        message: 'Flagged players cannot use powerups',
        severity: 'high'
      });
      result.valid = false;
    }

    return result;
  }

  // Get player violation history
  getPlayerViolations(playerId) {
    const history = this.playerHistory.get(playerId);
    if (!history) return [];
    return history.violations;
  }

  // Check if player is flagged
  isPlayerFlagged(playerId) {
    return this.flaggedPlayers.has(playerId);
  }

  // Clear player history (when leaving game)
  clearPlayerHistory(playerId) {
    this.playerHistory.delete(playerId);
  }

  // Unflag a player (admin action)
  unflagPlayer(playerId) {
    this.flaggedPlayers.delete(playerId);
    const history = this.playerHistory.get(playerId);
    if (history) {
      history.violations = [];
    }
  }

  // Get all flagged players
  getFlaggedPlayers() {
    return Array.from(this.flaggedPlayers);
  }

  // Get statistics
  getStats() {
    return {
      trackedPlayers: this.playerHistory.size,
      flaggedPlayers: this.flaggedPlayers.size,
      flaggedList: Array.from(this.flaggedPlayers)
    };
  }

  // Cleanup old data periodically
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [playerId, history] of this.playerHistory.entries()) {
      if (history.lastUpdate && now - history.lastUpdate > maxAge) {
        this.playerHistory.delete(playerId);
      }
    }
  }
}

export const antiCheat = new AntiCheat();

// Cleanup old data every 10 minutes
setInterval(() => antiCheat.cleanup(), 10 * 60 * 1000);
