/**
 * Heartbeat Proximity Service
 *
 * Creates escalating haptic feedback based on distance to IT player.
 * The closer IT gets, the more intense the "heartbeat" vibration pattern.
 * Works in background - you FEEL the danger without looking at screen.
 */

class HeartbeatService {
  constructor() {
    this.isActive = false;
    this.currentPattern = null;
    this.intervalId = null;
    this.lastDistance = null;
    this.enabled = true;
    this.audioContext = null;
    this.oscillator = null;

    // Distance thresholds (in meters) and corresponding intensity levels
    this.thresholds = [
      { distance: 50, level: 'critical', interval: 400, pattern: [200, 100, 200, 300] },
      { distance: 100, level: 'danger', interval: 600, pattern: [150, 150, 150, 400] },
      { distance: 200, level: 'warning', interval: 1000, pattern: [100, 200, 100, 600] },
      { distance: 500, level: 'alert', interval: 2000, pattern: [80, 300] },
      { distance: 1000, level: 'aware', interval: 4000, pattern: [50, 500] },
    ];

    // Audio frequencies for heartbeat sound effect
    this.audioConfig = {
      critical: { freq: 80, volume: 0.4 },
      danger: { freq: 70, volume: 0.3 },
      warning: { freq: 60, volume: 0.2 },
      alert: { freq: 50, volume: 0.15 },
      aware: { freq: 45, volume: 0.1 },
    };
  }

  /**
   * Initialize audio context for heartbeat sounds
   */
  initAudio() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('HeartbeatService: Audio not available');
    }
  }

  /**
   * Play heartbeat sound effect
   */
  playHeartbeatSound(level) {
    if (!this.audioContext) {
      this.initAudio();
    }

    if (!this.audioContext) return;

    const config = this.audioConfig[level];
    if (!config) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.type = 'sine';
      osc.frequency.value = config.freq;

      // Create heartbeat envelope (lub-dub)
      const now = this.audioContext.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(config.volume, now + 0.05);
      gain.gain.linearRampToValueAtTime(config.volume * 0.3, now + 0.1);
      gain.gain.linearRampToValueAtTime(config.volume * 0.8, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // Audio context might be suspended
    }
  }

  /**
   * Trigger haptic vibration pattern
   */
  vibrate(pattern) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Get intensity level based on distance
   */
  getIntensityLevel(distance) {
    for (const threshold of this.thresholds) {
      if (distance <= threshold.distance) {
        return threshold;
      }
    }
    return null; // Too far, no heartbeat
  }

  /**
   * Start heartbeat based on distance to IT
   */
  updateDistance(distance, options = {}) {
    const { playSound = true, vibrate = true } = options;

    if (!this.enabled || !this.isActive) return;

    this.lastDistance = distance;
    const level = this.getIntensityLevel(distance);

    // Clear existing pattern if distance changed significantly
    if (this.currentPattern?.level !== level?.level) {
      this.stop();

      if (level) {
        this.currentPattern = level;
        this.startHeartbeat(level, { playSound, vibrate });
      }
    }
  }

  /**
   * Start the heartbeat loop
   */
  startHeartbeat(level, options = {}) {
    const { playSound = true, vibrate = true } = options;

    // Immediate first beat
    if (vibrate) this.vibrate(level.pattern);
    if (playSound) this.playHeartbeatSound(level.level);

    // Set up repeating beats
    this.intervalId = setInterval(() => {
      if (vibrate) this.vibrate(level.pattern);
      if (playSound) this.playHeartbeatSound(level.level);
    }, level.interval);
  }

  /**
   * Activate heartbeat monitoring
   */
  activate() {
    this.isActive = true;
    if (this.lastDistance !== null) {
      this.updateDistance(this.lastDistance);
    }
  }

  /**
   * Deactivate heartbeat monitoring
   */
  deactivate() {
    this.isActive = false;
    this.stop();
  }

  /**
   * Stop current heartbeat
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentPattern = null;

    // Stop any ongoing vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  /**
   * Enable/disable the service
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Get current intensity level info (for UI display)
   */
  getCurrentLevel() {
    if (!this.currentPattern) return null;

    return {
      level: this.currentPattern.level,
      distance: this.lastDistance,
      intensity: this.getIntensityPercentage(),
    };
  }

  /**
   * Get intensity as percentage (for UI meters)
   */
  getIntensityPercentage() {
    if (this.lastDistance === null) return 0;

    const maxDistance = 1000;
    const minDistance = 50;

    if (this.lastDistance >= maxDistance) return 0;
    if (this.lastDistance <= minDistance) return 100;

    return Math.round(
      ((maxDistance - this.lastDistance) / (maxDistance - minDistance)) * 100
    );
  }

  /**
   * Trigger a single strong pulse (for events like "IT just tagged someone")
   */
  pulseAlert() {
    if (!this.enabled) return;

    this.vibrate([100, 50, 100, 50, 200, 100, 200]);
    this.playHeartbeatSound('critical');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const heartbeatService = new HeartbeatService();
export default heartbeatService;
