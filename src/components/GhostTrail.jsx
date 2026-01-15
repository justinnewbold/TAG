import React, { useEffect, useState } from 'react';
import { Polyline, CircleMarker, useMap } from 'react-leaflet';
import { ghostTrailService } from '../services/ghostTrailService';

/**
 * GhostTrail Component
 *
 * Renders the ghost trail on the map showing where players were.
 * IT sees delayed positions, creating cat-and-mouse tension.
 */
export default function GhostTrail({
  playerId,
  playerColor = '#EF4444',
  isCurrentUserIT = false,
  showTrail = true,
  showDelayedMarker = true,
  showPrediction = false,
}) {
  const [trail, setTrail] = useState([]);
  const [delayedLocation, setDelayedLocation] = useState(null);
  const [predictedLocation, setPredictedLocation] = useState(null);
  const [movementInfo, setMovementInfo] = useState(null);

  // Update trail data periodically
  useEffect(() => {
    const updateTrail = () => {
      if (showTrail) {
        const trailData = ghostTrailService.getTrail(playerId);
        setTrail(trailData);
      }

      if (isCurrentUserIT && showDelayedMarker) {
        const delayed = ghostTrailService.getDelayedLocation(playerId);
        setDelayedLocation(delayed);
      }

      if (showPrediction) {
        const predicted = ghostTrailService.getPredictedLocation(playerId);
        setPredictedLocation(predicted);

        const movement = ghostTrailService.getMovementInfo(playerId);
        setMovementInfo(movement);
      }
    };

    updateTrail();
    const interval = setInterval(updateTrail, 2000);

    return () => clearInterval(interval);
  }, [playerId, isCurrentUserIT, showTrail, showDelayedMarker, showPrediction]);

  // Trail color gradient based on age
  const getTrailColor = (fadeSegment) => {
    const opacity = 1 - fadeSegment * 0.2;
    return `rgba(${hexToRgb(playerColor)}, ${opacity})`;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '239, 68, 68';
  };

  // Convert trail to polyline positions
  const trailPositions = trail.map((point) => [point.lat, point.lng]);

  return (
    <>
      {/* Ghost trail line */}
      {showTrail && trailPositions.length > 1 && (
        <Polyline
          positions={trailPositions}
          pathOptions={{
            color: playerColor,
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 10',
            lineCap: 'round',
          }}
        />
      )}

      {/* Trail point markers with fading opacity */}
      {showTrail &&
        trail.map((point, index) => (
          <CircleMarker
            key={`trail-${playerId}-${index}`}
            center={[point.lat, point.lng]}
            radius={4}
            pathOptions={{
              color: playerColor,
              fillColor: playerColor,
              fillOpacity: point.opacity * 0.5,
              opacity: point.opacity,
              weight: 1,
            }}
          />
        ))}

      {/* Delayed location marker (what IT sees) */}
      {isCurrentUserIT && delayedLocation && showDelayedMarker && (
        <>
          {/* Pulsing ring to indicate it's a delayed position */}
          <CircleMarker
            center={[delayedLocation.lat, delayedLocation.lng]}
            radius={20}
            pathOptions={{
              color: playerColor,
              fillColor: 'transparent',
              opacity: 0.4,
              weight: 2,
              dashArray: '5, 5',
            }}
          />

          {/* Ghost marker */}
          <CircleMarker
            center={[delayedLocation.lat, delayedLocation.lng]}
            radius={8}
            pathOptions={{
              color: '#FFFFFF',
              fillColor: playerColor,
              fillOpacity: 0.7,
              opacity: 0.8,
              weight: 2,
            }}
          >
            {/* Age indicator */}
          </CircleMarker>
        </>
      )}

      {/* Predicted location (dotted) */}
      {showPrediction && predictedLocation && (
        <>
          {/* Line from last known to predicted */}
          {delayedLocation && (
            <Polyline
              positions={[
                [delayedLocation.lat, delayedLocation.lng],
                [predictedLocation.lat, predictedLocation.lng],
              ]}
              pathOptions={{
                color: playerColor,
                weight: 2,
                opacity: 0.3,
                dashArray: '2, 8',
              }}
            />
          )}

          {/* Predicted position marker */}
          <CircleMarker
            center={[predictedLocation.lat, predictedLocation.lng]}
            radius={6}
            pathOptions={{
              color: playerColor,
              fillColor: 'transparent',
              opacity: predictedLocation.confidence * 0.5,
              weight: 2,
              dashArray: '3, 3',
            }}
          />
        </>
      )}
    </>
  );
}

/**
 * GhostTrailLegend Component
 * Shows what the ghost trail indicators mean
 */
export function GhostTrailLegend({ delayTime = 45 }) {
  return (
    <div className="bg-gray-900/90 rounded-lg p-3 text-sm">
      <div className="text-gray-400 text-xs uppercase mb-2">Location Delay Active</div>
      <div className="flex items-center gap-2 text-gray-300">
        <div className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
        <span>Player was here ~{delayTime}s ago</span>
      </div>
      <div className="flex items-center gap-2 text-gray-400 mt-1">
        <div className="w-8 h-0.5 bg-red-500 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor, currentColor 4px, transparent 4px, transparent 8px)' }} />
        <span className="text-xs">Movement trail</span>
      </div>
    </div>
  );
}
