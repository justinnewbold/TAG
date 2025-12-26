import React from 'react';
import { Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';

/**
 * Renders all active player safe zones on the game map
 * Shows during active games when allowPersonalZones is enabled
 */

// Create zone marker icon
const createZoneMarker = (icon, playerName, isOwn) => L.divIcon({
  className: 'safe-zone-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: ${isOwn ? '#22c55e' : '#3b82f6'};
      border-radius: 50%;
      border: 3px solid ${isOwn ? '#86efac' : '#93c5fd'};
      box-shadow: 0 0 12px ${isOwn ? '#22c55e80' : '#3b82f680'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">
      ${icon}
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function SafeZoneOverlay({ players, gameSettings }) {
  const { user } = useStore();

  // Don't render if safe zones aren't allowed
  if (!gameSettings?.allowPersonalZones) {
    return null;
  }

  // Collect all active zones from all players
  const activeZones = [];
  
  players?.forEach(player => {
    if (player.activeSafeZones?.length > 0) {
      player.activeSafeZones.forEach(zone => {
        activeZones.push({
          ...zone,
          playerId: player.id,
          playerName: player.username || player.name,
          isOwn: player.id === user?.id,
        });
      });
    }
  });

  if (activeZones.length === 0) {
    return null;
  }

  return (
    <>
      {activeZones.map(zone => (
        <React.Fragment key={`${zone.playerId}-${zone.id}`}>
          {/* Zone Circle */}
          <Circle
            center={[zone.lat, zone.lng]}
            radius={zone.radius}
            pathOptions={{
              color: zone.isOwn ? '#22c55e' : '#3b82f6',
              fillColor: zone.isOwn ? '#22c55e' : '#3b82f6',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: zone.isOwn ? undefined : '5, 5',
            }}
          />
          
          {/* Zone Marker */}
          <Marker
            position={[zone.lat, zone.lng]}
            icon={createZoneMarker(zone.icon || '🛡️', zone.playerName, zone.isOwn)}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold flex items-center gap-1">
                  <span>{zone.icon || '🛡️'}</span>
                  <span>{zone.name}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {zone.playerName}'s safe zone
                </div>
                <div className="text-gray-400 text-xs">
                  {zone.radius}m radius
                </div>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Utility function to check if a position is inside any safe zone
 * @param {Object} position - {lat, lng}
 * @param {Array} zones - Array of zone objects with lat, lng, radius
 * @returns {Object|null} - The zone the position is inside, or null
 */
export function isInsideSafeZone(position, zones) {
  if (!position || !zones?.length) return null;
  
  for (const zone of zones) {
    const distance = getDistance(position, { lat: zone.lat, lng: zone.lng });
    if (distance <= zone.radius) {
      return zone;
    }
  }
  return null;
}

/**
 * Calculate distance between two points in meters
 */
function getDistance(pos1, pos2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = pos1.lat * Math.PI / 180;
  const φ2 = pos2.lat * Math.PI / 180;
  const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
  const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
