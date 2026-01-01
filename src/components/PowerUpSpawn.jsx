import { useState, useEffect } from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

const POWER_UP_ICONS = {
  speed: '⚡',
  ghost: '👻', 
  shield: '🛡️',
  radar: '📡',
  freeze: '❄️',
  swap: '🔄',
  magnet: '🧲',
  mystery: '❓',
};

const POWER_UP_COLORS = {
  speed: '#f59e0b',
  ghost: '#8b5cf6',
  shield: '#3b82f6',
  radar: '#10b981',
  freeze: '#06b6d4',
  swap: '#ec4899',
  magnet: '#ef4444',
  mystery: '#6b7280',
};

// Create custom icon for power-up
const createPowerUpIcon = (type) => {
  const emoji = POWER_UP_ICONS[type] || '❓';
  const color = POWER_UP_COLORS[type] || '#6b7280';
  
  return L.divIcon({
    className: 'power-up-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, ${color}, ${color}99);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 0 20px ${color}80, 0 4px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
        border: 3px solid white;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export default function PowerUpSpawn({ spawn, onCollect, playerPosition }) {
  const [isCollectable, setIsCollectable] = useState(false);
  const [respawnTimer, setRespawnTimer] = useState(null);

  const { id, type, position, collectedAt, respawnTime = 60 } = spawn;

  useEffect(() => {
    if (!playerPosition || !position) return;

    // Check if player is within collection range (15 meters)
    const distance = calculateDistance(
      playerPosition.lat, playerPosition.lng,
      position.lat, position.lng
    );

    setIsCollectable(distance <= 15);
  }, [playerPosition, position]);

  useEffect(() => {
    if (!collectedAt) {
      setRespawnTimer(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = (Date.now() - collectedAt) / 1000;
      const remaining = Math.max(0, respawnTime - elapsed);
      setRespawnTimer(Math.ceil(remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [collectedAt, respawnTime]);

  // Don't show if recently collected
  if (collectedAt && respawnTimer && respawnTimer > 0) {
    return null;
  }

  if (!position?.lat || !position?.lng) return null;

  return (
    <>
      {/* Collection range circle */}
      <Circle
        center={[position.lat, position.lng]}
        radius={15}
        pathOptions={{
          color: POWER_UP_COLORS[type] || '#6b7280',
          fillColor: POWER_UP_COLORS[type] || '#6b7280',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        }}
      />

      {/* Power-up marker */}
      <Marker
        position={[position.lat, position.lng]}
        icon={createPowerUpIcon(type)}
        eventHandlers={{
          click: () => {
            if (isCollectable) {
              onCollect?.(id, type);
            }
          },
        }}
      >
        <Popup>
          <div className="text-center p-2">
            <span className="text-3xl block mb-2">{POWER_UP_ICONS[type]}</span>
            <p className="font-bold capitalize">{type} Power-Up</p>
            {isCollectable ? (
              <button
                onClick={() => onCollect?.(id, type)}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold"
              >
                Collect!
              </button>
            ) : (
              <p className="text-sm text-gray-500 mt-1">Get closer to collect</p>
            )}
          </div>
        </Popup>
      </Marker>
    </>
  );
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
