import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Play, Pause, SkipBack, SkipForward, Clock, Users, Trophy, X, 
  FastForward, Rewind, Star, Zap, Target, Share2, Download,
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { getDistance } from '../../shared/utils';

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

// Highlight marker for special moments
const createHighlightMarker = (type) => {
  const icons = {
    tag: '🏷️',
    close_call: '😱',
    escape: '💨',
    freeze: '🥶',
    unfreeze: '🔥',
  };
  
  return L.divIcon({
    className: 'highlight-marker',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        animation: pulse 1s infinite;
      ">
        ${icons[type] || '⭐'}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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

/**
 * Enhanced Replay Player with Highlights
 * Features:
 * - Smooth playback with variable speed
 * - Automatic highlight detection (close calls, epic escapes)
 * - Movement trails for each player
 * - Jump to highlights navigation
 * - Share/export capabilities
 */
export default function ReplayPlayer({ replayId, onClose }) {
  const [replay, setReplay] = useState(null);
  const [events, setEvents] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playerPositions, setPlayerPositions] = useState({});
  const [playerTrails, setPlayerTrails] = useState({});
  const [itPlayerId, setItPlayerId] = useState(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [currentHighlight, setCurrentHighlight] = useState(null);
  
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
      
      // Initialize player positions and detect highlights
      initializePlayback(eventData);
      detectHighlights(eventData, replayData);
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
    const positionEvents = eventData.filter(e => e.type === 'position');
    const playerIds = [...new Set(positionEvents.map(e => e.playerId))];
    
    playerIds.forEach(id => {
      const firstPos = positionEvents.find(e => e.playerId === id);
      if (firstPos) {
        positions[id] = { lat: firstPos.lat, lng: firstPos.lng };
        trails[id] = [[firstPos.lat, firstPos.lng]];
      }
    });
    
    setPlayerPositions(positions);
    setPlayerTrails(trails);
    
    // Find initial IT
    const tagEvent = eventData.find(e => e.type === 'game_start' || e.type === 'tag');
    if (tagEvent?.itPlayerId) {
      setItPlayerId(tagEvent.itPlayerId);
    }
  };

  // Detect highlights (close calls, epic escapes, tags)
  const detectHighlights = (eventData, replayData) => {
    const detectedHighlights = [];
    const positionEvents = eventData.filter(e => e.type === 'position');
    const tagEvents = eventData.filter(e => e.type === 'tag');
    
    // Add all tags as highlights
    tagEvents.forEach(tag => {
      detectedHighlights.push({
        id: `tag-${tag.timestamp}`,
        type: 'tag',
        timestamp: tag.timestamp,
        title: `${tag.taggerName} tagged ${tag.targetName}!`,
        description: 'Tag!',
        importance: 10,
        location: { lat: tag.lat, lng: tag.lng },
      });
    });
    
    // Detect close calls (IT got very close but didn't tag)
    let lastItPosition = null;
    let currentIt = replayData?.initialIt;
    
    positionEvents.forEach((event, idx) => {
      // Track IT changes
      const tagBefore = tagEvents.find(t => t.timestamp <= event.timestamp && t.timestamp > (positionEvents[idx-1]?.timestamp || 0));
      if (tagBefore) {
        currentIt = tagBefore.targetId;
      }
      
      if (event.playerId === currentIt) {
        lastItPosition = { lat: event.lat, lng: event.lng, timestamp: event.timestamp };
      } else if (lastItPosition) {
        const distance = getDistance(event.lat, event.lng, lastItPosition.lat, lastItPosition.lng);
        const timeDiff = Math.abs(event.timestamp - lastItPosition.timestamp);
        
        // Close call: within 15 meters but no tag for 3+ seconds
        if (distance < 15 && timeDiff < 5000) {
          const existingHighlight = detectedHighlights.find(
            h => h.type === 'close_call' && Math.abs(h.timestamp - event.timestamp) < 10000
          );
          
          if (!existingHighlight) {
            const player = replayData?.players?.find(p => p.id === event.playerId);
            detectedHighlights.push({
              id: `close-${event.timestamp}`,
              type: 'close_call',
              timestamp: event.timestamp,
              title: `Close call for ${player?.name || 'Player'}!`,
              description: `Only ${Math.round(distance)}m away!`,
              importance: 8 - (distance / 2),
              location: { lat: event.lat, lng: event.lng },
            });
          }
        }
      }
    });
    
    // Sort by timestamp
    detectedHighlights.sort((a, b) => a.timestamp - b.timestamp);
    setHighlights(detectedHighlights);
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !events.length) return;
    
    const animate = (timestamp) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }
      
      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      
      setCurrentTime(prev => {
        const newTime = prev + (delta * playbackSpeed);
        const maxTime = replay?.duration || events[events.length - 1]?.timestamp || 0;
        
        if (newTime >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        
        return newTime;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, events, replay]);

  // Update positions based on current time
  useEffect(() => {
    if (!events.length) return;
    
    const startTime = replay?.startTime || events[0]?.timestamp || 0;
    const absoluteTime = startTime + currentTime;
    
    // Find latest position for each player before current time
    const newPositions = {};
    const newTrails = {};
    let newIt = itPlayerId;
    
    events.forEach(event => {
      if (event.timestamp > absoluteTime) return;
      
      if (event.type === 'position') {
        newPositions[event.playerId] = { lat: event.lat, lng: event.lng };
        
        if (!newTrails[event.playerId]) {
          newTrails[event.playerId] = [];
        }
        newTrails[event.playerId].push([event.lat, event.lng]);
      }
      
      if (event.type === 'tag') {
        newIt = event.targetId;
      }
    });
    
    setPlayerPositions(newPositions);
    setPlayerTrails(newTrails);
    if (newIt !== itPlayerId) {
      setItPlayerId(newIt);
    }
  }, [currentTime, events, replay]);

  // Navigation controls
  const togglePlay = () => {
    if (!isPlaying) {
      lastFrameTimeRef.current = 0;
    }
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    const maxTime = replay?.duration || 0;
    setCurrentTime(prev => Math.min(prev + 10000, maxTime));
  };

  const skipBackward = () => {
    setCurrentTime(prev => Math.max(prev - 10000, 0));
  };

  const jumpToHighlight = (highlight) => {
    const startTime = replay?.startTime || events[0]?.timestamp || 0;
    setCurrentTime(highlight.timestamp - startTime);
    setCurrentHighlight(highlight);
    setIsPlaying(false);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate map center
  const mapCenter = useMemo(() => {
    const positions = Object.values(playerPositions);
    if (!positions.length) return { lat: 0, lng: 0 };
    
    const lat = positions.reduce((sum, p) => sum + p.lat, 0) / positions.length;
    const lng = positions.reduce((sum, p) => sum + p.lng, 0) / positions.length;
    return { lat, lng };
  }, [playerPositions]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-900/95 flex items-center justify-center p-4">
        <div className="bg-dark-800 rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-dark-800 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-bold">{replay?.gameMode || 'Game'} Replay</h2>
            <p className="text-xs text-white/50">
              {replay?.players?.length || 0} players • {formatTime(replay?.duration || 0)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`p-2 rounded-lg transition-colors ${
              showHighlights ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/40'
            }`}
          >
            <Star className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white/60 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[mapCenter.lat || 0, mapCenter.lng || 0]}
          zoom={17}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <MapController center={mapCenter} />
          
          {/* Player trails */}
          {Object.entries(playerTrails).map(([playerId, trail], index) => (
            trail.length > 1 && (
              <Polyline
                key={`trail-${playerId}`}
                positions={trail}
                color={playerColors[index % playerColors.length]}
                weight={3}
                opacity={0.5}
                dashArray="5, 10"
              />
            )
          ))}
          
          {/* Player markers */}
          {Object.entries(playerPositions).map(([playerId, pos], index) => {
            const player = replay?.players?.find(p => p.id === playerId);
            const isIt = playerId === itPlayerId;
            return (
              <Marker
                key={`player-${playerId}`}
                position={[pos.lat, pos.lng]}
                icon={createPlayerIcon(
                  playerColors[index % playerColors.length],
                  player?.avatar || (isIt ? '👹' : '🏃'),
                  isIt
                )}
              />
            );
          })}
          
          {/* Highlight markers */}
          {showHighlights && highlights.map(h => {
            const startTime = replay?.startTime || 0;
            const highlightTime = h.timestamp - startTime;
            const isActive = Math.abs(currentTime - highlightTime) < 5000;
            
            if (h.location && isActive) {
              return (
                <Marker
                  key={h.id}
                  position={[h.location.lat, h.location.lng]}
                  icon={createHighlightMarker(h.type)}
                />
              );
            }
            return null;
          })}
        </MapContainer>

        {/* Player legend */}
        <div className="absolute top-4 left-4 bg-dark-800/90 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <h4 className="text-xs font-semibold text-white/50 mb-2">Players</h4>
          <div className="space-y-1">
            {replay?.players?.map((player, index) => (
              <div key={player.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: playerColors[index % playerColors.length] }}
                />
                <span className="text-sm">
                  {player.avatar} {player.name}
                  {player.id === itPlayerId && (
                    <span className="ml-1 text-red-400 text-xs">(IT)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current highlight banner */}
        {currentHighlight && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4" />
            {currentHighlight.title}
          </div>
        )}
      </div>

      {/* Highlights panel */}
      {showHighlights && highlights.length > 0 && (
        <div className="bg-dark-800 border-t border-white/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Highlights</span>
            <span className="text-xs text-white/40">({highlights.length})</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {highlights.map((h) => (
              <button
                key={h.id}
                onClick={() => jumpToHighlight(h)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentHighlight?.id === h.id
                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-medium">{h.title}</div>
                <div className="text-xs text-white/40">{formatTime(h.timestamp - (replay?.startTime || 0))}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 bg-dark-800 border-t border-white/10">
        {/* Progress bar */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={replay?.duration || 0}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-neon-cyan"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(replay?.duration || 0)}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={skipBackward}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <Rewind className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-4 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan rounded-full transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          
          <button
            onClick={skipForward}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <FastForward className="w-5 h-5" />
          </button>
          
          {/* Speed control */}
          <div className="flex items-center gap-1 ml-4">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-neon-cyan/20 text-neon-cyan'
                    : 'bg-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
