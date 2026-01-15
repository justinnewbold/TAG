/**
 * Location Update Batching Utility
 * Phase 1: Implements batching with max 1 update per 3 seconds
 */

class LocationBatcher {
  constructor(options = {}) {
    this.minInterval = options.minInterval || 3000; // 3 seconds minimum
    this.lastUpdate = 0;
    this.pendingLocation = null;
    this.timeoutId = null;
    this.onFlush = options.onFlush || (() => {});
    this.isEnabled = true;
  }

  /**
   * Add a location update to the batch
   * @param {Object} location - { lat, lng, accuracy }
   */
  add(location) {
    if (!this.isEnabled) {
      this.onFlush(location);
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdate;

    // If enough time has passed, send immediately
    if (timeSinceLastUpdate >= this.minInterval) {
      this.flush(location);
      return;
    }

    // Store as pending and schedule flush
    this.pendingLocation = location;

    if (!this.timeoutId) {
      const delay = this.minInterval - timeSinceLastUpdate;
      this.timeoutId = setTimeout(() => {
        if (this.pendingLocation) {
          this.flush(this.pendingLocation);
          this.pendingLocation = null;
        }
        this.timeoutId = null;
      }, delay);
    }
  }

  /**
   * Immediately flush the location update
   * @param {Object} location
   */
  flush(location) {
    this.lastUpdate = Date.now();
    this.onFlush(location);
  }

  /**
   * Force flush any pending update
   */
  forceFlush() {
    if (this.pendingLocation) {
      this.flush(this.pendingLocation);
      this.pendingLocation = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Enable or disable batching
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.forceFlush();
    }
  }

  /**
   * Update the minimum interval
   * @param {number} ms
   */
  setMinInterval(ms) {
    this.minInterval = Math.max(1000, ms); // Minimum 1 second
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pendingLocation = null;
  }
}

// Singleton instance for the app
let instance = null;

export function getLocationBatcher(options) {
  if (!instance) {
    instance = new LocationBatcher(options);
  }
  return instance;
}

export function resetLocationBatcher() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

export { LocationBatcher };
export default LocationBatcher;
