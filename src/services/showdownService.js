/**
 * Showdown Mode Service ("The Closer" Mechanic)
 *
 * When IT is within striking distance (100m), both players enter "Showdown Mode":
 * - Map zooms in automatically
 * - More frequent updates (real-time)
 * - Dramatic music/haptics
 * - Both see each other's exact position
 *
 * Transforms the final chase into a cinematic moment.
 */

class ShowdownService {
  constructor() {
    // Active showdowns: { `${player1}_${player2}`: ShowdownState }
    this.activeShowdowns = new Map();

    // Configuration
    this.config = {
      // Distance to trigger showdown (meters)
      triggerDistance: 100,

      // Distance to exit showdown (meters) - slightly larger to prevent flickering
      exitDistance: 150,

      // GPS update interval during showdown (ms)
      showdownGPSInterval: 2000, // 2 seconds

      // Map zoom level during showdown
      showdownZoomLevel: 18,

      // Minimum showdown duration (ms) - prevents instant exit
      minDuration: 10000, // 10 seconds

      // Haptic pattern for showdown start
      startHapticPattern: [200, 100, 200, 100, 400],

      // Haptic pattern for showdown pulse (every few seconds)
      pulseHapticPattern: [100, 50, 100],

      // Pulse interval during showdown
      pulseInterval: 3000,

      // Audio frequencies
      audio: {
        start: { freq: 200, duration: 0.5, type: 'sawtooth' },
        pulse: { freq: 150, duration: 0.2, type: 'sine' },
        intensify: { freq: 300, duration: 0.3, type: 'triangle' },
      },
    };

    // Event listeners
    this.listeners = new Map();

    // Audio context
    this.audioContext = null;

    // Active pulse intervals
    this.pulseIntervals = new Map();
  }

  /**
   * Initialize audio context
   */
  initAudio() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('ShowdownService: Audio not available');
    }
  }

  /**
   * Check if showdown should be triggered/maintained
   */
  checkShowdown(itPlayerId, targetPlayerId, distance, itLocation, targetLocation) {
    const showdownKey = this.getShowdownKey(itPlayerId, targetPlayerId);
    const existingShowdown = this.activeShowdowns.get(showdownKey);

    if (existingShowdown) {
      // Already in showdown - check if should exit
      const timeSinceStart = Date.now() - existingShowdown.startedAt;

      if (
        distance > this.config.exitDistance &&
        timeSinceStart > this.config.minDuration
      ) {
        // Exit showdown
        return this.endShowdown(showdownKey);
      }

      // Update showdown state
      existingShowdown.distance = distance;
      existingShowdown.itLocation = itLocation;
      existingShowdown.targetLocation = targetLocation;
      existingShowdown.lastUpdate = Date.now();
      existingShowdown.intensity = this.calculateIntensity(distance);

      this.emit('showdownUpdate', existingShowdown);

      return { inShowdown: true, showdown: existingShowdown };
    }

    // Not in showdown - check if should enter
    if (distance <= this.config.triggerDistance) {
      return this.startShowdown(
        itPlayerId,
        targetPlayerId,
        distance,
        itLocation,
        targetLocation
      );
    }

    return { inShowdown: false };
  }

  /**
   * Start a new showdown
   */
  startShowdown(itPlayerId, targetPlayerId, distance, itLocation, targetLocation) {
    const showdownKey = this.getShowdownKey(itPlayerId, targetPlayerId);

    const showdown = {
      id: `showdown_${Date.now()}`,
      key: showdownKey,
      itPlayerId,
      targetPlayerId,
      distance,
      itLocation,
      targetLocation,
      startedAt: Date.now(),
      lastUpdate: Date.now(),
      intensity: this.calculateIntensity(distance),
      phase: 'active',
    };

    this.activeShowdowns.set(showdownKey, showdown);

    // Start pulse haptics
    this.startPulse(showdownKey);

    // Play start effects
    this.playStartEffects();

    this.emit('showdownStarted', showdown);

    return { inShowdown: true, showdown, isNew: true };
  }

  /**
   * End a showdown
   */
  endShowdown(showdownKey) {
    const showdown = this.activeShowdowns.get(showdownKey);
    if (!showdown) return { inShowdown: false };

    // Stop pulse
    this.stopPulse(showdownKey);

    // Calculate duration
    const duration = Date.now() - showdown.startedAt;

    const endedShowdown = {
      ...showdown,
      endedAt: Date.now(),
      duration,
      phase: 'ended',
    };

    this.activeShowdowns.delete(showdownKey);

    this.emit('showdownEnded', endedShowdown);

    return { inShowdown: false, showdown: endedShowdown, wasInShowdown: true };
  }

  /**
   * Force end all showdowns for a player (e.g., when tagged)
   */
  endAllShowdownsForPlayer(playerId) {
    const endedShowdowns = [];

    for (const [key, showdown] of this.activeShowdowns) {
      if (showdown.itPlayerId === playerId || showdown.targetPlayerId === playerId) {
        endedShowdowns.push(this.endShowdown(key));
      }
    }

    return endedShowdowns;
  }

  /**
   * Calculate intensity (0-100) based on distance
   */
  calculateIntensity(distance) {
    const maxDistance = this.config.triggerDistance;
    const minDistance = 10; // At 10m, max intensity

    if (distance <= minDistance) return 100;
    if (distance >= maxDistance) return 0;

    return Math.round(
      ((maxDistance - distance) / (maxDistance - minDistance)) * 100
    );
  }

  /**
   * Get showdown key (consistent regardless of order)
   */
  getShowdownKey(player1, player2) {
    return [player1, player2].sort().join('_vs_');
  }

  /**
   * Start pulse effects during showdown
   */
  startPulse(showdownKey) {
    if (this.pulseIntervals.has(showdownKey)) return;

    const intervalId = setInterval(() => {
      const showdown = this.activeShowdowns.get(showdownKey);
      if (!showdown) {
        this.stopPulse(showdownKey);
        return;
      }

      // Vibrate
      if ('vibrate' in navigator) {
        navigator.vibrate(this.config.pulseHapticPattern);
      }

      // Play pulse sound
      this.playPulseSound(showdown.intensity);

      this.emit('showdownPulse', showdown);
    }, this.config.pulseInterval);

    this.pulseIntervals.set(showdownKey, intervalId);
  }

  /**
   * Stop pulse effects
   */
  stopPulse(showdownKey) {
    const intervalId = this.pulseIntervals.get(showdownKey);
    if (intervalId) {
      clearInterval(intervalId);
      this.pulseIntervals.delete(showdownKey);
    }

    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  /**
   * Play showdown start effects
   */
  playStartEffects() {
    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate(this.config.startHapticPattern);
    }

    // Play sound
    this.playSound(this.config.audio.start);
  }

  /**
   * Play pulse sound
   */
  playPulseSound(intensity) {
    const audioConfig = {
      ...this.config.audio.pulse,
      freq: this.config.audio.pulse.freq + (intensity / 100) * 100, // Higher pitch at high intensity
    };
    this.playSound(audioConfig);
  }

  /**
   * Play a sound
   */
  playSound(config) {
    if (!this.audioContext) {
      this.initAudio();
    }

    if (!this.audioContext) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.type = config.type || 'sine';
      osc.frequency.value = config.freq;

      const now = this.audioContext.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + config.duration);

      osc.start(now);
      osc.stop(now + config.duration);
    } catch (e) {
      // Audio context might be suspended
    }
  }

  /**
   * Get current showdown for a player (if any)
   */
  getActiveShowdown(playerId) {
    for (const [, showdown] of this.activeShowdowns) {
      if (showdown.itPlayerId === playerId || showdown.targetPlayerId === playerId) {
        return showdown;
      }
    }
    return null;
  }

  /**
   * Check if player is in any showdown
   */
  isInShowdown(playerId) {
    return this.getActiveShowdown(playerId) !== null;
  }

  /**
   * Get all active showdowns (for spectator view)
   */
  getAllActiveShowdowns() {
    return Array.from(this.activeShowdowns.values());
  }

  /**
   * Get showdown info for UI
   */
  getShowdownInfo(playerId) {
    const showdown = this.getActiveShowdown(playerId);
    if (!showdown) return null;

    const isIt = showdown.itPlayerId === playerId;

    return {
      isInShowdown: true,
      isIt,
      opponentId: isIt ? showdown.targetPlayerId : showdown.itPlayerId,
      distance: showdown.distance,
      intensity: showdown.intensity,
      duration: Date.now() - showdown.startedAt,
      phase: showdown.phase,
      // Map settings
      recommendedZoom: this.config.showdownZoomLevel,
      gpsInterval: this.config.showdownGPSInterval,
      // Opponent location (real-time during showdown!)
      opponentLocation: isIt ? showdown.targetLocation : showdown.itLocation,
    };
  }

  /**
   * Event handling
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  /**
   * Destroy service
   */
  destroy() {
    // Stop all pulses
    for (const key of this.pulseIntervals.keys()) {
      this.stopPulse(key);
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.activeShowdowns.clear();
    this.listeners.clear();
  }
}

export const showdownService = new ShowdownService();
export default showdownService;
