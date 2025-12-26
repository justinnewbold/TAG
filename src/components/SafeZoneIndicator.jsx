import React, { useEffect, useState } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { isInsideSafeZone } from './SafeZoneOverlay';

/**
 * HUD indicator shown when player is inside their safe zone
 * Displays at top of screen during active game
 */
export default function SafeZoneIndicator({ playerPosition, activeSafeZones }) {
  const [currentZone, setCurrentZone] = useState(null);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (!playerPosition || !activeSafeZones?.length) {
      setCurrentZone(null);
      return;
    }

    const zone = isInsideSafeZone(playerPosition, activeSafeZones);
    
    // Trigger pulse animation when entering zone
    if (zone && !currentZone) {
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 2000);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
    }
    
    setCurrentZone(zone);
  }, [playerPosition, activeSafeZones, currentZone]);

  if (!currentZone) {
    return null;
  }

  return (
    <div className={`
      fixed top-20 left-1/2 -translate-x-1/2 z-40
      px-4 py-2 rounded-full
      bg-gradient-to-r from-green-500/90 to-emerald-500/90
      border border-green-300/30
      shadow-lg shadow-green-500/30
      flex items-center gap-2
      ${showPulse ? 'animate-pulse-scale' : ''}
    `}>
      <ShieldCheck className="w-5 h-5 text-white" />
      <div>
        <span className="font-bold text-white">SAFE ZONE</span>
        <span className="text-white/80 text-sm ml-2">{currentZone.icon} {currentZone.name}</span>
      </div>
      
      <style jsx>{`
        @keyframes pulse-scale {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
        .animate-pulse-scale {
          animation: pulse-scale 0.5s ease-in-out 3;
        }
      `}</style>
    </div>
  );
}
