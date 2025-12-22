import { useEffect, useRef, useCallback } from 'react';

/**
 * Proximity Audio Hook
 * Provides audio feedback based on distance to other players
 */
export function useProximityAudio({ 
  enabled = true, 
  distance = null, 
  isIt = false,
  tagRadius = 20 
}) {
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lastDistanceRef = useRef(null);
  const audioEnabledRef = useRef(false);

  // Initialize audio context on user interaction
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0;
      audioEnabledRef.current = true;
    } catch (err) {
      console.warn('Failed to initialize proximity audio:', err);
    }
  }, []);

  // Start proximity tone
  const startTone = useCallback(() => {
    if (!audioContextRef.current || oscillatorRef.current) return;

    try {
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.value = 440;
      oscillatorRef.current.connect(gainNodeRef.current);
      oscillatorRef.current.start();
    } catch (err) {
      console.warn('Failed to start proximity tone:', err);
    }
  }, []);

  // Stop proximity tone
  const stopTone = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      oscillatorRef.current = null;
    }
  }, []);

  // Update tone based on distance
  useEffect(() => {
    if (!enabled || !audioEnabledRef.current || distance === null) {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 0;
      }
      return;
    }

    // Calculate proximity factor (0 = far, 1 = very close)
    const maxDistance = tagRadius * 5; // Start hearing at 5x tag radius
    const proximityFactor = Math.max(0, 1 - (distance / maxDistance));

    if (proximityFactor > 0 && !oscillatorRef.current) {
      startTone();
    }

    if (oscillatorRef.current && gainNodeRef.current && audioContextRef.current) {
      // Volume increases as player gets closer
      const volume = proximityFactor * 0.3; // Max 30% volume
      gainNodeRef.current.gain.setTargetAtTime(
        volume,
        audioContextRef.current.currentTime,
        0.1
      );

      // Frequency increases as player gets closer (creates urgency)
      // Range: 200Hz (far) to 800Hz (close)
      const baseFreq = isIt ? 300 : 200;
      const maxFreq = isIt ? 1000 : 800;
      const frequency = baseFreq + (proximityFactor * (maxFreq - baseFreq));
      oscillatorRef.current.frequency.setTargetAtTime(
        frequency,
        audioContextRef.current.currentTime,
        0.1
      );

      // Pulse effect when very close
      if (proximityFactor > 0.7) {
        const pulseRate = 2 + (proximityFactor * 4); // 2-6 Hz
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * pulseRate * Math.PI * 2) * 0.5 + 0.5;
        gainNodeRef.current.gain.setTargetAtTime(
          volume * (0.5 + pulse * 0.5),
          audioContextRef.current.currentTime,
          0.05
        );
      }
    }

    // Stop tone when far away
    if (proximityFactor === 0) {
      stopTone();
    }

    lastDistanceRef.current = distance;
  }, [enabled, distance, isIt, tagRadius, startTone, stopTone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTone();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stopTone]);

  // Play tag sound effect
  const playTagSound = useCallback((wasTagged = false) => {
    if (!audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (wasTagged) {
        // Descending tone for being tagged
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
      } else {
        // Ascending tone for tagging someone
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);
      }
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.warn('Failed to play tag sound:', err);
    }
  }, []);

  // Play game start sound
  const playGameStart = useCallback(() => {
    if (!audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
        
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch (err) {
      console.warn('Failed to play game start sound:', err);
    }
  }, []);

  // Play heartbeat when tagged and running
  const playHeartbeat = useCallback((bpm = 100) => {
    if (!audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const beatInterval = 60 / bpm;
      
      // Create two quick beats for "lub-dub"
      [0, 0.15].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = offset === 0 ? 60 : 50;
        
        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + offset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.15);
        
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.15);
      });
    } catch (err) {
      console.warn('Failed to play heartbeat:', err);
    }
  }, []);

  return {
    initAudio,
    playTagSound,
    playGameStart,
    playHeartbeat,
    isAudioEnabled: audioEnabledRef.current
  };
}

export default useProximityAudio;
