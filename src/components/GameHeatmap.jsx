import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Play, Pause, SkipBack, SkipForward, X, Activity, MapPin, Clock, Target } from 'lucide-react';

// Generate heatmap color based on activity intensity
const getHeatColor = (intensity) => {
  const colors = [
    { threshold: 0.2, color: '#22d3ee' },   // cyan
    { threshold: 0.4, color: '#22c55e' },   // green
    { threshold: 0.6, color: '#eab308' },   // yellow
    { threshold: 0.8, color: '#f97316' },   // orange
    { threshold: 1.0, color: '#ef4444' },   // red
  ];
  
  for (const { threshold, color } of colors) {
    if (intensity <= threshold) return color;
  }
  return colors[colors.length - 1].color;
};

// Create tag event marker
const createTagMarker = (isYou) => L.divIcon({
  className: 'tag-marker',
  html: `
    <div style="
      width: 24px; height: 24px;
      background: ${isYou ? '#ef4444' : '#22c55e'};
      border-radius: 50%;
      border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      box-shadow: 0 0 10px ${isYou ? '#ef4444' : '#22c55e'};
    ">
      ${isYou ? '💥' : '✓'}
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function GameHeatmap({ game, isOpen, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [showTags, setShowTags] = useState(true);

  // Process game data for visualization
  const gameData = useMemo(() => {
    if (!game?.locationHistory) return null;

    const duration = game.endedAt - game.startedAt;
    const players = {};
    const tagEvents = game.tagHistory || [];
    const hotspots = [];

    // Process location history
    for (const entry of game.locationHistory) {
      if (!players[entry.playerId]) {
        const player = game.players.find(p => p.id === entry.playerId);
        players[entry.playerId] = {
          id: entry.playerId,
          name: player?.username || 'Unknown',
          color: player?.colorTheme || 'cyan',
          path: [],
          heatPoints: [],
        };
      }
      
      players[entry.playerId].path.push({
        lat: entry.lat,
        lng: entry.lng,
        time: entry.timestamp - game.startedAt,
      });
    }

    // Generate heatmap points (grid-based density)
    const gridSize = 0.0001; // ~10m grid cells
    const grid = {};
    
    for (const playerId in players) {
      for (const point of players[playerId].path) {
        const gridKey = `${Math.floor(point.lat / gridSize)},${Math.floor(point.lng / gridSize)}`;
        grid[gridKey] = (grid[gridKey] || 0) + 1;
      }
    }

    const maxDensity = Math.max(...Object.values(grid));
    for (const [key, count] of Object.entries(grid)) {
      const [latGrid, lngGrid] = key.split(',').map(Number);
      hotspots.push({
        lat: latGrid * gridSize + gridSize / 2,
        lng: lngGrid * gridSize + gridSize / 2,
        intensity: count / maxDensity,
        count,
      });
    }

    // Calculate center
    const allPoints = Object.values(players).flatMap(p => p.path);
    const center = allPoints.length > 0 ? {
      lat: allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length,
      lng: allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length,
    } : { lat: 0, lng: 0 };

    return { players, tagEvents, hotspots, center, duration };
  }, [game]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || !gameData) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 1000 * playbackSpeed;
        if (next >= gameData.duration) {
          setIsPlaying(false);
          return gameData.duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, gameData]);

  // Get visible path up to current time
  const getVisiblePath = (playerId) => {
    if (!gameData?.players[playerId]) return [];
    return gameData.players[playerId].path
      .filter(p => p.time <= currentTime)
      .map(p => [p.lat, p.lng]);
  };

  // Get current position at playback time
  const getCurrentPosition = (playerId) => {
    if (!gameData?.players[playerId]) return null;
    const path = gameData.players[playerId].path;
    const point = path.filter(p => p.time <= currentTime).pop();
    return point ? [point.lat, point.lng] : null;
  };

  // Format time
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !game) return null;

  const playerColors = {
    cyan: '#22d3ee',
    purple: '#a855f7',
    green: '#22c55e',
    orange: '#f97316',
    pink: '#ec4899',
    gold: '#fbbf24',
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-b from-dark-900 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-neon-cyan" />
              Game Replay
            </h2>
            <p className="text-sm text-white/60">
              {game.gameMode} • {formatTime(gameData?.duration || 0)} total
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* View toggles */}
        <div className="flex gap-2 mt-3">
          {[
            { id: 'heatmap', label: 'Heatmap', state: showHeatmap, setter: setShowHeatmap },
            { id: 'paths', label: 'Paths', state: showPaths, setter: setShowPaths },
            { id: 'tags', label: 'Tags', state: showTags, setter: setShowTags },
          ].map(toggle => (
            <button
              key={toggle.id}
              onClick={() => toggle.setter(!toggle.state)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                toggle.state
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {toggle.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      {gameData && (
        <MapContainer
          center={[gameData.center.lat, gameData.center.lng]}
          zoom={17}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap'
          />

          {/* Heatmap */}
          {showHeatmap && gameData.hotspots.map((spot, i) => (
            <Circle
              key={i}
              center={[spot.lat, spot.lng]}
              radius={8}
              pathOptions={{
                color: 'transparent',
                fillColor: getHeatColor(spot.intensity),
                fillOpacity: 0.4 + spot.intensity * 0.4,
              }}
            />
          ))}

          {/* Player paths */}
          {showPaths && Object.entries(gameData.players).map(([playerId, player]) => (
            <Polyline
              key={playerId}
              positions={getVisiblePath(playerId)}
              pathOptions={{
                color: playerColors[player.color] || '#ffffff',
                weight: selectedPlayer === playerId ? 4 : 2,
                opacity: selectedPlayer ? (selectedPlayer === playerId ? 1 : 0.3) : 0.7,
              }}
            />
          ))}

          {/* Current positions during playback */}
          {Object.entries(gameData.players).map(([playerId, player]) => {
            const pos = getCurrentPosition(playerId);
            if (!pos) return null;
            return (
              <Marker
                key={playerId}
                position={pos}
                icon={L.divIcon({
                  className: 'player-marker',
                  html: `<div style="
                    width: 20px; height: 20px;
                    background: ${playerColors[player.color] || '#fff'};
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 10px ${playerColors[player.color] || '#fff'};
                  "></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>{player.name}</Popup>
              </Marker>
            );
          })}

          {/* Tag events */}
          {showTags && gameData.tagEvents
            .filter(t => t.timestamp - game.startedAt <= currentTime)
            .map((tag, i) => (
              <Marker
                key={i}
                position={[tag.lat, tag.lng]}
                icon={createTagMarker(tag.taggerId === game.userId)}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{tag.taggerName}</strong> tagged <strong>{tag.taggedName}</strong>
                    <br />
                    <span className="text-gray-500">{formatTime(tag.timestamp - game.startedAt)}</span>
                  </div>
                </Popup>
              </Marker>
            ))
          }
        </MapContainer>
      )}

      {/* Playback controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-gradient-to-t from-dark-900 via-dark-900/95 to-transparent p-4">
        {/* Timeline */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={gameData?.duration || 0}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-neon-cyan"
          />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(gameData?.duration || 0)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 rounded-full bg-neon-cyan hover:bg-neon-cyan/80"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-dark-900" />
            ) : (
              <Play className="w-6 h-6 text-dark-900 ml-0.5" />
            )}
          </button>
          
          <button
            onClick={() => setCurrentTime(gameData?.duration || 0)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>

          {/* Speed control */}
          <div className="flex items-center gap-2 ml-4">
            {[1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded text-sm font-mono ${
                  playbackSpeed === speed
                    ? 'bg-neon-cyan text-dark-900'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Player legend */}
        {gameData && (
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {Object.entries(gameData.players).map(([playerId, player]) => (
              <button
                key={playerId}
                onClick={() => setSelectedPlayer(selectedPlayer === playerId ? null : playerId)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  selectedPlayer === playerId
                    ? 'bg-white/20 ring-2 ring-white/40'
                    : 'bg-white/10'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: playerColors[player.color] || '#fff' }}
                />
                <span className="text-white">{player.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
