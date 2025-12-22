import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Play, Pause, SkipBack, SkipForward, Clock, Users, Trophy, X, FastForward, Rewind } from 'lucide-react';
import { api } from '../services/api';

// Create player marker icon
const createPlayerIcon = (color, emoji = '📍', isIt = false) => {
  return L.divIcon({
    className: 'replay-marker',
    html: `
      <div style="
        width: ${isIt ? '40px' : '32px'};
        height: ${isIt ? '40px' : '32px'};
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isIt ? '18px' : '14px'};
        box-shadow: 0 0 ${isIt ? '15px' : '8px'} ${color};
      ">
        ${emoji}
      </div>
    `,
    iconSize: [isIt ? 40 : 32, isIt ? 40 : 32],
    iconAnchor: [isIt ? 20 : 16, isIt ? 20 : 16],
  });
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

function ReplayPlayer({ replayId, onClose }) {
  const [replay, setReplay] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playerPositions, setPlayerPositions] = useState({});
  const [playerTrails, setPlayerTrails] = useState({});
  const [itPlayerId, setItPlayerId] = useState(null);
  const [gameEvents, setGameEvents] = useState([]);
  
  const animationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Colors for players
  const playerColors = ['#00f5ff', '#a855f7', '#f97316', '#22c55e', '#ef4444', '#3b82f6', '#eab308', '#ec4899'];

  useEffect(() => {
    loadReplay();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [replayId]);

  const loadReplay = async () => {
    try {
      setLoading(true);
      const { replay: replayData, events: eventData } = await api.request(`/replays/${replayId}`);
      setReplay(replayData);
      setEvents(eventData);
      
      // Initialize player positions from first events
      initializePlayback(eventData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializePlayback = (eventData) => {
    const positions = {};
    const trails = {};
    
    // Find initial positions
    eventData.forEach(event => {
      if (event.event_type === 'location' && event.data?.lat) {
        if (!positions[event.player_id]) {
          positions[event.player_id] = {
            lat: event.data.lat,
            lng: event.data.lng,
            name: event.data.name || 'Player',
            avatar: event.data.avatar || '📍'
          };
          trails[event.player_id] = [];
        }
      }
      if (event.event_type === 'game_start') {
        setItPlayerId(event.data?.itPlayerId);
      }
    });
    
    setPlayerPositions(positions);
    setPlayerTrails(trails);
  };

  const updatePlayback = (timestamp) => {
    if (!isPlaying) return;

    const now = performance.now();
    const deltaMs = (now - lastFrameTimeRef.current) * playbackSpeed;
    lastFrameTimeRef.current = now;

    const newTime = Math.min(currentTime + deltaMs, replay?.duration_ms || 0);
    setCurrentTime(newTime);

    // Process events up to current time
    const relevantEvents = events.filter(e => 
      e.timestamp_ms <= newTime && e.timestamp_ms > currentTime
    );

    const newPositions = { ...playerPositions };
    const newTrails = { ...playerTrails };
    const newGameEvents = [...gameEvents];

    relevantEvents.forEach(event => {
      switch (event.event_type) {
        case 'location':
          if (event.data?.lat && event.player_id) {
            const prev = newPositions[event.player_id];
            newPositions[event.player_id] = {
              ...prev,
              lat: event.data.lat,
              lng: event.data.lng
            };
            if (!newTrails[event.player_id]) {
              newTrails[event.player_id] = [];
            }
            newTrails[event.player_id].push([event.data.lat, event.data.lng]);
            // Keep trail length reasonable
            if (newTrails[event.player_id].length > 100) {
              newTrails[event.player_id] = newTrails[event.player_id].slice(-100);
            }
          }
          break;
        case 'tag':
          setItPlayerId(event.data?.newItId);
          newGameEvents.push({
            time: newTime,
            type: 'tag',
            message: `${event.data?.taggerName} tagged ${event.data?.taggedName}!`
          });
          break;
        case 'elimination':
          newGameEvents.push({
            time: newTime,
            type: 'elimination',
            message: `${event.data?.playerName} was eliminated!`
          });
          break;
        case 'game_end':
          newGameEvents.push({
            time: newTime,
            type: 'end',
            message: `Game Over! Winner: ${event.data?.winnerName}`
          });
          setIsPlaying(false);
          break;
      }
    });

    setPlayerPositions(newPositions);
    setPlayerTrails(newTrails);
    if (newGameEvents.length > gameEvents.length) {
      setGameEvents(newGameEvents.slice(-5)); // Keep last 5 events
    }

    if (newTime >= (replay?.duration_ms || 0)) {
      setIsPlaying(false);
    } else {
      animationRef.current = requestAnimationFrame(updatePlayback);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(updatePlayback);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time) => {
    setCurrentTime(time);
    // Re-process all events up to this time
    initializePlayback(events);
    
    const relevantEvents = events.filter(e => e.timestamp_ms <= time);
    const newPositions = {};
    const newTrails = {};
    
    relevantEvents.forEach(event => {
      if (event.event_type === 'location' && event.data?.lat && event.player_id) {
        newPositions[event.player_id] = {
          lat: event.data.lat,
          lng: event.data.lng,
          name: event.data.name || 'Player',
          avatar: event.data.avatar || '📍'
        };
        if (!newTrails[event.player_id]) {
          newTrails[event.player_id] = [];
        }
        newTrails[event.player_id].push([event.data.lat, event.data.lng]);
      }
      if (event.event_type === 'tag') {
        setItPlayerId(event.data?.newItId);
      }
    });
    
    setPlayerPositions(newPositions);
    setPlayerTrails(newTrails);
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate center from all player positions
  const getCenter = () => {
    const positions = Object.values(playerPositions);
    if (positions.length === 0) return { lat: 0, lng: 0 };
    
    const lat = positions.reduce((sum, p) => sum + p.lat, 0) / positions.length;
    const lng = positions.reduce((sum, p) => sum + p.lng, 0) / positions.length;
    return { lat, lng };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-dark-900/95 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan mx-auto mb-4"></div>
          <p className="text-white/60">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-dark-900/95 flex items-center justify-center z-50">
        <div className="text-center p-8">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-dark-700 rounded-lg text-white">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-dark-900 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-800 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Trophy className="w-5 h-5 text-neon-cyan" />
          <div>
            <h2 className="font-bold text-white">{replay?.game_mode || 'Classic'} Game Replay</h2>
            <p className="text-sm text-white/60">
              {replay?.player_count} players • {formatTime(replay?.duration_ms || 0)} duration
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[getCenter().lat || 0, getCenter().lng || 0]}
          zoom={16}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapController center={getCenter()} />

          {/* Player trails */}
          {Object.entries(playerTrails).map(([playerId, trail], index) => (
            trail.length > 1 && (
              <Polyline
                key={`trail-${playerId}`}
                positions={trail}
                color={playerColors[index % playerColors.length]}
                weight={2}
                opacity={0.5}
              />
            )
          ))}

          {/* Player markers */}
          {Object.entries(playerPositions).map(([playerId, pos], index) => (
            <Marker
              key={playerId}
              position={[pos.lat, pos.lng]}
              icon={createPlayerIcon(
                playerColors[index % playerColors.length],
                pos.avatar,
                playerId === itPlayerId
              )}
            />
          ))}
        </MapContainer>

        {/* Event feed */}
        <div className="absolute top-4 right-4 bg-dark-800/90 backdrop-blur-sm rounded-lg p-3 max-w-xs">
          {gameEvents.length > 0 ? (
            gameEvents.slice(-3).map((event, i) => (
              <div key={i} className="text-sm text-white/80 mb-1 last:mb-0">
                {event.message}
              </div>
            ))
          ) : (
            <div className="text-sm text-white/40">Events will appear here...</div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="p-4 bg-dark-800 border-t border-white/10">
        {/* Progress bar */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={replay?.duration_ms || 0}
            value={currentTime}
            onChange={(e) => seekTo(parseInt(e.target.value))}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(replay?.duration_ms || 0)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => seekTo(Math.max(0, currentTime - 10000))}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Rewind className="w-5 h-5 text-white/60" />
          </button>
          
          <button
            onClick={() => seekTo(0)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <SkipBack className="w-5 h-5 text-white/60" />
          </button>
          
          <button
            onClick={togglePlayback}
            className="p-4 bg-neon-cyan/20 hover:bg-neon-cyan/30 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-neon-cyan" />
            ) : (
              <Play className="w-6 h-6 text-neon-cyan" />
            )}
          </button>
          
          <button
            onClick={() => seekTo(replay?.duration_ms || 0)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <SkipForward className="w-5 h-5 text-white/60" />
          </button>
          
          <button
            onClick={() => seekTo(Math.min(replay?.duration_ms || 0, currentTime + 10000))}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FastForward className="w-5 h-5 text-white/60" />
          </button>

          {/* Speed control */}
          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs text-white/40">Speed:</span>
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-neon-cyan text-dark-900'
                    : 'bg-dark-700 text-white/60 hover:bg-dark-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReplayPlayer;
