/**
 * Proximity Sound Engine
 * Dynamic audio system that creates tension based on game state
 */

class ProximitySoundEngine {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.masterVolume = 0.7;

    // Active audio nodes
    this.heartbeat = null;
    this.tensionDrone = null;
    this.proximityOscillator = null;
    this.ambientLoop = null;

    // State
    this.currentProximity = 1000; // Distance to IT
    this.isIT = false;
    this.gameActive = false;
    this.intensityLevel = 0; // 0-100

    // Thresholds
    this.dangerZone = 50; // meters
    this.warningZone = 150;
    this.safeZone = 300;
  }

  /**
   * Initialize audio context (must be called on user interaction)
   */
  async init() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      // Create dynamics compressor for consistent volume
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.connect(this.masterGain);

      console.log('Proximity Sound Engine initialized');
    } catch (e) {
      console.warn('Audio context not supported:', e);
    }
  }

  /**
   * Create heartbeat sound that speeds up with proximity
   */
  createHeartbeat() {
    if (!this.audioContext || this.heartbeat) return;

    const ctx = this.audioContext;

    // Heartbeat is two quick thumps
    const playBeat = () => {
      if (!this.gameActive || !this.isEnabled) return;

      const now = ctx.currentTime;

      // First thump (louder)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 60;
      gain1.gain.setValueAtTime(0.3 * this.intensityLevel / 100, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.compressor);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second thump (softer)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 55;
      gain2.gain.setValueAtTime(0.2 * this.intensityLevel / 100, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.compressor);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.25);

      // Calculate next beat interval based on proximity (faster when closer)
      const minInterval = 300; // fastest
      const maxInterval = 1200; // slowest
      const proximityRatio = Math.min(this.currentProximity / this.safeZone, 1);
      const interval = minInterval + (maxInterval - minInterval) * proximityRatio;

      this.heartbeatTimeout = setTimeout(playBeat, interval);
    };

    this.heartbeat = { play: playBeat, stop: () => clearTimeout(this.heartbeatTimeout) };
  }

  /**
   * Create tension drone that intensifies with proximity
   */
  createTensionDrone() {
    if (!this.audioContext || this.tensionDrone) return;

    const ctx = this.audioContext;

    // Low frequency drone
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55; // Low A

    // Filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    // Gain for volume control
    const gain = ctx.createGain();
    gain.gain.value = 0;

    // LFO for subtle wobble
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);

    osc.start();
    lfo.start();

    this.tensionDrone = { osc, filter, gain, lfo };
  }

  /**
   * Create proximity warning oscillator (Jaws-like)
   */
  createProximityOscillator() {
    if (!this.audioContext || this.proximityOscillator) return;

    const ctx = this.audioContext;

    const playNote = () => {
      if (!this.gameActive || !this.isEnabled) return;
      if (this.currentProximity > this.warningZone) {
        this.proximityTimeout = setTimeout(playNote, 500);
        return;
      }

      const now = ctx.currentTime;

      // Two alternating notes (like Jaws theme)
      const freq1 = 82.4; // E2
      const freq2 = 87.3; // F2

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      // Alternate between notes
      this.proximityNoteToggle = !this.proximityNoteToggle;
      osc.frequency.value = this.proximityNoteToggle ? freq1 : freq2;

      const intensity = Math.max(0, 1 - (this.currentProximity / this.warningZone));
      gain.gain.setValueAtTime(0.15 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(now);
      osc.stop(now + 0.3);

      // Interval based on proximity (faster when closer)
      const interval = 200 + (this.currentProximity / this.warningZone) * 600;
      this.proximityTimeout = setTimeout(playNote, interval);
    };

    this.proximityOscillator = { play: playNote, stop: () => clearTimeout(this.proximityTimeout) };
  }

  /**
   * Start game audio
   */
  startGame(isIT) {
    this.isIT = isIT;
    this.gameActive = true;
    this.intensityLevel = 30;

    this.createHeartbeat();
    this.createTensionDrone();
    this.createProximityOscillator();

    if (!isIT) {
      // Runners get heartbeat and proximity warnings
      this.heartbeat?.play();
      this.proximityOscillator?.play();
    }

    // Start tension drone at low level
    if (this.tensionDrone) {
      this.tensionDrone.gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 1);
    }
  }

  /**
   * Update proximity to IT (for runners)
   */
  updateProximity(distanceMeters) {
    this.currentProximity = distanceMeters;

    // Calculate intensity (0-100)
    if (distanceMeters < this.dangerZone) {
      this.intensityLevel = 100;
    } else if (distanceMeters < this.warningZone) {
      this.intensityLevel = 50 + (1 - distanceMeters / this.warningZone) * 50;
    } else if (distanceMeters < this.safeZone) {
      this.intensityLevel = (1 - distanceMeters / this.safeZone) * 50;
    } else {
      this.intensityLevel = 0;
    }

    // Update tension drone volume and frequency
    if (this.tensionDrone && this.audioContext) {
      const targetVolume = 0.02 + (this.intensityLevel / 100) * 0.15;
      const targetFreq = 55 + (this.intensityLevel / 100) * 30; // Gets higher pitched

      this.tensionDrone.gain.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + 0.3
      );
      this.tensionDrone.osc.frequency.linearRampToValueAtTime(
        targetFreq,
        this.audioContext.currentTime + 0.3
      );
      this.tensionDrone.lfo.frequency.linearRampToValueAtTime(
        0.5 + (this.intensityLevel / 100) * 2,
        this.audioContext.currentTime + 0.3
      );
    }
  }

  /**
   * Play tag sound (dramatic!)
   */
  playTagSound(wasTagged) {
    if (!this.audioContext || !this.isEnabled) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    if (wasTagged) {
      // Dramatic "caught" sound - descending sting
      [400, 350, 300, 200].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(this.compressor);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.15);
      });
    } else {
      // Victory "tagged someone" - ascending sting
      [300, 400, 500, 600].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(this.compressor);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.2);
      });
    }
  }

  /**
   * Play near miss sound
   */
  playNearMiss() {
    if (!this.audioContext || !this.isEnabled) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Quick whoosh sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Play powerup collect sound
   */
  playPowerupCollect() {
    if (!this.audioContext || !this.isEnabled) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Magical ascending arpeggio
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  /**
   * Play game start fanfare
   */
  playGameStart() {
    if (!this.audioContext || !this.isEnabled) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Epic horn-like fanfare
    const chord = [262, 330, 392, 523]; // C major
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.5);
      gain.gain.linearRampToValueAtTime(0, now + 1);
      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(now);
      osc.stop(now + 1);
    });
  }

  /**
   * Play victory sound
   */
  playVictory() {
    if (!this.audioContext || !this.isEnabled) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Triumphant fanfare
    const melody = [
      { freq: 523, time: 0, dur: 0.2 },
      { freq: 659, time: 0.2, dur: 0.2 },
      { freq: 784, time: 0.4, dur: 0.2 },
      { freq: 1047, time: 0.6, dur: 0.6 },
    ];

    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.2, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.dur);
      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);
    });
  }

  /**
   * Play defeat sound
   */
  playDefeat() {
    if (!this.audioContext || !this.isEnabled) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Sad trombone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.5);
    osc.frequency.linearRampToValueAtTime(150, now + 1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 1);
    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 1);
  }

  /**
   * Stop all game audio
   */
  stopGame() {
    this.gameActive = false;

    this.heartbeat?.stop();
    this.proximityOscillator?.stop();

    if (this.tensionDrone && this.audioContext) {
      this.tensionDrone.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    }
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Toggle enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopGame();
    }
  }

  /**
   * Get current intensity
   */
  getIntensity() {
    return this.intensityLevel;
  }

  /**
   * Clean up
   */
  destroy() {
    this.stopGame();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton
export const proximitySoundEngine = new ProximitySoundEngine();
export default proximitySoundEngine;
