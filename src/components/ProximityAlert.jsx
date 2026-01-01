import { useState, useEffect, useRef } from 'react';
import { useStore, useSounds } from '../store';

export default function ProximityAlert({ nearbyPlayers = [], isIt }) {
  const { settings } = useStore();
  const { playSound, vibrate } = useSounds();
  const [alertLevel, setAlertLevel] = useState(0); // 0-3 intensity
  const [showPulse, setShowPulse] = useState(false);
  const lastAlertRef = useRef(0);

  useEffect(() => {
    if (nearbyPlayers.length === 0) {
      setAlertLevel(0);
      setShowPulse(false);
      return;
    }

    // Find closest player
    const closest = nearbyPlayers.reduce((min, p) => 
      p.distance < min.distance ? p : min
    , nearbyPlayers[0]);

    // Calculate alert level based on distance
    let level = 0;
    if (closest.distance < 10) level = 3;      // Very close - danger!
    else if (closest.distance < 25) level = 2; // Close
    else if (closest.distance < 50) level = 1; // Approaching

    setAlertLevel(level);
    setShowPulse(level >= 2);

    // Trigger alert effects (debounced)
    const now = Date.now();
    if (level >= 2 && now - lastAlertRef.current > 2000) {
      lastAlertRef.current = now;
      
      if (settings?.sound !== false) {
        playSound?.(level === 3 ? 'danger' : 'warning');
      }
      
      if (settings?.vibration !== false) {
        vibrate?.(level === 3 ? [100, 50, 100, 50, 100] : [50, 50, 50]);
      }
    }
  }, [nearbyPlayers, settings, playSound, vibrate]);

  if (alertLevel === 0) return null;

  const colors = {
    1: 'from-yellow-500/20 to-transparent border-yellow-500',
    2: 'from-orange-500/30 to-transparent border-orange-500',
    3: 'from-red-500/40 to-transparent border-red-500',
  };

  const messages = {
    1: isIt ? '👀 Players nearby!' : '⚠️ IT is approaching!',
    2: isIt ? '🎯 Getting close!' : '😰 IT is close!',
    3: isIt ? '🏃 TAG THEM NOW!' : '🚨 DANGER! RUN!',
  };

  return (
    <>
      {/* Screen border effect */}
      <div 
        className={`fixed inset-0 pointer-events-none z-40 bg-gradient-to-b ${colors[alertLevel]} border-4 ${
          showPulse ? 'animate-pulse' : ''
        }`}
        style={{ borderColor: 'inherit' }}
      />

      {/* Alert banner */}
      <div 
        className={`fixed top-safe left-4 right-4 z-50 p-3 rounded-xl shadow-lg text-center ${
          alertLevel === 3 
            ? 'bg-red-500 animate-bounce' 
            : alertLevel === 2 
              ? 'bg-orange-500' 
              : 'bg-yellow-500'
        }`}
      >
        <p className="font-bold text-white text-lg">{messages[alertLevel]}</p>
        {nearbyPlayers.length > 0 && (
          <p className="text-white/80 text-sm mt-1">
            {nearbyPlayers.length} player{nearbyPlayers.length > 1 ? 's' : ''} within {Math.round(nearbyPlayers[0]?.distance || 0)}m
          </p>
        )}
      </div>

      {/* Directional indicators */}
      {alertLevel >= 2 && nearbyPlayers.slice(0, 3).map((player, i) => (
        <DirectionIndicator 
          key={player.id || i} 
          player={player} 
          index={i}
          isIt={isIt}
        />
      ))}
    </>
  );
}

function DirectionIndicator({ player, index, isIt }) {
  const { bearing, distance } = player;
  
  if (bearing === undefined) return null;

  // Convert bearing to position on screen edge
  const angle = (bearing - 90) * (Math.PI / 180);
  const radius = 45; // % from center
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div 
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
          isIt ? 'bg-green-500' : 'bg-red-500'
        } animate-pulse`}
        style={{ transform: `rotate(${bearing}deg)` }}
      >
        <span className="text-white text-2xl" style={{ transform: `rotate(-${bearing}deg)` }}>
          {isIt ? '🎯' : '⚠️'}
        </span>
      </div>
      <p className="text-center text-xs font-bold text-white mt-1 drop-shadow-lg">
        {Math.round(distance)}m
      </p>
    </div>
  );
}
