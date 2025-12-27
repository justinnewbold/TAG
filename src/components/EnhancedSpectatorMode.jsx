import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, EyeOff, Users, Crown, Target, Clock, 
  ChevronLeft, ChevronRight, Play, Pause, Volume2, 
  VolumeX, Maximize, Minimize, Settings, Radio,
  TrendingUp, Activity, Zap, MapPin
} from 'lucide-react';

// Enhanced Spectator Mode with multiple viewing options
export default function EnhancedSpectatorMode({ 
  game, 
  players = [],
  onExitSpectator,
  onFollowPlayer,
  currentFollowId = null
}) {
  const [viewMode, setViewMode] = useState('follow'); // 'follow', 'free', 'overview'
  const [showStats, setShowStats] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // Get active (non-eliminated) players
  const activePlayers = useMemo(() => {
    return players.filter(p => !p.isEliminated);
  }, [players]);

  // Auto-switch to action
  useEffect(() => {
    if (!autoSwitch || activePlayers.length === 0) return;

    const interval = setInterval(() => {
      // Find the most "interesting" player (IT or closest to IT)
      const itPlayer = activePlayers.find(p => p.isIt);
      if (itPlayer) {
        const closest = activePlayers
          .filter(p => !p.isIt)
          .sort((a, b) => {
            const distA = getDistance(itPlayer.location, a.location);
            const distB = getDistance(itPlayer.location, b.location);
            return distA - distB;
          })[0];
        
        // Switch between IT and their nearest target
        const nextTarget = Math.random() > 0.5 ? itPlayer : (closest || itPlayer);
        if (onFollowPlayer) onFollowPlayer(nextTarget.id);
      }
    }, 10000); // Switch every 10 seconds

    return () => clearInterval(interval);
  }, [autoSwitch, activePlayers, onFollowPlayer]);

  // Calculate distance between two locations
  const getDistance = (loc1, loc2) => {
    if (!loc1 || !loc2) return Infinity;
    const R = 6371000;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // Navigate between players
  const navigatePlayer = (direction) => {
    if (activePlayers.length === 0) return;
    
    let newIndex = currentPlayerIndex + direction;
    if (newIndex < 0) newIndex = activePlayers.length - 1;
    if (newIndex >= activePlayers.length) newIndex = 0;
    
    setCurrentPlayerIndex(newIndex);
    if (onFollowPlayer) onFollowPlayer(activePlayers[newIndex].id);
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

  // Current player being followed
  const currentPlayer = currentFollowId 
    ? players.find(p => p.id === currentFollowId)
    : activePlayers[currentPlayerIndex];

  // Game stats
  const gameStats = useMemo(() => {
    const totalTags = game?.tags?.length || 0;
    const remainingPlayers = activePlayers.length;
    const gameDuration = game?.startedAt ? Date.now() - game.startedAt : 0;
    const topTagger = [...players]
      .sort((a, b) => (b.tagCount || 0) - (a.tagCount || 0))[0];

    return { totalTags, remainingPlayers, gameDuration, topTagger };
  }, [game, players, activePlayers]);

  const formatTime = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          {/* Left: Exit and Mode */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExitSpectator}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-sm text-white">Exit</span>
            </button>
            
            <div className="flex items-center gap-1 bg-gray-800/80 rounded-lg p-1">
              {['follow', 'overview'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    viewMode === mode 
                      ? 'bg-indigo-500 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode === 'follow' ? 'Follow' : 'Overview'}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Live indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">SPECTATING</span>
            <span className="text-gray-400 text-sm">• {gameStats.remainingPlayers} players</span>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg transition-colors ${showStats ? 'bg-indigo-500' : 'bg-gray-800/80 hover:bg-gray-700'}`}
            >
              <Activity className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded-lg transition-colors ${audioEnabled ? 'bg-indigo-500' : 'bg-gray-800/80 hover:bg-gray-700'}`}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Map would go here */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Map view would render here</p>
          <p className="text-sm">Following: {currentPlayer?.name || 'No one'}</p>
        </div>
      </div>

      {/* Player Navigation (Follow Mode) */}
      {viewMode === 'follow' && (
        <div className="absolute left-4 right-4 bottom-32 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigatePlayer(-1)}
              className="p-3 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            {/* Current Player Card */}
            {currentPlayer && (
              <div className="flex-1 mx-4">
                <div className={`p-4 rounded-2xl backdrop-blur-sm ${
                  currentPlayer.isIt 
                    ? 'bg-red-900/80 border border-red-500' 
                    : 'bg-gray-900/80 border border-gray-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{currentPlayer.avatar || '👤'}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">{currentPlayer.name}</span>
                        {currentPlayer.isIt && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">IT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {currentPlayer.tagCount || 0} tags
                        </span>
                        {currentPlayer.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Moving {Math.random() > 0.5 ? 'North' : 'South'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        #{currentPlayerIndex + 1}
                      </div>
                      <div className="text-xs text-gray-500">
                        of {activePlayers.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigatePlayer(1)}
              className="p-3 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Overlay */}
      {showStats && (
        <div className="absolute top-20 right-4 z-10 w-64">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-white text-sm">Live Stats</span>
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Game Time</span>
                <span className="text-sm font-medium text-white">{formatTime(gameStats.gameDuration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Tags</span>
                <span className="text-sm font-medium text-white">{gameStats.totalTags}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Remaining</span>
                <span className="text-sm font-medium text-white">{gameStats.remainingPlayers} players</span>
              </div>
              {gameStats.topTagger && (
                <div className="pt-2 border-t border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Top Tagger</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{gameStats.topTagger.avatar || '👤'}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{gameStats.topTagger.name}</div>
                      <div className="text-xs text-indigo-400">{gameStats.topTagger.tagCount || 0} tags</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player List (Overview Mode) */}
      {viewMode === 'overview' && (
        <div className="absolute top-20 left-4 bottom-4 w-72 z-10 overflow-hidden">
          <div className="h-full bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800 flex flex-col">
            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-white text-sm">Players</span>
              </div>
              <span className="text-xs text-gray-500">{players.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    if (onFollowPlayer) onFollowPlayer(player.id);
                    setViewMode('follow');
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    player.isEliminated 
                      ? 'opacity-50 bg-gray-800/30' 
                      : player.isIt 
                      ? 'bg-red-900/50 hover:bg-red-900/70' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl">{player.avatar || '👤'}</span>
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium ${player.isEliminated ? 'text-gray-500 line-through' : 'text-white'}`}>
                      {player.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {player.isIt ? '🔴 IT' : player.isEliminated ? '💀 Out' : `${player.tagCount || 0} tags`}
                    </div>
                  </div>
                  {currentFollowId === player.id && (
                    <Eye className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Switch Toggle */}
      <div className="absolute bottom-4 left-4 z-10">
        <button
          onClick={() => setAutoSwitch(!autoSwitch)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            autoSwitch ? 'bg-indigo-500 text-white' : 'bg-gray-800/80 text-gray-400 hover:text-white'
          }`}
        >
          <Radio className={`w-4 h-4 ${autoSwitch ? 'animate-pulse' : ''}`} />
          <span className="text-sm">Auto-Follow Action</span>
        </button>
      </div>
    </div>
  );
}

// Spectator count badge component
export function SpectatorBadge({ count = 0, onClick }) {
  if (count === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
    >
      <Eye className="w-3.5 h-3.5 text-indigo-400" />
      <span className="text-xs text-white font-medium">{count}</span>
    </button>
  );
}

// Quick spectate button for eliminated players
export function SpectatePrompt({ onSpectate, onLeave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mx-4 max-w-sm w-full text-center">
        <Eye className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Game Over!</h2>
        <p className="text-gray-400 mb-6">Want to watch the rest of the game?</p>
        
        <div className="space-y-3">
          <button
            onClick={onSpectate}
            className="w-full py-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors"
          >
            <div className="flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              Spectate
            </div>
          </button>
          <button
            onClick={onLeave}
            className="w-full py-3 bg-gray-800 text-gray-300 font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}
