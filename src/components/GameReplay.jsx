import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { Play, Pause, SkipBack, SkipForward, X, Share2, Download, Trophy, Zap, Clock, MapPin } from 'lucide-react';
import L from 'leaflet';

// Custom player marker
const createPlayerIcon = (avatar, color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">${avatar}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Map bounds fitter
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function GameReplay({ game, players, movementHistory, highlights, isOpen, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [playerPositions, setPlayerPositions] = useState({});
  const intervalRef = useRef(null);

  // Calculate game duration
  const gameDuration = game?.endTime ? game.endTime - game.startTime : 0;
  const totalSeconds = Math.floor(gameDuration / 1000);

  // Player colors
  const playerColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
  ];

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isPlaying && currentTime < totalSeconds) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalSeconds) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalSeconds]);

  useEffect(() => {
    // Update player positions based on current time
    if (!movementHistory) return;

    const targetTime = game.startTime + (currentTime * 1000);
    const positions = {};

    Object.entries(movementHistory).forEach(([playerId, history]) => {
      // Find the position at current time
      const relevantPoints = history.filter(p => p.timestamp <= targetTime);
      if (relevantPoints.length > 0) {
        const lastPoint = relevantPoints[relevantPoints.length - 1];
        positions[playerId] = {
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          timestamp: lastPoint.timestamp,
        };
      }
    });

    setPlayerPositions(positions);
  }, [currentTime, movementHistory, game?.startTime]);

  // Calculate map bounds
  const allPoints = movementHistory 
    ? Object.values(movementHistory).flat().map(p => [p.lat, p.lng])
    : [];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `TAG! Game Replay - ${game.mode}`,
        text: `Check out this ${game.mode} game replay!`,
        url: `${window.location.origin}/replay/${game.id}`,
      });
    } catch (err) {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/replay/${game.id}`);
      alert('Link copied to clipboard!');
    }
  };

  const jumpToHighlight = (highlight) => {
    setSelectedHighlight(highlight);
    const highlightTime = Math.floor((highlight.timestamp - game.startTime) / 1000);
    setCurrentTime(Math.max(0, highlightTime - 3)); // Jump to 3 seconds before
    setIsPlaying(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Game Replay
          </h2>
          <p className="text-sm text-white/60">{game?.mode} • {players?.length} players</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            title="Share replay"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[0, 0]}
          zoom={15}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <FitBounds bounds={allPoints} />

          {/* Player trails */}
          {movementHistory && Object.entries(movementHistory).map(([playerId, history], idx) => {
            const player = players?.find(p => p.id === playerId);
            const targetTime = game.startTime + (currentTime * 1000);
            const visiblePath = history
              .filter(p => p.timestamp <= targetTime)
              .map(p => [p.lat, p.lng]);

            if (visiblePath.length < 2) return null;

            return (
              <Polyline
                key={playerId}
                positions={visiblePath}
                color={playerColors[idx % playerColors.length]}
                weight={4}
                opacity={0.7}
                dashArray="10, 5"
              />
            );
          })}

          {/* Current player positions */}
          {Object.entries(playerPositions).map(([playerId, pos], idx) => {
            const player = players?.find(p => p.id === playerId);
            if (!player || !pos) return null;

            return (
              <Marker
                key={playerId}
                position={[pos.lat, pos.lng]}
                icon={createPlayerIcon(player.avatar, playerColors[idx % playerColors.length])}
              >
                <Popup>
                  <div className="text-center">
                    <div className="text-2xl mb-1">{player.avatar}</div>
                    <div className="font-semibold">{player.name}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Highlight markers */}
          {highlights?.map((highlight, idx) => {
            const highlightTime = Math.floor((highlight.timestamp - game.startTime) / 1000);
            if (highlightTime > currentTime) return null;

            return (
              <Marker
                key={idx}
                position={[highlight.lat, highlight.lng]}
                icon={L.divIcon({
                  className: 'highlight-marker',
                  html: `<div style="
                    width: 30px;
                    height: 30px;
                    background: #f59e0b;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 1s infinite;
                  ">⚡</div>`,
                  iconSize: [30, 30],
                  iconAnchor: [15, 15],
                })}
              >
                <Popup>
                  <div className="font-semibold">{highlight.type}</div>
                  <div className="text-sm">{highlight.description}</div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Player legend */}
        <div className="absolute top-4 left-4 bg-slate-900/90 rounded-xl p-3 max-w-xs">
          <h3 className="text-sm font-semibold text-white mb-2">Players</h3>
          <div className="space-y-1">
            {players?.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: playerColors[idx % playerColors.length] }}
                />
                <span className="text-sm text-white/80">{player.avatar} {player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights Bar */}
      {highlights && highlights.length > 0 && (
        <div className="bg-slate-900/80 border-t border-white/10 p-3">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Highlights
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {highlights.map((highlight, idx) => (
              <button
                key={idx}
                onClick={() => jumpToHighlight(highlight)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm transition ${
                  selectedHighlight === highlight
                    ? 'bg-yellow-500 text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <div className="font-medium">{highlight.type}</div>
                <div className="text-xs opacity-70">
                  {formatTime(Math.floor((highlight.timestamp - game.startTime) / 1000))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="bg-slate-900 border-t border-white/10 p-4">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-white/60 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalSeconds)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={totalSeconds}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Back 10s"
          >
            <SkipBack className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center hover:bg-indigo-600 transition"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white" />
            ) : (
              <Play className="w-7 h-7 text-white ml-1" />
            )}
          </button>

          <button
            onClick={() => setCurrentTime(Math.min(totalSeconds, currentTime + 10))}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Forward 10s"
          >
            <SkipForward className="w-6 h-6 text-white" />
          </button>

          {/* Speed control */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="ml-4 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
