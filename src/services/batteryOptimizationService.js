/**
 * Battery Optimization Service
 * Adaptive GPS polling, stealth mode, background optimization
 */

// GPS polling modes
export const GPS_MODES = {
  HIGH_ACCURACY: {
    id: 'high_accuracy',
    name: 'High Accuracy',
    interval: 5000, // 5 seconds
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    batteryImpact: 'high',
    icon: '📍',
  },
  BALANCED: {
    id: 'balanced',
    name: 'Balanced',
    interval: 15000, // 15 seconds
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
    batteryImpact: 'medium',
    icon: '⚖️',
  },
  BATTERY_SAVER: {
    id: 'battery_saver',
    name: 'Battery Saver',
    interval: 30000, // 30 seconds
    enableHighAccuracy: false,
    timeout: 20000,
    maximumAge: 10000,
    batteryImpact: 'low',
    icon: '🔋',
  },
  STEALTH: {
    id: 'stealth',
    name: 'Stealth Mode',
    interval: 60000, // 1 minute
    enableHighAccuracy: false,
    timeout: 30000,
    maximumAge: 30000,
    batteryImpact: 'minimal',
    icon: '🤫',
  },
  ULTRA_SAVER: {
    id: 'ultra_saver',
    name: 'Ultra Saver',
    interval: 300000, // 5 minutes
    enableHighAccuracy: false,
    timeout: 60000,
    maximumAge: 60000,
    batteryImpact: 'minimal',
    icon: '🪫',
  },
};

// Game phases for adaptive polling
export const GAME_PHASES = {
  WAITING: 'waiting',
  ACTIVE_HUNTING: 'active_hunting',
  BEING_HUNTED: 'being_hunted',
  SAFE_ZONE: 'safe_zone',
  IDLE: 'idle',
  SPECTATING: 'spectating',
};

// Phase to GPS mode mapping
const PHASE_GPS_MAPPING = {
  [GAME_PHASES.WAITING]: GPS_MODES.BATTERY_SAVER,
  [GAME_PHASES.ACTIVE_HUNTING]: GPS_MODES.HIGH_ACCURACY,
  [GAME_PHASES.BEING_HUNTED]: GPS_MODES.HIGH_ACCURACY,
  [GAME_PHASES.SAFE_ZONE]: GPS_MODES.BATTERY_SAVER,
  [GAME_PHASES.IDLE]: GPS_MODES.STEALTH,
  [GAME_PHASES.SPECTATING]: GPS_MODES.ULTRA_SAVER,
};

class BatteryOptimizationService {
  constructor() {
    this.currentMode = GPS_MODES.BALANCED;
    this.currentPhase = GAME_PHASES.WAITING;
    this.isAdaptiveEnabled = true;
    this.isStealthMode = false;
    this.motionState = 'unknown';
    this.lastLocation = null;
    this.lastMotionTime = null;
    this.stationaryThreshold = 10; // meters
    this.stationaryTime = 0;
    this.watchId = null;
    this.motionWatchId = null;
    this.batteryLevel = null;
    this.isLowBattery = false;
    this.listeners = new Map();

    // Initialize battery monitoring
    this.initBatteryMonitoring();

    // Initialize motion detection
    this.initMotionDetection();
  }

  /**
   * Initialize battery monitoring
   */
  async initBatteryMonitoring() {
    if (!navigator.getBattery) return;

    try {
      const battery = await navigator.getBattery();

      this.batteryLevel = battery.level * 100;
      this.isLowBattery = this.batteryLevel < 20;

      battery.addEventListener('levelchange', () => {
        this.batteryLevel = battery.level * 100;
        this.isLowBattery = this.batteryLevel < 20;

        // Auto-switch to battery saver if low
        if (this.isLowBattery && this.isAdaptiveEnabled) {
          this.setMode(GPS_MODES.BATTERY_SAVER);
          this.emit('low_battery', { level: this.batteryLevel });
        }
      });
    } catch (error) {
      console.warn('Battery API not available:', error);
    }
  }

  /**
   * Initialize motion detection
   */
  initMotionDetection() {
    if (!window.DeviceMotionEvent) return;

    let lastAcceleration = null;
    let movementCount = 0;

    window.addEventListener('devicemotion', (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      if (lastAcceleration) {
        const delta = Math.abs(acc.x - lastAcceleration.x) +
          Math.abs(acc.y - lastAcceleration.y) +
          Math.abs(acc.z - lastAcceleration.z);

        // Movement threshold
        if (delta > 2) {
          movementCount++;
          this.lastMotionTime = Date.now();

          if (movementCount > 5 && this.motionState !== 'moving') {
            this.motionState = 'moving';
            this.handleMotionChange('moving');
          }
        } else {
          movementCount = Math.max(0, movementCount - 1);

          if (movementCount === 0 && this.motionState !== 'stationary') {
            const timeSinceMotion = Date.now() - (this.lastMotionTime || 0);
            if (timeSinceMotion > 30000) { // 30 seconds stationary
              this.motionState = 'stationary';
              this.handleMotionChange('stationary');
            }
          }
        }
      }

      lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };
    });
  }

  /**
   * Handle motion state change
   */
  handleMotionChange(newState) {
    this.emit('motion_change', { state: newState });

    if (this.isAdaptiveEnabled && this.isStealthMode) {
      if (newState === 'stationary') {
        // Reduce GPS polling when stationary
        this.setMode(GPS_MODES.STEALTH);
      } else {
        // Increase polling when moving
        this.setMode(this.getRecommendedMode());
      }
    }
  }

  /**
   * Set current GPS mode
   */
  setMode(mode) {
    const oldMode = this.currentMode;
    this.currentMode = mode;

    if (oldMode.id !== mode.id) {
      this.emit('mode_change', { oldMode, newMode: mode });

      // Restart GPS watching if active
      if (this.watchId !== null) {
        this.restartGPSWatch();
      }
    }
  }

  /**
   * Set game phase (for adaptive polling)
   */
  setGamePhase(phase) {
    this.currentPhase = phase;

    if (this.isAdaptiveEnabled) {
      const recommendedMode = PHASE_GPS_MAPPING[phase] || GPS_MODES.BALANCED;
      this.setMode(recommendedMode);
    }
  }

  /**
   * Enable/disable adaptive GPS
   */
  setAdaptiveEnabled(enabled) {
    this.isAdaptiveEnabled = enabled;

    if (enabled) {
      this.setMode(this.getRecommendedMode());
    }
  }

  /**
   * Enable/disable stealth mode
   */
  setStealthMode(enabled) {
    this.isStealthMode = enabled;

    if (enabled) {
      this.setMode(GPS_MODES.STEALTH);
    } else {
      this.setMode(this.getRecommendedMode());
    }
  }

  /**
   * Get recommended GPS mode based on current context
   */
  getRecommendedMode() {
    // Low battery override
    if (this.isLowBattery) {
      return GPS_MODES.BATTERY_SAVER;
    }

    // Stealth mode override
    if (this.isStealthMode) {
      return GPS_MODES.STEALTH;
    }

    // Stationary optimization
    if (this.motionState === 'stationary') {
      return GPS_MODES.BATTERY_SAVER;
    }

    // Phase-based recommendation
    return PHASE_GPS_MAPPING[this.currentPhase] || GPS_MODES.BALANCED;
  }

  /**
   * Start GPS watching with current mode settings
   */
  startGPSWatch(callback) {
    if (this.watchId !== null) {
      this.stopGPSWatch();
    }

    const options = {
      enableHighAccuracy: this.currentMode.enableHighAccuracy,
      timeout: this.currentMode.timeout,
      maximumAge: this.currentMode.maximumAge,
    };

    // Use interval-based polling for battery optimization
    let lastUpdate = 0;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();

        // Throttle updates based on current mode interval
        if (now - lastUpdate < this.currentMode.interval) {
          return;
        }

        lastUpdate = now;

        // Check if moved significantly
        const moved = this.checkSignificantMovement(position);

        // Update stationary time
        if (!moved) {
          this.stationaryTime += this.currentMode.interval;
        } else {
          this.stationaryTime = 0;
        }

        this.lastLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: now,
        };

        callback(position, { moved, stationaryTime: this.stationaryTime });
      },
      (error) => {
        console.error('GPS watch error:', error);
        this.emit('gps_error', error);
      },
      options
    );

    this.emit('gps_watch_start', { mode: this.currentMode });
  }

  /**
   * Stop GPS watching
   */
  stopGPSWatch() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.emit('gps_watch_stop', {});
    }
  }

  /**
   * Restart GPS watching (e.g., after mode change)
   */
  restartGPSWatch() {
    const callback = this._lastCallback;
    this.stopGPSWatch();
    if (callback) {
      this.startGPSWatch(callback);
    }
  }

  /**
   * Check if position changed significantly
   */
  checkSignificantMovement(position) {
    if (!this.lastLocation) return true;

    const distance = this.calculateDistance(
      this.lastLocation.lat,
      this.lastLocation.lng,
      position.coords.latitude,
      position.coords.longitude
    );

    return distance > this.stationaryThreshold;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get current battery stats
   */
  getBatteryStats() {
    return {
      level: this.batteryLevel,
      isLow: this.isLowBattery,
      currentMode: this.currentMode,
      estimatedDrain: this.estimateBatteryDrain(),
    };
  }

  /**
   * Estimate battery drain per hour
   */
  estimateBatteryDrain() {
    // Rough estimates based on GPS usage
    const drainRates = {
      [GPS_MODES.HIGH_ACCURACY.id]: 15, // 15% per hour
      [GPS_MODES.BALANCED.id]: 8, // 8% per hour
      [GPS_MODES.BATTERY_SAVER.id]: 4, // 4% per hour
      [GPS_MODES.STEALTH.id]: 2, // 2% per hour
      [GPS_MODES.ULTRA_SAVER.id]: 1, // 1% per hour
    };

    return drainRates[this.currentMode.id] || 5;
  }

  /**
   * Get all available modes
   */
  getAvailableModes() {
    return Object.values(GPS_MODES);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      currentMode: this.currentMode,
      currentPhase: this.currentPhase,
      isAdaptiveEnabled: this.isAdaptiveEnabled,
      isStealthMode: this.isStealthMode,
      motionState: this.motionState,
      stationaryTime: this.stationaryTime,
      batteryLevel: this.batteryLevel,
      isLowBattery: this.isLowBattery,
      isWatching: this.watchId !== null,
    };
  }

  // ============ EVENT EMITTER ============

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopGPSWatch();
  }
}

// Singleton
export const batteryOptimizationService = new BatteryOptimizationService();
export default batteryOptimizationService;
