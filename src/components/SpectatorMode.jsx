import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Eye, Users, Target, Clock, MessageCircle, X, Volume2, VolumeX } from 'lucide-react';
import { socketService } from '../services/socket';
import GameChat from './GameChat';

// Custom marker icons
const createIcon = (color, isIt = false, emoji = '📍') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${isIt ? '44px' : '36px'};
        height: ${isIt ? '44px' : '36px'};
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 ${isIt ? '20px' : '10px'} ${color}, 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isIt ? '22px' : '18px'};
        ${isIt ? 'animation: pulse 1s infinite;' : ''}
      ">
        ${emoji}
      </div>
    `,
    iconSize: [isIt ? 44 : 36, isIt ? 44 : 36],
    iconAnchor: [isIt ? 22 : 18, isIt ? 22 : 18],
  });
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
}

function SpectatorMode({ game, onExit }) {
  const [followPlayer, setFollowPlayer] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [commentary, setCommentary] = useState([]);
  const [muteCommentary, setMuteCommentary] = useState(false);

  // Update game timer
  useEffect(() => {
    if (game?.startedAt) {
      const interval = setInterval(() => {
        setGameTime(Date.now() - game.startedAt);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [game?.startedAt]);

  // Listen for game events to generate commentary
  useEffect(() => {
    const handleTag = ({ taggerId, taggedId }) => {
      const tagger = game?.players?.find(p => p.id === taggerId);
      const tagged = game?.players?.find(p => p.id === taggedId);
      if (tagger && tagged) {
        addCommentary(`🎯 ${tagger.name} tagged ${tagged.name}!`);
      }
    };

    const handlePlayerJoined = ({ player }) => {
      addCommentary(`👋 ${player.name} joined as spectator`);
    };

    socketService.on('player:tagged', handleTag);
    socketService.on('spectator:joined', handlePlayerJoined);

    return () => {
      socketService.off('player:tagged', handleTag);
      socketService.off('spectator:joined', handlePlayerJoined);
    };
  }, [game?.players]);

  const addCommentary = (message) => {
    setCommentary(prev => [...prev.slice(-9), { 
      id: Date.now(), 
      message, 
      timestamp: Date.now() 
    }]);
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const itPlayer = game?.players?.find(p => p.id === game?.itPlayerId);
  const activePlayers = game?.players?.filter(p => !p.isEliminated) || [];
  
  // Get center for map
  const getMapCenter = () => {
    if (followPlayer) {
      const player = game?.players?.find(p => p.id === followPlayer);
      if (player?.location) return player.location;
    }
    // Default to IT player or first player with location
    if (itPlayer?.location) return itPlayer.location;
    const withLocation = game?.players?.find(p => p.location);
    return withLocation?.location || { lat: 37.7749, lng: -122.4194 };
  };

  const center = getMapCenter();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800/90 backdrop-blur-sm border-b border-white/10">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-purple/20 rounded-xl">
                <Eye className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h2 className="font-display font-bold">Spectator Mode</h2>
                <p className="text-xs text-white/50">{game?.settings?.gameName || 'Game'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-white/50" />
                <span className="font-mono">{formatTime(gameTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-white/50" />
                <span>{activePlayers.length}</span>
              </div>
              <button
                onClick={onExit}
                className="p-2 hover:bg-white/10 rounded-lg"
                aria-label="Exit spectator mode"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
          </div>

          {/* IT Status */}
          {itPlayer && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-neon-orange/10 border border-neon-orange/20 rounded-xl">
              <Target className="w-5 h-5 text-neon-orange" />
              <span className="text-sm">
                <span className="font-bold text-neon-orange">{itPlayer.name}</span> is IT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapController center={center} />

          {/* Tag radius for IT */}
          {itPlayer?.location && (
            <Circle
              center={[itPlayer.location.lat, itPlayer.location.lng]}
              radius={game?.settings?.tagRadius || 20}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}

          {/* All players */}
          {game?.players?.map((player) => {
            if (!player.location) return null;
            const isIt = player.id === game?.itPlayerId;
            
            return (
              <Marker
                key={player.id}
                position={[player.location.lat, player.location.lng]}
                icon={createIcon(
                  player.isEliminated ? '#666' :
                  player.team === 'red' ? '#ef4444' :
                  player.team === 'blue' ? '#3b82f6' :
                  isIt ? '#f97316' : '#22c55e',
                  isIt && !player.isEliminated,
                  player.isEliminated ? '💀' : player.avatar || '🏃'
                )}
                eventHandlers={{
                  click: () => setFollowPlayer(player.id),
                }}
              />
            );
          })}
        </MapContainer>

        {/* Commentary Overlay */}
        {!muteCommentary && commentary.length > 0 && (
          <div className="absolute top-4 left-4 right-20 z-10 space-y-2">
            {commentary.slice(-3).map((item) => (
              <div
                key={item.id}
                className="bg-dark-800/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm animate-slide-down"
              >
                {item.message}
              </div>
            ))}
          </div>
        )}

        {/* Mute Commentary Button */}
        <button
          onClick={() => setMuteCommentary(!muteCommentary)}
          className="absolute top-4 right-4 z-10 p-3 bg-dark-800/90 backdrop-blur-sm rounded-full"
          aria-label={muteCommentary ? 'Unmute commentary' : 'Mute commentary'}
        >
          {muteCommentary ? (
            <VolumeX className="w-5 h-5 text-white/50" />
          ) : (
            <Volume2 className="w-5 h-5 text-white/70" />
          )}
        </button>

        {/* Chat Button */}
        <div className="absolute bottom-4 right-4 z-10">
          {showChat ? (
            <div className="w-80">
              <GameChat
                gameId={game?.id}
                players={game?.players}
                currentUserId={null} // Spectator has no ID
                isMinimized={false}
                onToggle={() => setShowChat(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowChat(true)}
              className="p-4 bg-dark-800/90 backdrop-blur-sm rounded-full border border-white/10"
              aria-label="Open chat"
            >
              <MessageCircle className="w-6 h-6 text-white/70" />
            </button>
          )}
        </div>
      </div>

      {/* Player List */}
      <div className="bg-dark-800/90 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {game?.players?.map((player) => {
            const isIt = player.id === game?.itPlayerId;
            const isFollowing = followPlayer === player.id;
            
            return (
              <button
                key={player.id}
                onClick={() => setFollowPlayer(isFollowing ? null : player.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 transition-all ${
                  isFollowing
                    ? 'bg-neon-cyan/20 border border-neon-cyan/50'
                    : player.isEliminated
                    ? 'bg-white/5 opacity-50'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <span className="text-lg">
                  {player.isEliminated ? '💀' : player.avatar || '🏃'}
                </span>
                <span className={`text-sm font-medium ${
                  isIt ? 'text-neon-orange' : 
                  player.isEliminated ? 'text-white/40' : ''
                }`}>
                  {player.name}
                </span>
                {isIt && <Target className="w-4 h-4 text-neon-orange" />}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default SpectatorMode;
