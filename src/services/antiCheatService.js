/**
 * Anti-Cheat Service
 * Phase 12: Client-side anti-cheat detection and reporting
 */

import { api } from './api';
import { socketService } from './socket';

// Violation types
export const ViolationType = {
  SPEED_HACK: 'speed_hack',
  TELEPORT: 'teleport',
  GPS_SPOOF: 'gps_spoof',
  TIME_MANIPULATION: 'time_manipulation',
  IMPOSSIBLE_ACTION: 'impossible_action',
  MODIFIED_CLIENT: 'modified_client',
};

// Severity levels
export const ViolationSeverity = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// Movement constraints
const CONSTRAINTS = {
  MAX_SPEED_KMH: 50, // Maximum realistic running speed
  MAX_TELEPORT_DISTANCE_M: 100, // Max distance between position updates
  MIN_UPDATE_INTERVAL_MS: 100, // Minimum time between updates
  MAX_ACCURACY_DRIFT: 50, // Max GPS accuracy change
  SUSPICIOUS_PERFECT_ACCURACY_COUNT: 5, // Too many perfect accuracy readings
};

class AntiCheatService {
  constructor() {
    this.violations = [];
    this.positionHistory = [];
    this.accuracyHistory = [];
    this.lastPosition = null;
    this.lastTimestamp = null;
    this.violationCallbacks = [];
    this.isEnabled = true;
    this.sessionStart = Date.now();
    this.perfectAccuracyCount = 0;
  }

  /**
   * Enable/disable anti-cheat
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Validate a position update
   */
  validatePosition(position, timestamp = Date.now()) {
    if (!this.isEnabled) return { valid: true };

    const validationResult = {
      valid: true,
      violations: [],
    };

    // Check for teleportation
    if (this.lastPosition) {
      const distance = this.calculateDistance(this.lastPosition, position);
      const timeDelta = timestamp - this.lastTimestamp;

      // Check for impossible speed
      if (timeDelta > 0) {
        const speedKmh = (distance / 1000) / (timeDelta / 3600000);

        if (speedKmh > CONSTRAINTS.MAX_SPEED_KMH) {
          validationResult.valid = false;
          validationResult.violations.push({
            type: ViolationType.SPEED_HACK,
            severity: speedKmh > 100 ? ViolationSeverity.CRITICAL : ViolationSeverity.HIGH,
            details: {
              speed: speedKmh,
              maxAllowed: CONSTRAINTS.MAX_SPEED_KMH,
              distance,
              timeDelta,
            },
          });
        }

        // Check for teleportation (large distance in short time)
        if (distance > CONSTRAINTS.MAX_TELEPORT_DISTANCE_M && timeDelta < 1000) {
          validationResult.valid = false;
          validationResult.violations.push({
            type: ViolationType.TELEPORT,
            severity: ViolationSeverity.CRITICAL,
            details: {
              distance,
              timeDelta,
              from: this.lastPosition,
              to: position,
            },
          });
        }
      }

      // Check for too-rapid updates
      if (timeDelta > 0 && timeDelta < CONSTRAINTS.MIN_UPDATE_INTERVAL_MS) {
        validationResult.violations.push({
          type: ViolationType.MODIFIED_CLIENT,
          severity: ViolationSeverity.LOW,
          details: {
            updateInterval: timeDelta,
            minAllowed: CONSTRAINTS.MIN_UPDATE_INTERVAL_MS,
          },
        });
      }
    }

    // Check for GPS spoofing indicators
    this.checkGpsSpoofing(position, validationResult);

    // Store position in history
    this.positionHistory.push({ ...position, timestamp });
    if (this.positionHistory.length > 100) {
      this.positionHistory.shift();
    }

    // Update last known position
    this.lastPosition = position;
    this.lastTimestamp = timestamp;

    // Report violations
    if (validationResult.violations.length > 0) {
      this.reportViolations(validationResult.violations);
    }

    return validationResult;
  }

  /**
   * Check for GPS spoofing patterns
   */
  checkGpsSpoofing(position, result) {
    // Check for suspiciously perfect accuracy
    if (position.accuracy && position.accuracy < 1) {
      this.perfectAccuracyCount++;
      if (this.perfectAccuracyCount >= CONSTRAINTS.SUSPICIOUS_PERFECT_ACCURACY_COUNT) {
        result.violations.push({
          type: ViolationType.GPS_SPOOF,
          severity: ViolationSeverity.MEDIUM,
          details: {
            reason: 'too_perfect_accuracy',
            consecutiveCount: this.perfectAccuracyCount,
          },
        });
      }
    } else {
      this.perfectAccuracyCount = 0;
    }

    // Check for unrealistic accuracy changes
    if (this.accuracyHistory.length > 0 && position.accuracy) {
      const lastAccuracy = this.accuracyHistory[this.accuracyHistory.length - 1];
      const accuracyDrift = Math.abs(position.accuracy - lastAccuracy);

      if (accuracyDrift > CONSTRAINTS.MAX_ACCURACY_DRIFT) {
        result.violations.push({
          type: ViolationType.GPS_SPOOF,
          severity: ViolationSeverity.LOW,
          details: {
            reason: 'sudden_accuracy_change',
            drift: accuracyDrift,
            from: lastAccuracy,
            to: position.accuracy,
          },
        });
      }
    }

    // Store accuracy
    if (position.accuracy) {
      this.accuracyHistory.push(position.accuracy);
      if (this.accuracyHistory.length > 20) {
        this.accuracyHistory.shift();
      }
    }

    // Check for static location with changing timestamp
    if (this.positionHistory.length >= 10) {
      const recentPositions = this.positionHistory.slice(-10);
      const allSame = recentPositions.every(p =>
        p.lat === position.lat && p.lng === position.lng
      );
      const allDifferentTimes = new Set(recentPositions.map(p => p.timestamp)).size === 10;

      if (allSame && allDifferentTimes) {
        result.violations.push({
          type: ViolationType.GPS_SPOOF,
          severity: ViolationSeverity.MEDIUM,
          details: {
            reason: 'static_location_pattern',
            position: { lat: position.lat, lng: position.lng },
          },
        });
      }
    }
  }

  /**
   * Validate a tag action
   */
  validateTag(taggerPosition, targetPosition, timestamp = Date.now()) {
    if (!this.isEnabled) return { valid: true };

    const validationResult = {
      valid: true,
      violations: [],
    };

    const distance = this.calculateDistance(taggerPosition, targetPosition);

    // Check if tag distance is reasonable (within 20 meters with some margin)
    if (distance > 50) {
      validationResult.valid = false;
      validationResult.violations.push({
        type: ViolationType.IMPOSSIBLE_ACTION,
        severity: ViolationSeverity.HIGH,
        details: {
          action: 'tag',
          distance,
          maxAllowed: 50,
        },
      });
    }

    if (validationResult.violations.length > 0) {
      this.reportViolations(validationResult.violations);
    }

    return validationResult;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(pos1, pos2) {
    const R = 6371000; // Earth's radius in meters
    const lat1 = pos1.lat * Math.PI / 180;
    const lat2 = pos2.lat * Math.PI / 180;
    const deltaLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const deltaLng = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Report violations to server
   */
  async reportViolations(violations) {
    // Store locally
    this.violations.push(...violations.map(v => ({
      ...v,
      timestamp: Date.now(),
      sessionId: this.sessionStart,
    })));

    // Notify callbacks
    for (const callback of this.violationCallbacks) {
      callback(violations);
    }

    // Report critical violations immediately
    const criticalViolations = violations.filter(
      v => v.severity >= ViolationSeverity.HIGH
    );

    if (criticalViolations.length > 0) {
      try {
        await api.request('/anticheat/report', {
          method: 'POST',
          body: JSON.stringify({
            violations: criticalViolations,
            sessionStart: this.sessionStart,
            positionHistory: this.positionHistory.slice(-20),
          }),
        });
      } catch (error) {
        console.error('Failed to report anti-cheat violations:', error);
      }
    }
  }

  /**
   * Register violation callback
   */
  onViolation(callback) {
    this.violationCallbacks.push(callback);
    return () => {
      const index = this.violationCallbacks.indexOf(callback);
      if (index > -1) this.violationCallbacks.splice(index, 1);
    };
  }

  /**
   * Get violation summary
   */
  getViolationSummary() {
    const summary = {
      total: this.violations.length,
      bySeverity: {},
      byType: {},
    };

    for (const violation of this.violations) {
      // By severity
      summary.bySeverity[violation.severity] =
        (summary.bySeverity[violation.severity] || 0) + 1;

      // By type
      summary.byType[violation.type] =
        (summary.byType[violation.type] || 0) + 1;
    }

    return summary;
  }

  /**
   * Check device integrity (basic checks)
   */
  checkDeviceIntegrity() {
    const issues = [];

    // Check for developer tools
    if (typeof window !== 'undefined') {
      const devToolsOpen = window.outerWidth - window.innerWidth > 160 ||
        window.outerHeight - window.innerHeight > 160;
      if (devToolsOpen) {
        issues.push({ type: 'dev_tools_detected', severity: ViolationSeverity.LOW });
      }
    }

    // Check for automation
    if (typeof navigator !== 'undefined') {
      if (navigator.webdriver) {
        issues.push({ type: 'automation_detected', severity: ViolationSeverity.MEDIUM });
      }
    }

    return issues;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Check device integrity periodically
    this.integrityInterval = setInterval(() => {
      const issues = this.checkDeviceIntegrity();
      if (issues.length > 0) {
        this.reportViolations(issues.map(i => ({
          type: ViolationType.MODIFIED_CLIENT,
          severity: i.severity,
          details: i,
        })));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.integrityInterval) {
      clearInterval(this.integrityInterval);
      this.integrityInterval = null;
    }
  }

  /**
   * Reset state (for new game session)
   */
  reset() {
    this.violations = [];
    this.positionHistory = [];
    this.accuracyHistory = [];
    this.lastPosition = null;
    this.lastTimestamp = null;
    this.perfectAccuracyCount = 0;
    this.sessionStart = Date.now();
  }
}

// Singleton instance
export const antiCheatService = new AntiCheatService();
export default antiCheatService;
