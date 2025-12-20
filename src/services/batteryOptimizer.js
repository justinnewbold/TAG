// Battery Optimization Service
// Manages GPS polling intervals and accuracy to save battery

class BatteryOptimizer {
  constructor() {
    this.batteryLevel = null;
    this.isCharging = false;
    this.currentMode = 'balanced'; // 'power-save', 'balanced', 'high-accuracy'
    this.watchId = null;
    this.lastPosition = null;
    this.onPositionUpdate = null;
    this.intervalId = null;
    
    // Mode configurations
    this.modes = {
      'power-save': {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000, // Cache for 1 minute
        pollInterval: 30000, // Poll every 30 seconds
        minDistance: 50, // Only update if moved 50m
        description: 'Battery saver mode - less accurate, longer battery',
      },
      'balanced': {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000, // Cache for 10 seconds
        pollInterval: 10000, // Poll every 10 seconds
        minDistance: 10, // Update if moved 10m
        description: 'Balanced mode - good accuracy, reasonable battery',
      },
      'high-accuracy': {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0, // Never use cache
        pollInterval: 3000, // Poll every 3 seconds
        minDistance: 0, // Always update
        description: 'High accuracy mode - best accuracy, uses more battery',
      },
    };
    
    this.initBatteryMonitor();
  }

  async initBatteryMonitor() {
    // Check if Battery API is available
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;
        
        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.adjustModeForBattery();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
          this.adjustModeForBattery();
        });
        
        this.adjustModeForBattery();
      } catch (e) {
        console.log('Battery API not available');
      }
    }
  }

  adjustModeForBattery() {
    // Don't auto-adjust if charging
    if (this.isCharging) return;
    
    // Auto-switch to power save if battery is low
    if (this.batteryLevel !== null && this.batteryLevel < 0.15) {
      if (this.currentMode !== 'power-save') {
        console.log('Battery low, switching to power-save mode');
        this.setMode('power-save');
      }
    }
  }

  setMode(mode) {
    if (!this.modes[mode]) {
      console.error('Unknown battery mode:', mode);
      return;
    }
    
    this.currentMode = mode;
    
    // Restart tracking with new settings if active
    if (this.watchId !== null || this.intervalId !== null) {
      this.stopTracking();
      if (this.onPositionUpdate) {
        this.startTracking(this.onPositionUpdate);
      }
    }
  }

  getMode() {
    return this.currentMode;
  }

  getModeConfig() {
    return this.modes[this.currentMode];
  }

  getBatteryInfo() {
    return {
      level: this.batteryLevel,
      isCharging: this.isCharging,
      percentage: this.batteryLevel !== null ? Math.round(this.batteryLevel * 100) : null,
    };
  }

  // Calculate distance between two points in meters
  getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
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

  // Start tracking location with optimized settings
  startTracking(onUpdate) {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return false;
    }

    this.onPositionUpdate = onUpdate;
    const config = this.getModeConfig();

    // For power-save mode, use interval polling instead of watch
    if (this.currentMode === 'power-save') {
      this.pollPosition();
      this.intervalId = setInterval(() => {
        this.pollPosition();
      }, config.pollInterval);
    } else {
      // Use watchPosition for balanced and high-accuracy
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePosition(position),
        (error) => this.handleError(error),
        {
          enableHighAccuracy: config.enableHighAccuracy,
          timeout: config.timeout,
          maximumAge: config.maximumAge,
        }
      );
    }

    return true;
  }

  pollPosition() {
    const config = this.getModeConfig();
    
    navigator.geolocation.getCurrentPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: config.enableHighAccuracy,
        timeout: config.timeout,
        maximumAge: config.maximumAge,
      }
    );
  }

  handlePosition(position) {
    const config = this.getModeConfig();
    const newPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };

    // Check if we should update based on minimum distance
    if (this.lastPosition && config.minDistance > 0) {
      const distance = this.getDistance(
        this.lastPosition.lat, this.lastPosition.lng,
        newPosition.lat, newPosition.lng
      );
      
      if (distance < config.minDistance) {
        // Haven't moved enough, skip update
        return;
      }
    }

    this.lastPosition = newPosition;
    
    if (this.onPositionUpdate) {
      this.onPositionUpdate(newPosition);
    }
  }

  handleError(error) {
    console.error('Geolocation error:', error.message);
    
    // If high accuracy fails, try with lower accuracy
    if (error.code === error.TIMEOUT && this.currentMode === 'high-accuracy') {
      console.log('High accuracy timeout, falling back to balanced');
      this.setMode('balanced');
    }
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.onPositionUpdate = null;
  }

  // Get recommended mode based on game type
  getRecommendedMode(gameSettings) {
    if (!gameSettings) return 'balanced';

    // City-wide games can use power save
    if (gameSettings.tagRadius > 100) return 'power-save';
    
    // Quick games need high accuracy
    if (gameSettings.duration && gameSettings.duration < 30 * 60 * 1000) return 'high-accuracy';
    
    return 'balanced';
  }

  // Estimate battery usage
  estimateBatteryUsage(mode, durationMinutes) {
    const usagePerHour = {
      'power-save': 5, // 5% per hour
      'balanced': 10, // 10% per hour
      'high-accuracy': 20, // 20% per hour
    };
    
    const hoursPlaying = durationMinutes / 60;
    return Math.round(usagePerHour[mode] * hoursPlaying);
  }
}

export const batteryOptimizer = new BatteryOptimizer();
