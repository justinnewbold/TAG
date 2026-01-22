/**
 * Mini-Map Radar Component
 * Shows nearby players as blips with direction and distance
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Radar,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Target,
  Navigation,
  Circle,
} from 'lucide-react';

// Radar configuration
const RADAR_CONFIG = {
  DEFAULT_RANGE: 100, // meters
  MIN_RANGE: 25,
  MAX_RANGE: 500,
  SWEEP_SPEED: 3000, // ms per rotation
  UPDATE_INTERVAL: 500, // ms
  BLIP_FADE_TIME: 2000, // ms
};

// Player blip types
const BLIP_TYPES = {
  IT: {
    color: '#ef4444', // red
    pulseColor: 'rgba(239, 68, 68, 0.5)',
    size: 12,
    priority: 1,
  },
  RUNNER: {
    color: '#22c55e', // green
    pulseColor: 'rgba(34, 197, 94, 0.5)',
    size: 8,
    priority: 2,
  },
  ALLY: {
    color: '#3b82f6', // blue
    pulseColor: 'rgba(59, 130, 246, 0.5)',
    size: 8,
    priority: 3,
  },
  POWERUP: {
    color: '#f59e0b', // amber
    pulseColor: 'rgba(245, 158, 11, 0.5)',
    size: 6,
    priority: 4,
  },
  ZONE: {
    color: '#8b5cf6', // purple
    pulseColor: 'rgba(139, 92, 246, 0.3)',
    size: 0, // drawn as area
    priority: 5,
  },
};

// Calculate bearing between two points
function calculateBearing(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(from, to) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Convert polar coordinates to cartesian for radar display
function polarToCartesian(bearing, distance, maxDistance, radarSize) {
  const radius = (radarSize / 2) * Math.min(distance / maxDistance, 1);
  const angleRad = ((bearing - 90) * Math.PI) / 180; // Adjust so 0° is up

  return {
    x: radarSize / 2 + radius * Math.cos(angleRad),
    y: radarSize / 2 + radius * Math.sin(angleRad),
  };
}

// Single blip component
function Blip({ x, y, type, player, isNew, onClick, showLabel }) {
  const config = BLIP_TYPES[type] || BLIP_TYPES.RUNNER;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick?.(player)}
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      {/* Pulse effect for new/important blips */}
      {isNew && (
        <circle
          cx={0}
          cy={0}
          r={config.size + 6}
          fill={config.pulseColor}
          className="animate-ping"
        />
      )}

      {/* Main blip */}
      <circle cx={0} cy={0} r={config.size / 2} fill={config.color} />

      {/* IT indicator */}
      {type === 'IT' && (
        <circle
          cx={0}
          cy={0}
          r={config.size / 2 + 3}
          fill="none"
          stroke={config.color}
          strokeWidth="2"
          className="animate-pulse"
        />
      )}

      {/* Label */}
      {showLabel && player && (
        <text
          x={0}
          y={-config.size / 2 - 4}
          textAnchor="middle"
          className="text-xs fill-white font-medium"
          style={{ fontSize: '10px' }}
        >
          {player.name?.slice(0, 8)}
        </text>
      )}
    </g>
  );
}

// Radar sweep line
function SweepLine({ angle, size }) {
  const angleRad = ((angle - 90) * Math.PI) / 180;
  const endX = size / 2 + (size / 2) * Math.cos(angleRad);
  const endY = size / 2 + (size / 2) * Math.sin(angleRad);

  return (
    <g>
      {/* Sweep gradient */}
      <defs>
        <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 0.5)" />
        </linearGradient>
      </defs>

      {/* Sweep cone */}
      <path
        d={`M ${size / 2} ${size / 2} L ${endX} ${endY} A ${size / 2} ${size / 2} 0 0 0 ${
          size / 2 + (size / 2) * Math.cos(((angle - 120) * Math.PI) / 180)
        } ${size / 2 + (size / 2) * Math.sin(((angle - 120) * Math.PI) / 180)} Z`}
        fill="url(#sweepGradient)"
        opacity={0.3}
      />

      {/* Sweep line */}
      <line
        x1={size / 2}
        y1={size / 2}
        x2={endX}
        y2={endY}
        stroke="rgba(34, 211, 238, 0.8)"
        strokeWidth="2"
      />
    </g>
  );
}

// Range rings
function RangeRings({ size, range, ringCount = 3 }) {
  const rings = [];
  for (let i = 1; i <= ringCount; i++) {
    const radius = (size / 2 / ringCount) * i;
    const distance = Math.round((range / ringCount) * i);
    rings.push(
      <g key={i}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* Distance label */}
        <text
          x={size / 2 + radius + 2}
          y={size / 2 - 2}
          className="fill-gray-500"
          style={{ fontSize: '8px' }}
        >
          {distance}m
        </text>
      </g>
    );
  }
  return <>{rings}</>;
}

// Cardinal direction markers
function DirectionMarkers({ size }) {
  const directions = [
    { label: 'N', angle: 0 },
    { label: 'E', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'W', angle: 270 },
  ];

  return (
    <>
      {directions.map(({ label, angle }) => {
        const angleRad = ((angle - 90) * Math.PI) / 180;
        const x = size / 2 + (size / 2 - 12) * Math.cos(angleRad);
        const y = size / 2 + (size / 2 - 12) * Math.sin(angleRad);

        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 font-bold"
            style={{ fontSize: '10px' }}
          >
            {label}
          </text>
        );
      })}
    </>
  );
}

// Main MiniMapRadar component
export default function MiniMapRadar({
  currentLocation,
  currentHeading = 0,
  players = [],
  powerUps = [],
  zones = [],
  currentUserId,
  isIt = false,
  range = RADAR_CONFIG.DEFAULT_RANGE,
  size = 200,
  showSweep = true,
  showLabels = false,
  onPlayerClick,
  onRangeChange,
  className = '',
}) {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localRange, setLocalRange] = useState(range);
  const [blipHistory, setBlipHistory] = useState(new Map());
  const svgRef = useRef(null);

  // Animated sweep
  useEffect(() => {
    if (!showSweep) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const angle = (elapsed / RADAR_CONFIG.SWEEP_SPEED) * 360;
      setSweepAngle(angle % 360);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [showSweep]);

  // Calculate blips from players
  const blips = useMemo(() => {
    if (!currentLocation) return [];

    const result = [];

    // Add players
    players.forEach((player) => {
      if (player.id === currentUserId) return;
      if (!player.location) return;

      const distance = calculateDistance(currentLocation, player.location);
      if (distance > localRange) return;

      const bearing = calculateBearing(currentLocation, player.location);
      // Adjust bearing based on current heading (so "up" is always forward)
      const adjustedBearing = (bearing - currentHeading + 360) % 360;

      const pos = polarToCartesian(adjustedBearing, distance, localRange, size);

      result.push({
        id: player.id,
        type: player.isIt ? 'IT' : 'RUNNER',
        x: pos.x,
        y: pos.y,
        distance,
        bearing: adjustedBearing,
        player,
        isNew: !blipHistory.has(player.id),
      });
    });

    // Add power-ups
    powerUps.forEach((powerUp) => {
      if (!powerUp.location) return;

      const distance = calculateDistance(currentLocation, powerUp.location);
      if (distance > localRange) return;

      const bearing = calculateBearing(currentLocation, powerUp.location);
      const adjustedBearing = (bearing - currentHeading + 360) % 360;
      const pos = polarToCartesian(adjustedBearing, distance, localRange, size);

      result.push({
        id: powerUp.id,
        type: 'POWERUP',
        x: pos.x,
        y: pos.y,
        distance,
        bearing: adjustedBearing,
        powerUp,
        isNew: !blipHistory.has(powerUp.id),
      });
    });

    // Sort by priority (IT first, then by distance)
    result.sort((a, b) => {
      const priorityA = BLIP_TYPES[a.type]?.priority || 99;
      const priorityB = BLIP_TYPES[b.type]?.priority || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.distance - b.distance;
    });

    return result;
  }, [currentLocation, currentHeading, players, powerUps, localRange, size, blipHistory, currentUserId]);

  // Track blip history for "new" detection
  useEffect(() => {
    const newHistory = new Map();
    blips.forEach((blip) => {
      newHistory.set(blip.id, Date.now());
    });
    setBlipHistory(newHistory);
  }, [blips.length]);

  // Handle range change
  const handleRangeChange = useCallback((newRange) => {
    setLocalRange(newRange);
    onRangeChange?.(newRange);
  }, [onRangeChange]);

  // Find nearest threat/target
  const nearestThreat = useMemo(() => {
    if (isIt) {
      // IT looks for nearest runner
      return blips.find((b) => b.type === 'RUNNER');
    } else {
      // Runner looks for IT
      return blips.find((b) => b.type === 'IT');
    }
  }, [blips, isIt]);

  const displaySize = isExpanded ? size * 1.5 : size;

  if (!currentLocation) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center text-gray-500">
          <Navigation className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p className="text-xs">Acquiring GPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-gray-900/90 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 transition-all duration-300 ${className}`}
      style={{ width: displaySize, height: displaySize }}
    >
      {/* SVG Radar */}
      <svg
        ref={svgRef}
        width={displaySize}
        height={displaySize}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="rgba(15, 23, 42, 0.8)"
          stroke="rgba(100, 116, 139, 0.5)"
          strokeWidth="2"
        />

        {/* Range rings */}
        <RangeRings size={size} range={localRange} />

        {/* Direction markers */}
        <DirectionMarkers size={size} />

        {/* Cross hairs */}
        <line
          x1={size / 2}
          y1={4}
          x2={size / 2}
          y2={size - 4}
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth="1"
        />
        <line
          x1={4}
          y1={size / 2}
          x2={size - 4}
          y2={size / 2}
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth="1"
        />

        {/* Sweep line */}
        {showSweep && <SweepLine angle={sweepAngle} size={size} />}

        {/* Zone overlays */}
        {zones.map((zone) => {
          if (!zone.location) return null;
          const distance = calculateDistance(currentLocation, zone.location);
          if (distance > localRange + (zone.radius || 0)) return null;

          const bearing = calculateBearing(currentLocation, zone.location);
          const adjustedBearing = (bearing - currentHeading + 360) % 360;
          const pos = polarToCartesian(adjustedBearing, distance, localRange, size);
          const zoneRadius = ((zone.radius || 20) / localRange) * (size / 2);

          return (
            <circle
              key={zone.id}
              cx={pos.x}
              cy={pos.y}
              r={zoneRadius}
              fill={BLIP_TYPES.ZONE.pulseColor}
              stroke={BLIP_TYPES.ZONE.color}
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          );
        })}

        {/* Player blips */}
        {blips.map((blip) => (
          <Blip
            key={blip.id}
            x={blip.x}
            y={blip.y}
            type={blip.type}
            player={blip.player}
            isNew={blip.isNew}
            onClick={onPlayerClick}
            showLabel={showLabels}
          />
        ))}

        {/* Center point (you) */}
        <circle cx={size / 2} cy={size / 2} r={4} fill="#22d3ee" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={8}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          opacity={0.5}
        />

        {/* Direction indicator (heading) */}
        <polygon
          points={`${size / 2},${size / 2 - 12} ${size / 2 - 4},${size / 2 - 4} ${size / 2 + 4},${size / 2 - 4}`}
          fill="#22d3ee"
        />
      </svg>

      {/* Nearest threat indicator */}
      {nearestThreat && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
          {nearestThreat.type === 'IT' ? (
            <Zap className="w-3 h-3 text-red-400" />
          ) : (
            <Target className="w-3 h-3 text-green-400" />
          )}
          <span className="text-xs text-white font-medium">
            {Math.round(nearestThreat.distance)}m
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
        >
          {isExpanded ? (
            <Minimize2 className="w-3.5 h-3.5 text-white" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          )}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-white">
            <span>Range: {localRange}m</span>
          </div>
          <input
            type="range"
            min={RADAR_CONFIG.MIN_RANGE}
            max={RADAR_CONFIG.MAX_RANGE}
            step={25}
            value={localRange}
            onChange={(e) => handleRangeChange(Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{RADAR_CONFIG.MIN_RANGE}m</span>
            <span>{RADAR_CONFIG.MAX_RANGE}m</span>
          </div>
        </div>
      )}

      {/* Player count */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
        <Radar className="w-3 h-3 text-cyan-400" />
        <span className="text-xs text-white">{blips.filter((b) => b.player).length}</span>
      </div>
    </div>
  );
}

// Hook for radar state management
export function useRadar(socket, gameId) {
  const [radarEnabled, setRadarEnabled] = useState(true);
  const [range, setRange] = useState(RADAR_CONFIG.DEFAULT_RANGE);
  const [heading, setHeading] = useState(0);

  // Track device heading
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.alpha !== null) {
        setHeading(event.alpha);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Power-up effects on radar
  useEffect(() => {
    if (!socket) return;

    const handlePowerUp = (data) => {
      if (data.type === 'radar_boost') {
        setRange((prev) => Math.min(prev * 2, RADAR_CONFIG.MAX_RANGE));
        setTimeout(() => setRange(RADAR_CONFIG.DEFAULT_RANGE), data.duration || 30000);
      } else if (data.type === 'radar_jam') {
        setRadarEnabled(false);
        setTimeout(() => setRadarEnabled(true), data.duration || 10000);
      }
    };

    socket.on('game:powerUpEffect', handlePowerUp);
    return () => socket.off('game:powerUpEffect', handlePowerUp);
  }, [socket]);

  return {
    radarEnabled,
    setRadarEnabled,
    range,
    setRange,
    heading,
  };
}
