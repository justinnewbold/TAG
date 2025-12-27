import { useState, useEffect, useCallback, useMemo } from 'react';
import { Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Power-up Types and Configurations
 */
export const POWERUP_TYPES = {
  SPEED_BOOST: {
    id: 'speed_boost',
    name: 'Speed Boost',
    icon: '⚡',
    color: '#FFD700',
    duration: 30000, // 30 seconds
    description: 'Move 50% faster for 30 seconds',
    effect: { type: 'speed', multiplier: 1.5 },
    rarity: 'common',
    spawnWeight: 30
  },
  INVISIBILITY: {
    id: 'invisibility',
    name: 'Invisibility',
    icon: '👻',
    color: '#9B59B6',
    duration: 15000, // 15 seconds
    description: 'Become invisible to other players',
    effect: { type: 'visibility', hidden: true },
    rarity: 'rare',
    spawnWeight: 15
  },
  SHIELD: {
    id: 'shield',
    name: 'Shield',
    icon: '🛡️',
    color: '#3498DB',
    duration: 20000, // 20 seconds
    description: 'Block one tag attempt',
    effect: { type: 'shield', charges: 1 },
    rarity: 'uncommon',
    spawnWeight: 20
  },
  RADAR: {
    id: 'radar',
    name: 'Radar Pulse',
    icon: '📡',
    color: '#2ECC71',
    duration: 10000, // 10 seconds
    description: 'See all players on the map',
    effect: { type: 'radar', range: 500 },
    rarity: 'uncommon',
    spawnWeight: 20
  },
  FREEZE: {
    id: 'freeze',
    name: 'Freeze Trap',
    icon: '❄️',
    color: '#00D9FF',
    duration: 5000, // 5 seconds
    description: 'Freeze nearby players',
    effect: { type: 'freeze', radius: 20 },
    rarity: 'rare',
    spawnWeight: 10
  },
  TELEPORT: {
    id: 'teleport',
    name: 'Teleport',
    icon: '🌀',
    color: '#E91E63',
    duration: 0, // instant
    description: 'Teleport to a random location',
    effect: { type: 'teleport', range: 200 },
    rarity: 'epic',
    spawnWeight: 5
  }
};

/**
 * Create custom Leaflet icon for power-up
 */
const createPowerupIcon = (powerup) => {
  return L.divIcon({
    className: 'powerup-marker',
    html: `
      <div class="powerup-container" style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, ${powerup.color}40, ${powerup.color}80);
        border: 3px solid ${powerup.color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        animation: powerup-pulse 2s ease-in-out infinite;
        box-shadow: 0 0 15px ${powerup.color}60;
      ">
        ${powerup.icon}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

/**
 * Power-ups Map Layer Component
 */
export function PowerupsLayer({ 
  powerups = [], 
  onCollect,
  playerPosition,
  collectRadius = 15 // meters
}) {
  const map = useMap();
  
  // Check for nearby powerups
  useEffect(() => {
    if (!playerPosition) return;
    
    powerups.forEach(powerup => {
      const distance = calculateDistance(
        playerPosition,
        { lat: powerup.position.lat, lng: powerup.position.lng }
      );
      
      if (distance <= collectRadius && onCollect) {
        onCollect(powerup);
      }
    });
  }, [playerPosition, powerups, collectRadius, onCollect]);

  return (
    <>
      {powerups.map((powerup) => {
        const config = POWERUP_TYPES[powerup.type];
        if (!config) return null;
        
        return (
          <Marker
            key={powerup.id}
            position={[powerup.position.lat, powerup.position.lng]}
            icon={createPowerupIcon(config)}
          >
            <Popup className="powerup-popup">
              <div className="text-center p-2">
                <div className="text-3xl mb-2">{config.icon}</div>
                <h3 className="font-bold text-gray-800">{config.name}</h3>
                <p className="text-sm text-gray-600">{config.description}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                  config.rarity === 'common' ? 'bg-gray-100 text-gray-600' :
                  config.rarity === 'uncommon' ? 'bg-green-100 text-green-600' :
                  config.rarity === 'rare' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {config.rarity.toUpperCase()}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

/**
 * Active Power-ups Display Component
 */
export function ActivePowerupsDisplay({ activePowerups = [] }) {
  return (
    <div className="fixed top-24 right-4 z-40 space-y-2">
      {activePowerups.map((powerup, index) => {
        const config = POWERUP_TYPES[powerup.type];
        if (!config) return null;
        
        const remainingTime = Math.max(0, powerup.expiresAt - Date.now());
        const progress = (remainingTime / config.duration) * 100;
        
        return (
          <div
            key={powerup.id || index}
            className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-lg border-l-4"
            style={{ borderColor: config.color }}
          >
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{config.name}</p>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: config.color
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {Math.ceil(remainingTime / 1000)}s
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Power-up Collection Notification
 */
export function PowerupCollectedToast({ powerup, onClose }) {
  const config = POWERUP_TYPES[powerup?.type];
  
  useEffect(() => {
    if (powerup) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [powerup, onClose]);

  if (!powerup || !config) return null;

  return (
    <div 
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce-in"
    >
      <div 
        className="flex flex-col items-center p-6 rounded-2xl shadow-2xl"
        style={{ backgroundColor: `${config.color}20`, borderColor: config.color, borderWidth: 2 }}
      >
        <div className="text-6xl mb-3 animate-bounce">{config.icon}</div>
        <h2 className="text-xl font-bold text-gray-800">{config.name}</h2>
        <p className="text-sm text-gray-600 text-center mt-1">{config.description}</p>
      </div>
    </div>
  );
}

/**
 * Power-ups Settings Component
 */
export function PowerupsSettings({ settings, onChange }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [spawnRate, setSpawnRate] = useState(settings?.spawnRate ?? 60);
  const [maxPowerups, setMaxPowerups] = useState(settings?.maxPowerups ?? 5);
  const [enabledTypes, setEnabledTypes] = useState(
    settings?.enabledTypes ?? Object.keys(POWERUP_TYPES)
  );

  const handleToggleType = (typeId) => {
    const newTypes = enabledTypes.includes(typeId)
      ? enabledTypes.filter(t => t !== typeId)
      : [...enabledTypes, typeId];
    setEnabledTypes(newTypes);
    onChange?.({ ...settings, enabledTypes: newTypes });
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <h4 className="font-medium text-gray-800">Power-ups</h4>
          <p className="text-sm text-gray-500">Collectible items on the map</p>
        </div>
        <button
          onClick={() => {
            setEnabled(!enabled);
            onChange?.({ ...settings, enabled: !enabled });
          }}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            enabled ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'left-8' : 'left-1'
          }`} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Spawn Rate */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Spawn Rate</span>
              <span className="text-sm text-gray-500">{spawnRate}s</span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="30"
              value={spawnRate}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSpawnRate(val);
                onChange?.({ ...settings, spawnRate: val });
              }}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>30s</span>
              <span>5min</span>
            </div>
          </div>

          {/* Max Power-ups */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Max on Map</span>
              <span className="text-sm text-gray-500">{maxPowerups}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={maxPowerups}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setMaxPowerups(val);
                onChange?.({ ...settings, maxPowerups: val });
              }}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Power-up Types */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Enabled Power-ups</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(POWERUP_TYPES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleToggleType(key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    enabledTypes.includes(key)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-xl">{config.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{config.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Calculate distance between two positions
 */
function calculateDistance(pos1, pos2) {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = pos1.lat * Math.PI / 180;
  const lat2 = pos2.lat * Math.PI / 180;
  const deltaLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const deltaLng = (pos2.lng - pos1.lng) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Custom hook for managing power-ups
 */
export function usePowerups(socket, gameId, settings) {
  const [powerups, setPowerups] = useState([]);
  const [activePowerups, setActivePowerups] = useState([]);
  const [collectedPowerup, setCollectedPowerup] = useState(null);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('powerup:spawned', (powerup) => {
      setPowerups(prev => [...prev, powerup]);
    });

    socket.on('powerup:collected', ({ powerupId, playerId }) => {
      setPowerups(prev => prev.filter(p => p.id !== powerupId));
    });

    socket.on('powerup:expired', ({ powerupId }) => {
      setPowerups(prev => prev.filter(p => p.id !== powerupId));
    });

    return () => {
      socket.off('powerup:spawned');
      socket.off('powerup:collected');
      socket.off('powerup:expired');
    };
  }, [socket]);

  // Clean up expired active powerups
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActivePowerups(prev => prev.filter(p => p.expiresAt > now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Collect powerup
  const collectPowerup = useCallback((powerup) => {
    if (!socket || !gameId) return;

    const config = POWERUP_TYPES[powerup.type];
    if (!config) return;

    // Remove from map
    setPowerups(prev => prev.filter(p => p.id !== powerup.id));

    // Add to active powerups
    const activePowerup = {
      ...powerup,
      collectedAt: Date.now(),
      expiresAt: Date.now() + config.duration
    };
    
    setActivePowerups(prev => [...prev, activePowerup]);
    setCollectedPowerup(powerup);

    // Notify server
    socket.emit('powerup:collect', { gameId, powerupId: powerup.id });
  }, [socket, gameId]);

  // Clear collected notification
  const clearCollectedNotification = useCallback(() => {
    setCollectedPowerup(null);
  }, []);

  // Check if player has specific powerup active
  const hasPowerup = useCallback((type) => {
    return activePowerups.some(p => p.type === type && p.expiresAt > Date.now());
  }, [activePowerups]);

  return {
    powerups,
    activePowerups,
    collectedPowerup,
    collectPowerup,
    clearCollectedNotification,
    hasPowerup
  };
}

export default {
  POWERUP_TYPES,
  PowerupsLayer,
  ActivePowerupsDisplay,
  PowerupCollectedToast,
  PowerupsSettings,
  usePowerups
};
