import React, { useEffect, useState, useCallback } from 'react';
import { Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Zap, Ghost, Shield, Radio, Snowflake, Gift } from 'lucide-react';
import { useStore } from '../store';
import { socketService } from '../services/socket';
import { getDistance } from '../../shared/utils';
import { POWERUP_TYPES } from '../../shared/constants';

// Create powerup marker icons
const createPowerupIcon = (powerup) => {
  const colors = {
    speed_boost: { bg: '#fbbf24', glow: '#f59e0b' },
    invisibility: { bg: '#a78bfa', glow: '#8b5cf6' },
    shield: { bg: '#60a5fa', glow: '#3b82f6' },
    radar: { bg: '#34d399', glow: '#10b981' },
    freeze: { bg: '#67e8f9', glow: '#22d3ee' },
  };
  
  const { bg, glow } = colors[powerup.type] || { bg: '#fff', glow: '#fff' };
  
  return L.divIcon({
    className: 'powerup-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: radial-gradient(circle, ${bg} 0%, ${glow} 100%);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 20px ${glow}, 0 0 40px ${glow}50;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        animation: float 2s ease-in-out infinite, glow 1.5s ease-in-out infinite alternate;
      ">
        ${POWERUP_TYPES[powerup.type.toUpperCase()]?.icon || '🎁'}
      </div>
      <style>
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 20px ${glow}, 0 0 40px ${glow}50; }
          100% { box-shadow: 0 0 30px ${glow}, 0 0 60px ${glow}80; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Collection radius in meters
const COLLECTION_RADIUS = 15;

export default function MapPowerups() {
  const { currentGame, user, addPowerup, settings } = useStore();
  const [powerups, setPowerups] = useState([]);
  const [collectingId, setCollectingId] = useState(null);
  const map = useMap();

  // Listen for powerup spawns from server
  useEffect(() => {
    const handlePowerupSpawn = (data) => {
      setPowerups(prev => [...prev, data.powerup]);
    };

    const handlePowerupCollected = (data) => {
      setPowerups(prev => prev.filter(p => p.id !== data.powerupId));
      if (data.playerId === user?.id) {
        // Show collection feedback
        setCollectingId(null);
      }
    };

    const handlePowerupsSync = (data) => {
      setPowerups(data.powerups || []);
    };

    socketService.on('powerup:spawned', handlePowerupSpawn);
    socketService.on('powerup:collected', handlePowerupCollected);
    socketService.on('powerups:sync', handlePowerupsSync);

    // Request current powerups on mount
    socketService.emit('powerups:request');

    return () => {
      socketService.off('powerup:spawned', handlePowerupSpawn);
      socketService.off('powerup:collected', handlePowerupCollected);
      socketService.off('powerups:sync', handlePowerupsSync);
    };
  }, [user?.id]);

  // Check if player is near any powerup
  useEffect(() => {
    if (!user?.location || !settings.enablePowerups || powerups.length === 0) return;

    const checkCollection = () => {
      for (const powerup of powerups) {
        const distance = getDistance(
          user.location.lat, user.location.lng,
          powerup.lat, powerup.lng
        );

        if (distance <= COLLECTION_RADIUS && !collectingId) {
          collectPowerup(powerup);
          break;
        }
      }
    };

    const interval = setInterval(checkCollection, 500);
    checkCollection();

    return () => clearInterval(interval);
  }, [user?.location, powerups, settings.enablePowerups, collectingId]);

  // Collect a powerup
  const collectPowerup = useCallback((powerup) => {
    if (collectingId) return;
    
    setCollectingId(powerup.id);
    
    // Haptic feedback
    if ('vibrate' in navigator && settings.vibration) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Emit collection to server
    socketService.emit('powerup:collect', { powerupId: powerup.id });
    
    // Add to local inventory (optimistic)
    addPowerup({
      id: powerup.id,
      type: powerup.type,
      ...POWERUP_TYPES[powerup.type.toUpperCase()],
      collectedAt: Date.now(),
    });
    
    // Clear collecting state after animation
    setTimeout(() => setCollectingId(null), 500);
  }, [collectingId, settings.vibration, addPowerup]);

  if (!currentGame || !settings.enablePowerups) return null;

  return (
    <>
      {powerups.map(powerup => {
        const isCollecting = collectingId === powerup.id;
        const distance = user?.location 
          ? getDistance(user.location.lat, user.location.lng, powerup.lat, powerup.lng)
          : null;
        const inRange = distance !== null && distance <= COLLECTION_RADIUS;

        return (
          <React.Fragment key={powerup.id}>
            {/* Collection radius circle */}
            <Circle
              center={[powerup.lat, powerup.lng]}
              radius={COLLECTION_RADIUS}
              pathOptions={{
                color: inRange ? '#10b981' : '#ffffff40',
                fillColor: inRange ? '#10b98130' : '#ffffff10',
                fillOpacity: 0.3,
                weight: inRange ? 2 : 1,
                dashArray: inRange ? null : '4, 4',
              }}
            />

            {/* Powerup marker */}
            <Marker
              position={[powerup.lat, powerup.lng]}
              icon={createPowerupIcon(powerup)}
              opacity={isCollecting ? 0.5 : 1}
            >
              <Popup>
                <div className="text-center p-2">
                  <div className="text-2xl mb-1">
                    {POWERUP_TYPES[powerup.type.toUpperCase()]?.icon || '🎁'}
                  </div>
                  <div className="font-bold text-gray-800">
                    {POWERUP_TYPES[powerup.type.toUpperCase()]?.name || powerup.type}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {POWERUP_TYPES[powerup.type.toUpperCase()]?.description}
                  </div>
                  {distance !== null && (
                    <div className={`text-xs mt-2 ${inRange ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                      {inRange ? '✓ In range!' : `${Math.round(distance)}m away`}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
