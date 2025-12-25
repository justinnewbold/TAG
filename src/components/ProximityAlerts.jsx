import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';
import { useStore } from '../store';
import { getDistance } from '../../shared/utils';

// Proximity zones with different alert levels
const PROXIMITY_ZONES = [
  { name: 'danger', distance: 25, color: 'red', vibration: [200, 100, 200], soundFreq: 800 },
  { name: 'warning', distance: 50, color: 'orange', vibration: [150], soundFreq: 600 },
  { name: 'caution', distance: 100, color: 'yellow', vibration: [75], soundFreq: 400 },
  { name: 'aware', distance: 200, color: 'cyan', vibration: null, soundFreq: null },
];

export default function ProximityAlerts() {
  const { currentGame, user, settings } = useStore();
  const [nearestPlayer, setNearestPlayer] = useState(null);
  const [currentZone, setCurrentZone] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const lastAlertRef = useRef(null);
  const audioContextRef = useRef(null);
  const cooldownRef = useRef(false);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play proximity beep
  const playProximitySound = (frequency, duration = 150) => {
    if (!audioContextRef.current || !settings.sound || !alertsEnabled) return;
    
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.warn('Audio failed:', e);
    }
  };

  // Vibrate device
  const vibrateDevice = (pattern) => {
    if (!settings.vibration || !alertsEnabled || !pattern) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Check proximity to other players
  useEffect(() => {
    if (!currentGame || !user?.location || currentGame.status !== 'active') return;

    const checkProximity = () => {
      const otherPlayers = currentGame.players.filter(p => 
        p.id !== user.id && 
        p.location && 
        p.status === 'active' &&
        !p.isInvisible
      );

      if (otherPlayers.length === 0) {
        setNearestPlayer(null);
        setCurrentZone(null);
        return;
      }

      // Find nearest player
      let nearest = null;
      let minDistance = Infinity;

      for (const player of otherPlayers) {
        const dist = getDistance(
          user.location.lat, user.location.lng,
          player.location.lat, player.location.lng
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearest = { ...player, distance: dist };
        }
      }

      setNearestPlayer(nearest);

      // Determine zone
      const zone = PROXIMITY_ZONES.find(z => minDistance <= z.distance) || null;
      
      // Only alert on zone change or danger zone pulses
      if (zone && !cooldownRef.current) {
        const isNewZone = !currentZone || zone.name !== currentZone.name;
        const isDanger = zone.name === 'danger';
        
        if (isNewZone || isDanger) {
          // Cooldown to prevent spam
          cooldownRef.current = true;
          setTimeout(() => { cooldownRef.current = false; }, isDanger ? 1500 : 3000);
          
          // Alert based on zone
          if (zone.soundFreq) {
            playProximitySound(zone.soundFreq);
          }
          if (zone.vibration) {
            vibrateDevice(zone.vibration);
          }
        }
      }

      setCurrentZone(zone);
    };

    // Check every 500ms
    const interval = setInterval(checkProximity, 500);
    checkProximity(); // Initial check

    return () => clearInterval(interval);
  }, [currentGame, user?.location, settings.sound, settings.vibration, alertsEnabled]);

  if (!currentGame || currentGame.status !== 'active') return null;

  const isIt = currentGame.itPlayerId === user?.id;
  const zoneColor = currentZone?.color || 'white/20';

  return (
    <div className="fixed bottom-32 right-4 z-40">
      {/* Proximity Radar */}
      <div className={`
        relative w-20 h-20 rounded-full 
        bg-gradient-to-br from-dark-800/90 to-dark-900/90
        border-2 border-${zoneColor}
        shadow-lg backdrop-blur-sm
        transition-all duration-300
        ${currentZone?.name === 'danger' ? 'animate-pulse' : ''}
      `}>
        {/* Radar rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-16 h-16 rounded-full border border-white/10" />
          <div className="absolute w-12 h-12 rounded-full border border-white/10" />
          <div className="absolute w-8 h-8 rounded-full border border-white/10" />
          
          {/* Center blip */}
          <div className="w-3 h-3 rounded-full bg-neon-cyan shadow-glow-cyan" />
          
          {/* Nearest player blip (if in range) */}
          {nearestPlayer && currentZone && (
            <div 
              className={`absolute w-2 h-2 rounded-full bg-${zoneColor} shadow-lg animate-ping`}
              style={{
                // Position based on relative angle (simplified - just show distance)
                top: '20%',
                transform: `translateY(${Math.min(nearestPlayer.distance / 4, 30)}px)`
              }}
            />
          )}
        </div>

        {/* Distance indicator */}
        {nearestPlayer && (
          <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-${zoneColor} whitespace-nowrap`}>
            {Math.round(nearestPlayer.distance)}m
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setAlertsEnabled(!alertsEnabled)}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-dark-700 border border-white/20 flex items-center justify-center"
        >
          {alertsEnabled ? (
            <Volume2 className="w-3 h-3 text-neon-cyan" />
          ) : (
            <VolumeX className="w-3 h-3 text-white/40" />
          )}
        </button>
      </div>

      {/* Zone label */}
      {currentZone && (
        <div className={`
          mt-8 px-3 py-1 rounded-full text-xs font-semibold text-center
          bg-${zoneColor}/20 text-${zoneColor} border border-${zoneColor}/30
        `}>
          {currentZone.name === 'danger' && '⚠️ DANGER'}
          {currentZone.name === 'warning' && '🔶 WARNING'}
          {currentZone.name === 'caution' && '🔸 CAUTION'}
          {currentZone.name === 'aware' && '📍 NEARBY'}
        </div>
      )}
    </div>
  );
}
