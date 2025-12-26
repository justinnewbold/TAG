import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import { Eye, EyeOff, Users, Target, Clock, Trophy, MessageSquare, 
         ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import L from 'leaflet';
import { useStore } from '../store';

/**
 * Spectator Mode - Watch live games
 */

// Player marker for spectator view
const createSpectatorMarker = (player, isIt, isFollowed) => L.divIcon({
  className: 'spectator-marker',
  html: `
    <div style="
      width: ${isFollowed ? '48px' : '36px'};
      height: ${isFollowed ? '48px' : '36px'};
      background: ${isIt ? '#ef4444' : '#22c55e'};
      border-radius: 50%;
      border: 3px solid ${isFollowed ? '#fbbf24' : 'white'};
      box-shadow: 0 0 ${isFollowed ? '20px' : '10px'} ${isIt ? '#ef4444' : '#22c55e'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${isFollowed ? '20px' : '14px'};
      transition: all 0.3s ease;
    ">
      ${player.avatar || '👤'}
    </div>
    <div style="
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      white-space: nowrap;
      margin-top: 4px;
    ">
      ${player.username}${isIt ? ' 👹' : ''}
    </div>
  `,
  iconSize: [isFollowed ? 48 : 36, isFollowed ? 48 : 36],
  iconAnchor: [isFollowed ? 24 : 18, isFollowed ? 24 : 18],
});

// Map follower component
function MapFollower({ position, zoom = 17 }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom, { duration: 0.5 });
    }
  }, [position, zoom, map]);
  
  return null;
}

export default function SpectatorMode({ gameId, onExit }) {
  const { user } = useStore();
  const [gameData, setGameData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [followedPlayer, setFollowedPlayer] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState([]);

  // Simulate real-time updates (replace with WebSocket)
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/spectate`);
        const data = await res.json();
        setGameData(data.game);
        setPlayers(data.players);
        setSpectatorCount(data.spectatorCount);
      } catch (err) {
        console.error('Failed to fetch game data:', err);
      }
    };

    fetchGameData();
    const interval = setInterval(fetchGameData, 1000);
    return () => clearInterval(interval);
  }, [gameId]);

  // Get map center
  const mapCenter = useMemo(() => {
    if (followedPlayer) {
      const player = players.find(p => p.id === followedPlayer);
      if (player?.location) {
        return [player.location.lat, player.location.lng];
      }
    }
    if (players.length > 0 && players[0]?.location) {
      return [players[0].location.lat, players[0].location.lng];
    }
    return [40.7128, -74.006];
  }, [followedPlayer, players]);

  // Cycle through players
  const cyclePlayer = (direction) => {
    const currentIndex = players.findIndex(p => p.id === followedPlayer);
    let newIndex;
    
    if (direction === 'next') {
      newIndex = currentIndex >= players.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex <= 0 ? players.length - 1 : currentIndex - 1;
    }
    
    setFollowedPlayer(players[newIndex]?.id);
  };

  // Send chat message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      user: user?.username || 'Spectator',
      text: newMessage,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Get current "it" player
  const itPlayer = players.find(p => p.isIt);
  const followedPlayerData = players.find(p => p.id === followedPlayer);

  return (
    <div className="fixed inset-0 bg-dark-900 z-50 flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Exit
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-sm font-medium">LIVE</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="text-white text-sm">{spectatorCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Game Info Bar */}
      <div className="absolute top-20 left-4 right-4 z-40">
        <div className="flex items-center justify-between bg-dark-800/90 backdrop-blur-sm rounded-xl p-3 border border-dark-700">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-xs">Mode</p>
              <p className="text-white font-bold">{gameData?.mode || 'Classic Tag'}</p>
            </div>
            <div className="w-px h-8 bg-dark-600" />
            <div className="text-center">
              <p className="text-gray-400 text-xs">Players</p>
              <p className="text-white font-bold">{players.length}</p>
            </div>
            <div className="w-px h-8 bg-dark-600" />
            <div className="text-center">
              <p className="text-gray-400 text-xs">Time</p>
              <p className="text-white font-bold">{gameData?.timeRemaining || '--:--'}</p>
            </div>
          </div>

          {itPlayer && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-medium">{itPlayer.username} is IT</span>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={16}
        className="flex-1 w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {followedPlayer && (
          <MapFollower position={mapCenter} />
        )}

        {/* Player markers */}
        {players.map(player => (
          player.location && (
            <React.Fragment key={player.id}>
              <Marker
                position={[player.location.lat, player.location.lng]}
                icon={createSpectatorMarker(player, player.isIt, player.id === followedPlayer)}
                eventHandlers={{
                  click: () => setFollowedPlayer(player.id),
                }}
              />
              {player.isIt && (
                <Circle
                  center={[player.location.lat, player.location.lng]}
                  radius={gameData?.tagRadius || 25}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5',
                  }}
                />
              )}
            </React.Fragment>
          )
        ))}
      </MapContainer>

      {/* Player List (Left Side) */}
      <div className="absolute left-4 top-40 bottom-32 w-56 z-40 flex flex-col">
        <div className="bg-dark-800/90 backdrop-blur-sm rounded-xl border border-dark-700 overflow-hidden flex flex-col max-h-full">
          <div className="p-3 border-b border-dark-700">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Players
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => setFollowedPlayer(player.id)}
                className={`
                  w-full flex items-center gap-2 p-2 rounded-lg transition-colors
                  ${followedPlayer === player.id 
                    ? 'bg-primary-500/30 border border-primary-500/50' 
                    : 'hover:bg-white/10'
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-lg
                  ${player.isIt ? 'bg-red-500' : 'bg-green-500'}
                `}>
                  {player.avatar || '👤'}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium truncate">
                    {player.username}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {player.isIt ? '👹 IT' : player.tags || 0} tags
                  </p>
                </div>
                {followedPlayer === player.id && (
                  <Eye className="w-4 h-4 text-primary-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Player Navigation (Bottom Center) */}
      {followedPlayer && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-dark-800/90 backdrop-blur-sm rounded-full px-4 py-2 border border-dark-700">
            <button
              onClick={() => cyclePlayer('prev')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="text-center min-w-[120px]">
              <p className="text-white font-bold">{followedPlayerData?.username}</p>
              <p className="text-gray-400 text-xs">
                {followedPlayerData?.isIt ? 'Currently IT' : `${followedPlayerData?.tags || 0} tags`}
              </p>
            </div>
            <button
              onClick={() => cyclePlayer('next')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Recent Events (Right Side) */}
      <div className="absolute right-4 top-40 w-64 z-40">
        <div className="bg-dark-800/90 backdrop-blur-sm rounded-xl border border-dark-700 p-3">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Live Feed
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">Waiting for action...</p>
            ) : (
              recentEvents.map((event, i) => (
                <div key={i} className="text-sm">
                  <span className="text-gray-400">{event.time}</span>
                  <span className="text-white ml-2">{event.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Spectator Chat Toggle */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 right-4 z-50 p-3 bg-primary-500 hover:bg-primary-600 rounded-full shadow-lg transition-colors"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        {chatMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {chatMessages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div className="absolute bottom-20 right-4 w-80 z-50 bg-dark-800/95 backdrop-blur-sm rounded-xl border border-dark-700 overflow-hidden">
          <div className="p-3 border-b border-dark-700 flex items-center justify-between">
            <h3 className="text-white font-bold">Spectator Chat</h3>
            <button onClick={() => setShowChat(false)}>
              <EyeOff className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="h-64 overflow-y-auto p-3 space-y-2">
            {chatMessages.map(msg => (
              <div key={msg.id} className="text-sm">
                <span className="text-primary-400 font-medium">{msg.user}:</span>
                <span className="text-white ml-1">{msg.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-dark-700">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="w-full px-3 py-2 bg-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </form>
        </div>
      )}
    </div>
  );
}
