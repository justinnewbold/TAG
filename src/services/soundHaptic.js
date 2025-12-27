// Sound and Haptic Feedback Service
// Provides audio cues and haptic feedback for game events

class SoundHapticService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.enabled = {
      sound: true,
      haptic: true,
    };
    this.volume = 0.7;
    this.initialized = false;
  }

  // Initialize audio context (must be called after user interaction)
  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('Sound service initialized');
    } catch (error) {
      console.warn('Could not initialize audio context:', error);
    }
  }

  // Resume audio context if suspended
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Set volume (0-1)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Enable/disable sound
  setSound(enabled) {
    this.enabled.sound = enabled;
  }

  // Enable/disable haptic
  setHaptic(enabled) {
    this.enabled.haptic = enabled;
  }

  // Synthesize sounds using Web Audio API
  createOscillator(frequency, type = 'sine', duration = 0.2, gain = 0.5) {
    if (!this.audioContext || !this.enabled.sound) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(gain * this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Play a sequence of notes
  playMelody(notes) {
    if (!this.audioContext || !this.enabled.sound) return;

    notes.forEach(({ frequency, delay, duration, type, gain }) => {
      setTimeout(() => {
        this.createOscillator(frequency, type || 'sine', duration || 0.15, gain || 0.4);
      }, delay);
    });
  }

  // Haptic feedback using Vibration API
  vibrate(pattern) {
    if (!this.enabled.haptic) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // === GAME EVENT SOUNDS ===

  // You tagged someone!
  playTagSuccess() {
    this.playMelody([
      { frequency: 523, delay: 0, duration: 0.1 },      // C5
      { frequency: 659, delay: 80, duration: 0.1 },     // E5
      { frequency: 784, delay: 160, duration: 0.2 },    // G5
      { frequency: 1047, delay: 260, duration: 0.3 },   // C6
    ]);
    this.vibrate([50, 30, 50, 30, 100]); // Success pattern
  }

  // You got tagged!
  playTaggedByOther() {
    this.playMelody([
      { frequency: 400, delay: 0, duration: 0.15, type: 'sawtooth', gain: 0.3 },
      { frequency: 300, delay: 100, duration: 0.15, type: 'sawtooth', gain: 0.3 },
      { frequency: 200, delay: 200, duration: 0.3, type: 'sawtooth', gain: 0.2 },
    ]);
    this.vibrate([200, 100, 200]); // Alert pattern
  }

  // Game started
  playGameStart() {
    this.playMelody([
      { frequency: 262, delay: 0, duration: 0.15 },     // C4
      { frequency: 330, delay: 150, duration: 0.15 },   // E4
      { frequency: 392, delay: 300, duration: 0.15 },   // G4
      { frequency: 523, delay: 450, duration: 0.4 },    // C5
    ]);
    this.vibrate([100, 50, 100, 50, 200]); // Start pattern
  }

  // Countdown tick
  playCountdownTick() {
    this.createOscillator(880, 'sine', 0.05, 0.3); // A5
    this.vibrate(30);
  }

  // Final countdown tick (last 3 seconds)
  playFinalCountdownTick() {
    this.createOscillator(1047, 'sine', 0.1, 0.5); // C6
    this.vibrate(50);
  }

  // Game ended
  playGameEnd() {
    this.playMelody([
      { frequency: 523, delay: 0, duration: 0.2 },
      { frequency: 392, delay: 200, duration: 0.2 },
      { frequency: 330, delay: 400, duration: 0.2 },
      { frequency: 262, delay: 600, duration: 0.4 },
    ]);
    this.vibrate([100, 100, 100, 100, 300]);
  }

  // Victory!
  playVictory() {
    this.playMelody([
      { frequency: 523, delay: 0, duration: 0.15 },     // C5
      { frequency: 659, delay: 150, duration: 0.15 },   // E5
      { frequency: 784, delay: 300, duration: 0.15 },   // G5
      { frequency: 1047, delay: 450, duration: 0.15 },  // C6
      { frequency: 784, delay: 600, duration: 0.15 },   // G5
      { frequency: 1047, delay: 750, duration: 0.4 },   // C6
    ]);
    this.vibrate([100, 50, 100, 50, 100, 50, 300]);
  }

  // Defeat
  playDefeat() {
    this.playMelody([
      { frequency: 392, delay: 0, duration: 0.3, type: 'triangle' },
      { frequency: 330, delay: 300, duration: 0.3, type: 'triangle' },
      { frequency: 262, delay: 600, duration: 0.5, type: 'triangle' },
    ]);
    this.vibrate([200, 200, 400]);
  }

  // === POWERUP SOUNDS ===

  // Powerup collected
  playPowerupCollected() {
    this.playMelody([
      { frequency: 880, delay: 0, duration: 0.08, type: 'square', gain: 0.2 },
      { frequency: 1175, delay: 80, duration: 0.08, type: 'square', gain: 0.2 },
      { frequency: 1397, delay: 160, duration: 0.15, type: 'square', gain: 0.3 },
    ]);
    this.vibrate([30, 20, 60]);
  }

  // Powerup activated
  playPowerupActivated() {
    this.playMelody([
      { frequency: 440, delay: 0, duration: 0.1 },
      { frequency: 554, delay: 50, duration: 0.1 },
      { frequency: 659, delay: 100, duration: 0.1 },
      { frequency: 880, delay: 150, duration: 0.2 },
    ]);
    this.vibrate([50, 30, 80]);
  }

  // Speed boost active
  playSpeedBoost() {
    this.playMelody([
      { frequency: 600, delay: 0, duration: 0.05, type: 'sawtooth', gain: 0.2 },
      { frequency: 800, delay: 40, duration: 0.05, type: 'sawtooth', gain: 0.2 },
      { frequency: 1000, delay: 80, duration: 0.05, type: 'sawtooth', gain: 0.2 },
      { frequency: 1200, delay: 120, duration: 0.1, type: 'sawtooth', gain: 0.3 },
    ]);
    this.vibrate([20, 10, 20, 10, 40]);
  }

  // Invisibility activated
  playInvisibility() {
    this.playMelody([
      { frequency: 1200, delay: 0, duration: 0.3, type: 'sine', gain: 0.3 },
      { frequency: 600, delay: 200, duration: 0.2, type: 'sine', gain: 0.15 },
    ]);
    this.vibrate([100]);
  }

  // Shield activated
  playShield() {
    this.playMelody([
      { frequency: 200, delay: 0, duration: 0.15, type: 'triangle', gain: 0.4 },
      { frequency: 400, delay: 100, duration: 0.2, type: 'triangle', gain: 0.3 },
      { frequency: 300, delay: 200, duration: 0.3, type: 'triangle', gain: 0.2 },
    ]);
    this.vibrate([80, 40, 120]);
  }

  // === ALERT SOUNDS ===

  // Player nearby warning
  playProximityWarning() {
    this.playMelody([
      { frequency: 660, delay: 0, duration: 0.1, type: 'square', gain: 0.25 },
      { frequency: 660, delay: 200, duration: 0.1, type: 'square', gain: 0.25 },
    ]);
    this.vibrate([40, 60, 40]);
  }

  // Tagger nearby (danger!)
  playTaggerNearby() {
    this.playMelody([
      { frequency: 880, delay: 0, duration: 0.08, type: 'sawtooth', gain: 0.3 },
      { frequency: 880, delay: 100, duration: 0.08, type: 'sawtooth', gain: 0.3 },
      { frequency: 880, delay: 200, duration: 0.08, type: 'sawtooth', gain: 0.3 },
    ]);
    this.vibrate([60, 40, 60, 40, 60]);
  }

  // Entering safe zone
  playEnterSafeZone() {
    this.playMelody([
      { frequency: 440, delay: 0, duration: 0.2 },
      { frequency: 554, delay: 150, duration: 0.3 },
    ]);
    this.vibrate([50]);
  }

  // Leaving safe zone
  playLeaveSafeZone() {
    this.playMelody([
      { frequency: 554, delay: 0, duration: 0.2 },
      { frequency: 440, delay: 150, duration: 0.3 },
    ]);
    this.vibrate([30, 20, 30]);
  }

  // Boundary warning
  playBoundaryWarning() {
    this.playMelody([
      { frequency: 500, delay: 0, duration: 0.15, type: 'square', gain: 0.3 },
      { frequency: 500, delay: 200, duration: 0.15, type: 'square', gain: 0.3 },
      { frequency: 500, delay: 400, duration: 0.15, type: 'square', gain: 0.3 },
    ]);
    this.vibrate([100, 50, 100, 50, 100]);
  }

  // === SOCIAL SOUNDS ===

  // Achievement unlocked
  playAchievement() {
    this.playMelody([
      { frequency: 523, delay: 0, duration: 0.1 },
      { frequency: 659, delay: 100, duration: 0.1 },
      { frequency: 784, delay: 200, duration: 0.1 },
      { frequency: 1047, delay: 300, duration: 0.15 },
      { frequency: 1319, delay: 450, duration: 0.25 },
    ]);
    this.vibrate([50, 30, 50, 30, 50, 30, 150]);
  }

  // Level up
  playLevelUp() {
    this.playMelody([
      { frequency: 262, delay: 0, duration: 0.15 },
      { frequency: 330, delay: 100, duration: 0.15 },
      { frequency: 392, delay: 200, duration: 0.15 },
      { frequency: 523, delay: 300, duration: 0.15 },
      { frequency: 659, delay: 400, duration: 0.15 },
      { frequency: 784, delay: 500, duration: 0.3 },
    ]);
    this.vibrate([40, 40, 40, 40, 40, 40, 200]);
  }

  // Friend request received
  playFriendRequest() {
    this.playMelody([
      { frequency: 698, delay: 0, duration: 0.1 },
      { frequency: 880, delay: 100, duration: 0.15 },
    ]);
    this.vibrate([50, 30, 80]);
  }

  // Chat message received
  playChatMessage() {
    this.createOscillator(1047, 'sine', 0.08, 0.25);
    this.vibrate(20);
  }

  // Player joined lobby
  playPlayerJoined() {
    this.playMelody([
      { frequency: 523, delay: 0, duration: 0.1 },
      { frequency: 659, delay: 80, duration: 0.15 },
    ]);
    this.vibrate(30);
  }

  // Player left lobby
  playPlayerLeft() {
    this.playMelody([
      { frequency: 659, delay: 0, duration: 0.1 },
      { frequency: 523, delay: 80, duration: 0.15 },
    ]);
    this.vibrate(30);
  }

  // === UI SOUNDS ===

  // Button tap
  playButtonTap() {
    this.createOscillator(800, 'sine', 0.03, 0.15);
    this.vibrate(10);
  }

  // Toggle switch
  playToggle() {
    this.createOscillator(600, 'sine', 0.05, 0.2);
    this.vibrate(15);
  }

  // Error
  playError() {
    this.playMelody([
      { frequency: 200, delay: 0, duration: 0.15, type: 'sawtooth', gain: 0.3 },
      { frequency: 150, delay: 150, duration: 0.2, type: 'sawtooth', gain: 0.2 },
    ]);
    this.vibrate([100, 50, 100]);
  }

  // Success
  playSuccess() {
    this.playMelody([
      { frequency: 523, delay: 0, duration: 0.1 },
      { frequency: 784, delay: 100, duration: 0.15 },
    ]);
    this.vibrate(40);
  }

  // Notification
  playNotification() {
    this.playMelody([
      { frequency: 880, delay: 0, duration: 0.08 },
      { frequency: 1047, delay: 80, duration: 0.12 },
    ]);
    this.vibrate([30, 20, 50]);
  }
}

// Export singleton instance
export const soundService = new SoundHapticService();

// React hook for easy usage
export function useSoundHaptic() {
  return soundService;
}
