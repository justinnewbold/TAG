import React, { useState, useEffect, useRef, useMemo } from 'react';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, Users, Copy, Check, Play, UserPlus, Clock, Target, MapPin,
  Shield, Share2, Loader2, ChevronDown, X, MoreVertical, Globe, Lock,
  UserCheck, UserX, Ban, Map, Maximize2, Minimize2, Eye
} from 'lucide-react';
import { useStore, useSounds, GAME_MODES } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import InviteModal from '../components/InviteModal';
import BottomSheet from '../components/BottomSheet';

// Map controller
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// User location marker
const userIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width: 16px; height: 16px; background: #00f5ff; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #00f5ff;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Player marker
const createPlayerIcon = (isHost) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="width: ${isHost ? 20 : 14}px; height: ${isHost ? 20 : 14}px; background: ${isHost ? '#f97316' : '#22c55e'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${isHost ? '#f97316' : '#22c55e'};">${isHost ? '👑' : ''}</div>`,
  iconSize: [isHost ? 20 : 14, isHost ? 20 : 14],
  iconAnchor: [isHost ? 10 : 7, isHost ? 10 : 7],
});

function GameLobby() {
  const navigate = useNavigate();
  const { currentGame, user, startGame, leaveGame, syncGameState } = useStore();
  const { playSound, vibrate } = useSounds();

  // UI State
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [playerMenuId, setPlayerMenuId] = useState(null);

  // Action State
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const countdownIntervalRef = useRef(null);
  const gameStartedRef = useRef(false);

  // Derived values
  const isHost = currentGame?.host === user?.id;
  const playerCount = currentGame?.players?.length || 0;
  const pendingCount = currentGame?.pendingPlayers?.length || 0;
  const gameMode = currentGame?.gameMode || 'classic';
  const modeConfig = GAME_MODES[gameMode] || GAME_MODES.classic;
  const minPlayers = currentGame?.settings?.allowSoloPlay ? 1 : (modeConfig.minPlayers || 2);
  const canStart = playerCount >= minPlayers;

  // Get center location for map
  const mapCenter = useMemo(() => {
    // Try game boundary center, then host location, then first player, then user
    if (currentGame?.settings?.customBoundary?.center) {
      return currentGame.settings.customBoundary.center;
    }
    const hostPlayer = currentGame?.players?.find(p => p.id === currentGame.host);
    if (hostPlayer?.location) return hostPlayer.location;
    const firstPlayerWithLocation = currentGame?.players?.find(p => p.location);
    if (firstPlayerWithLocation?.location) return firstPlayerWithLocation.location;
    return user?.location || { lat: 40.7128, lng: -74.0060 };
  }, [currentGame?.settings?.customBoundary, currentGame?.players, currentGame?.host, user?.location]);

  // Calculate zoom based on play area radius
  const getZoomForRadius = (radius) => {
    if (!radius || radius >= 20015000) return 3;
    if (radius >= 1000000) return 5;
    if (radius >= 100000) return 7;
    if (radius >= 10000) return 10;
    if (radius >= 1000) return 13;
    if (radius >= 500) return 14;
    return 16;
  };

  // Clean up countdown
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    const handleGameStarted = ({ game }) => {
      playSound('gameStart');
      vibrate([100, 100, 100, 100, 100, 100, 300]);
      syncGameState(game);
      navigate('/game');
    };

    const handlePlayerKicked = ({ playerId }) => {
      if (playerId === user?.id) {
        leaveGame();
        navigate('/');
        alert('You were removed from the game');
      }
    };

    const handlePlayerBanned = ({ playerId }) => {
      if (playerId === user?.id) {
        leaveGame();
        navigate('/');
        alert('You were banned from this game');
      }
    };

    const handleSettingsUpdated = ({ game }) => syncGameState(game);
    const handlePlayerRejected = ({ playerId }) => {
      if (playerId === user?.id) {
        navigate('/');
        alert('Your request to join was declined');
      }
    };

    socketService.on('game:started', handleGameStarted);
    socketService.on('player:kicked', handlePlayerKicked);
    socketService.on('player:banned', handlePlayerBanned);
    socketService.on('game:settingsUpdated', handleSettingsUpdated);
    socketService.on('player:rejected', handlePlayerRejected);

    return () => {
      socketService.off('game:started', handleGameStarted);
      socketService.off('player:kicked', handlePlayerKicked);
      socketService.off('player:banned', handlePlayerBanned);
      socketService.off('game:settingsUpdated', handleSettingsUpdated);
      socketService.off('player:rejected', handlePlayerRejected);
    };
  }, [navigate, playSound, vibrate, syncGameState, user?.id, leaveGame]);

  // Actions
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentGame?.code || '');
      setCopied(true);
      vibrate([50]);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = currentGame?.code || '';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    if (!canStart || isStarting || gameStartedRef.current) return;

    setIsStarting(true);
    setError('');
    setCountdown(3);
    playSound('gameStart');
    vibrate([100, 100, 100, 100, 100, 100, 300]);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          if (!gameStartedRef.current) {
            gameStartedRef.current = true;
            doStartGame();
          }
          return null;
        }
        playSound('tag');
        return prev - 1;
      });
    }, 1000);
  };

  const doStartGame = async () => {
    try {
      const { game } = await api.startGame(currentGame.id);
      syncGameState(game);
      navigate('/game');
    } catch (err) {
      if (err.message?.includes('fetch') || err.message?.includes('Network')) {
        startGame();
        navigate('/game');
      } else {
        gameStartedRef.current = false;
        setError(err.message || 'Failed to start game');
        setCountdown(null);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    try {
      await api.leaveGame();
      socketService.leaveGameRoom(currentGame.id);
    } catch (err) {
      console.error('Leave error:', err);
    }

    leaveGame();
    navigate('/');
  };

  const handleKickPlayer = async (playerId) => {
    if (isKicking) return;
    setIsKicking(true);
    setPlayerMenuId(null);
    try {
      const { game } = await api.kickPlayer(currentGame.id, playerId);
      syncGameState(game);
      vibrate([50]);
    } catch (err) {
      setError(err.message || 'Failed to remove player');
    } finally {
      setIsKicking(false);
    }
  };

  const handleBanPlayer = async (playerId) => {
    if (isKicking) return;
    setIsKicking(true);
    setPlayerMenuId(null);
    try {
      const { game } = await api.banPlayer(currentGame.id, playerId);
      syncGameState(game);
      vibrate([50, 50, 50]);
    } catch (err) {
      setError(err.message || 'Failed to ban player');
    } finally {
      setIsKicking(false);
    }
  };

  const handleApprovePlayer = async (playerId) => {
    try {
      const { game } = await api.approvePlayer(currentGame.id, playerId);
      syncGameState(game);
      vibrate([50]);
      playSound('tag');
    } catch (err) {
      setError(err.message || 'Failed to approve');
    }
  };

  const handleRejectPlayer = async (playerId) => {
    try {
      const { game } = await api.rejectPlayer(currentGame.id, playerId);
      syncGameState(game);
    } catch (err) {
      setError(err.message || 'Failed to reject');
    }
  };

  // Format helpers
  const formatRadius = (meters) => {
    if (!meters || meters >= 20015000) return 'No Limit';
    if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
    return `${meters}m`;
  };

  const formatDuration = (ms) => {
    if (!ms) return 'Unlimited';
    if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))} min`;
    if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} hour`;
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))} day`;
  };

  if (!currentGame) {
    navigate('/');
    return null;
  }

  const playAreaRadius = currentGame.settings?.playAreaRadius ||
    currentGame.settings?.customBoundary?.radius || 500;

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {currentGame.settings?.gameName || 'Game Lobby'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>{playerCount}/{currentGame.settings?.maxPlayers}</span>
              <span>•</span>
              <span>{modeConfig.name}</span>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl"
          >
            <Eye className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      {/* Game Code - Prominent */}
      <div className="px-4 py-3">
        <button
          onClick={handleCopyCode}
          className="w-full p-4 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-white/10 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div>
            <p className="text-xs text-white/50 mb-1">GAME CODE</p>
            <p className="text-3xl font-display font-bold tracking-[0.3em] text-neon-cyan">
              {currentGame.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {copied ? (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Check className="w-5 h-5" />
                <span>Copied!</span>
              </div>
            ) : (
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Copy className="w-5 h-5 text-white/70" />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Map Preview */}
      <div className={`relative mx-4 rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 ${mapExpanded ? 'flex-1' : 'h-40'}`}>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={getZoomForRadius(playAreaRadius)}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} zoom={getZoomForRadius(playAreaRadius)} />

          {/* Play Area Boundary */}
          {playAreaRadius < 20015000 && (
            <Circle
              center={[mapCenter.lat, mapCenter.lng]}
              radius={playAreaRadius}
              pathOptions={{
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '10, 5',
              }}
            />
          )}

          {/* Tag Radius Preview */}
          {currentGame.settings?.tagRadius && (
            <Circle
              center={[mapCenter.lat, mapCenter.lng]}
              radius={currentGame.settings.tagRadius}
              pathOptions={{
                color: '#a855f7',
                fillColor: '#a855f7',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          )}

          {/* Safe Zones */}
          {currentGame.settings?.noTagZones?.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          ))}

          {/* Player Markers */}
          {currentGame.players?.map((player) => (
            player.location && (
              <Marker
                key={player.id}
                position={[player.location.lat, player.location.lng]}
                icon={createPlayerIcon(player.id === currentGame.host)}
              />
            )
          ))}
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute top-2 right-2 z-[1000]">
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="w-10 h-10 bg-dark-900/90 backdrop-blur rounded-xl flex items-center justify-center border border-white/10"
          >
            {mapExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-2 left-2 right-2 z-[1000]">
          <div className="bg-dark-900/90 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-neon-purple border border-white/50"></div>
              <span className="text-white/60">Tag: {formatRadius(currentGame.settings?.tagRadius)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 border-dashed"></div>
              <span className="text-white/60">Area: {formatRadius(playAreaRadius)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Mode & Status Badges */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {/* Mode Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
          <span className="text-xl">{modeConfig.icon}</span>
          <span className="text-sm font-medium">{modeConfig.name}</span>
        </div>

        {/* Public/Private */}
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm ${
          currentGame.settings?.isPublic
            ? 'bg-blue-400/15 text-blue-400'
            : 'bg-amber-400/15 text-amber-400'
        }`}>
          {currentGame.settings?.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {currentGame.settings?.isPublic ? 'Public' : 'Private'}
        </div>

        {/* Solo OK */}
        {currentGame.settings?.allowSoloPlay && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-green-400/15 text-green-400">
            <Play className="w-4 h-4" />
            Solo
          </div>
        )}
      </div>

      {/* Players List - Scrollable */}
      <div className={`flex-1 overflow-y-auto px-4 pb-32 ${mapExpanded ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Players ({playerCount})
          </h3>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 text-neon-cyan text-sm px-3 py-1.5 bg-neon-cyan/10 rounded-full"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        </div>

        <div className="space-y-2">
          {currentGame.players?.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                player.id === user?.id
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                  : 'bg-white/5'
              }`}
            >
              <Avatar user={player} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{player.name}</p>
                  {player.id === user?.id && <span className="text-xs text-neon-cyan">(You)</span>}
                  {player.id === currentGame.host && <span className="text-xs">👑</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  {player.location ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <MapPin className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> GPS...
                    </span>
                  )}
                </div>
              </div>

              {/* Host Actions */}
              {isHost && player.id !== user?.id && (
                <div className="relative">
                  <button
                    onClick={() => setPlayerMenuId(playerMenuId === player.id ? null : player.id)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <MoreVertical className="w-4 h-4 text-white/50" />
                  </button>
                  {playerMenuId === player.id && (
                    <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                      <button
                        onClick={() => handleKickPlayer(player.id)}
                        disabled={isKicking}
                        className="w-full px-4 py-3 text-left text-amber-400 hover:bg-amber-400/10 flex items-center gap-2 text-sm"
                      >
                        <UserX className="w-4 h-4" />
                        Remove
                      </button>
                      <button
                        onClick={() => handleBanPlayer(player.id)}
                        disabled={isKicking}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 flex items-center gap-2 border-t border-white/5 text-sm"
                      >
                        <Ban className="w-4 h-4" />
                        Ban
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Pending Players */}
          {isHost && currentGame.pendingPlayers?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-amber-400 mb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Pending ({currentGame.pendingPlayers.length})
              </p>
              {currentGame.pendingPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 mb-2"
                >
                  <Avatar user={player} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.name}</p>
                    <p className="text-xs text-white/40">Wants to join</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprovePlayer(player.id)}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectPlayer(player.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty Slots */}
          {playerCount < minPlayers && [...Array(minPlayers - playerCount)].map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => setShowInvite(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border-2 border-dashed border-white/10 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg text-white/30">+</div>
              <div className="flex-1 text-left">
                <p className="text-white/40 font-medium">Invite player</p>
              </div>
            </button>
          ))}
        </div>

        {/* Warning */}
        {playerCount < minPlayers && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-400 text-sm">
              Need {minPlayers - playerCount} more player{minPlayers - playerCount > 1 ? 's' : ''} to start
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <div className="flex gap-3">
          <button
            onClick={() => setShowInvite(true)}
            className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center"
          >
            <Share2 className="w-6 h-6" />
          </button>

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className={`flex-1 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                canStart && !isStarting
                  ? 'bg-gradient-to-r from-neon-purple to-neon-cyan'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Starting...
                </>
              ) : canStart ? (
                <>
                  <Play className="w-6 h-6" />
                  Start Game
                </>
              ) : (
                `Waiting for ${minPlayers - playerCount} more...`
              )}
            </button>
          ) : (
            <div className="flex-1 h-14 bg-white/5 rounded-xl flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              <span className="text-white/60">Waiting for host...</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Sheet */}
      <BottomSheet isOpen={showSettings} onClose={() => setShowSettings(false)} title="Game Settings">
        <div className="space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-4 rounded-xl text-center">
              <Target className="w-6 h-6 mx-auto text-neon-purple mb-2" />
              <p className="text-xs text-white/50">Tag Radius</p>
              <p className="font-bold">{formatRadius(currentGame.settings?.tagRadius)}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl text-center">
              <Map className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
              <p className="text-xs text-white/50">Play Area</p>
              <p className="font-bold">{formatRadius(playAreaRadius)}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl text-center">
              <Users className="w-6 h-6 mx-auto text-amber-400 mb-2" />
              <p className="text-xs text-white/50">Max Players</p>
              <p className="font-bold">{currentGame.settings?.maxPlayers}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl text-center">
              <Clock className="w-6 h-6 mx-auto text-orange-400 mb-2" />
              <p className="text-xs text-white/50">Duration</p>
              <p className="font-bold">{formatDuration(currentGame.settings?.duration)}</p>
            </div>
          </div>

          {/* Safe Zones */}
          {currentGame.settings?.noTagZones?.length > 0 && (
            <div className="bg-white/5 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-400">Safe Zones</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentGame.settings.noTagZones.map((zone) => (
                  <span key={zone.id} className="text-xs bg-green-400/10 text-green-400 px-2 py-1 rounded-full">
                    {zone.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-3xl p-6 w-full max-w-md animate-slide-up pb-safe">
            <h2 className="text-xl font-bold mb-2 text-center">Leave Game?</h2>
            <p className="text-white/60 mb-6 text-center">
              {isHost ? "You're the host. The game will be cancelled." : "You can rejoin with the code."}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="w-full h-14 bg-red-500 rounded-xl text-lg font-bold flex items-center justify-center"
              >
                {isLeaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Leave Game'}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full h-14 bg-white/10 rounded-xl text-lg"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-dark-900/95 flex items-center justify-center">
          <div className="text-center">
            <div className="text-9xl font-display font-bold text-neon-cyan mb-4 animate-bounce">{countdown}</div>
            <p className="text-2xl text-white/60">Get Ready!</p>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal gameCode={currentGame.code} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}

export default GameLobby;
