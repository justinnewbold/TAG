import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Target, Users, Clock, X, Zap, AlertTriangle, Flag, Shield, Calendar, Loader2, Snowflake, Skull, Heart } from 'lucide-react';
import { useStore, useSounds, isInNoTagTime, isInNoTagZone, canTagNow, GAME_MODES } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import GameEndSummary from '../components/GameEndSummary';

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

function ActiveGame() {
  const navigate = useNavigate();
  const { currentGame, user, tagPlayer, endGame, updatePlayerLocation, syncGameState, games } = useStore();
  const { playSound, vibrate } = useSounds();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEndSummary, setShowEndSummary] = useState(false);
  const [endedGame, setEndedGame] = useState(null);
  const [gameTime, setGameTime] = useState(0);
  const [tagAnimation, setTagAnimation] = useState(false);
  const [tagError, setTagError] = useState(null);
  const [isTagging, setIsTagging] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [noTagStatus, setNoTagStatus] = useState({ inZone: false, inTime: false });
  const intervalRef = useRef(null);
  const prevItRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  // Send location updates via socket
  useEffect(() => {
    if (user?.location && currentGame?.status === 'active') {
      socketService.updateLocation(user.location);
    }
  }, [user?.location, currentGame?.status]);

  // Listen for game ended event
  useEffect(() => {
    const handleGameEnded = ({ game, summary }) => {
      setEndedGame(game);
      setShowEndSummary(true);
    };

    socketService.on('game:ended', handleGameEnded);

    return () => {
      socketService.off('game:ended', handleGameEnded);
    };
  }, []);

  // Update game timer and no-tag status
  useEffect(() => {
    if (currentGame?.startedAt) {
      intervalRef.current = setInterval(() => {
        setGameTime(Date.now() - currentGame.startedAt);

        // Check no-tag status
        const inTime = isInNoTagTime(currentGame.settings?.noTagTimes);
        const inZone = isInNoTagZone(user?.location, currentGame.settings?.noTagZones);
        setNoTagStatus({ inTime, inZone });
      }, 1000);

      return () => clearInterval(intervalRef.current);
    }
  }, [currentGame?.startedAt, currentGame?.settings, user?.location]);

  // Detect when IT changes
  useEffect(() => {
    if (currentGame?.itPlayerId && prevItRef.current !== null) {
      if (prevItRef.current !== currentGame.itPlayerId) {
        if (currentGame.itPlayerId === user?.id) {
          playSound('tagged');
          vibrate([200, 100, 200, 100, 400]);
        } else if (prevItRef.current === user?.id) {
          playSound('tag');
          vibrate([100, 50, 200]);
          setTagAnimation(true);
          animationTimeoutRef.current = setTimeout(() => setTagAnimation(false), 500);
        }
      }
    }
    prevItRef.current = currentGame?.itPlayerId;
  }, [currentGame?.itPlayerId, user?.id]);

  // Check game duration - uses interval instead of depending on gameTime to avoid re-renders
  useEffect(() => {
    if (!currentGame?.settings?.duration || !currentGame?.startedAt) return;

    const checkDuration = () => {
      const remaining = currentGame.settings.duration - (Date.now() - currentGame.startedAt);
      if (remaining <= 0) {
        handleEndGame();
      }
    };

    // Check immediately and then every 5 seconds
    checkDuration();
    const intervalId = setInterval(checkDuration, 5000);

    return () => clearInterval(intervalId);
  }, [currentGame?.settings?.duration, currentGame?.startedAt]);
  
  // Allow hiding phase for hide and seek
  if (!currentGame || (currentGame.status !== 'active' && currentGame.status !== 'hiding')) {
    const lastGame = games.filter(g => g.status === 'ended').sort((a, b) => b.endedAt - a.endedAt)[0];
    if (lastGame && Date.now() - lastGame.endedAt < 5000) {
      return <GameEndSummary game={lastGame} onClose={() => navigate('/')} />;
    }
    navigate('/');
    return null;
  }

  // Game mode info
  const gameMode = currentGame.gameMode || 'classic';
  const modeConfig = GAME_MODES[gameMode] || GAME_MODES.classic;
  
  // Mode-specific player state
  const currentPlayer = currentGame.players?.find(p => p.id === user?.id);
  const isIt = gameMode === 'teamTag' 
    ? true // Everyone can tag in team mode
    : gameMode === 'infection'
    ? currentPlayer?.isIt
    : currentGame.itPlayerId === user?.id;
  const isFrozen = currentPlayer?.isFrozen;
  const isEliminated = currentPlayer?.isEliminated;
  const playerTeam = currentPlayer?.team;
  const itPlayer = currentGame.players?.find((p) => p.id === currentGame.itPlayerId);
  const otherPlayers = currentGame.players?.filter((p) => p.id !== user?.id) || [];
  
  // Get counts for game modes
  const frozenCount = currentGame.players?.filter(p => p.isFrozen && !p.isIt).length || 0;
  const infectedCount = currentGame.players?.filter(p => p.isIt).length || 0;
  const survivorCount = currentGame.players?.filter(p => !p.isIt && !p.isEliminated).length || 0;
  const redTeamAlive = currentGame.players?.filter(p => p.team === 'red' && !p.isEliminated).length || 0;
  const blueTeamAlive = currentGame.players?.filter(p => p.team === 'blue' && !p.isEliminated).length || 0;
  
  // Hot potato timer
  const potatoTimeLeft = currentGame.potatoExpiresAt ? Math.max(0, currentGame.potatoExpiresAt - Date.now()) : 0;
  
  // Hide and seek hiding phase
  const isHidingPhase = currentGame.status === 'hiding';
  const hideTimeLeft = currentGame.hidePhaseEndAt ? Math.max(0, currentGame.hidePhaseEndAt - Date.now()) : 0;
  
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  const getNearestTaggable = () => {
    if (!user?.location) return { player: null, distance: Infinity };
    
    // Determine which players can be tagged based on game mode
    const canTagPlayer = (player) => {
      if (!player.location) return false;
      if (player.isEliminated) return false;
      
      switch (gameMode) {
        case 'teamTag':
          return player.team !== playerTeam && !player.isEliminated;
        case 'infection':
          return !player.isIt; // Can only tag non-infected
        case 'freezeTag':
          if (isIt) return !player.isFrozen && !player.isIt; // IT freezes unfrozen players
          return player.isFrozen && !player.isIt; // Non-IT unfreezes frozen teammates
        case 'manhunt':
          return isIt && !player.isEliminated;
        case 'hotPotato':
          return isIt && !player.isEliminated;
        case 'classic':
        default:
          return isIt;
      }
    };
    
    let nearest = null;
    let nearestDist = Infinity;
    
    otherPlayers.forEach((player) => {
      if (canTagPlayer(player)) {
        const dist = getDistance(
          user.location.lat, user.location.lng,
          player.location.lat, player.location.lng
        );
        if (dist < nearestDist) {
          nearest = player;
          nearestDist = dist;
        }
      }
    });
    
    return { player: nearest, distance: nearestDist };
  };
  
  const { player: nearestPlayer, distance: nearestDistance } = getNearestTaggable();
  const inTagRange = isIt && nearestPlayer && nearestDistance <= (currentGame.settings?.tagRadius || 20);
  
  // Check if tagging is allowed
  const tagCheck = canTagNow(currentGame, user?.location, nearestPlayer?.location);
  const canTag = inTagRange && tagCheck.allowed;
  
  const handleTag = async () => {
    if (!inTagRange || isTagging) return;

    if (!tagCheck.allowed) {
      setTagError(tagCheck.reason);
      playSound('error');
      vibrate([100, 50, 100]);
      errorTimeoutRef.current = setTimeout(() => setTagError(null), 3000);
      return;
    }

    if (nearestPlayer) {
      setIsTagging(true);

      try {
        // Try to tag via API
        const { success, tagTime } = await api.tagPlayer(currentGame.id, nearestPlayer.id);

        if (success) {
          playSound('tag');
          vibrate([100, 50, 200]);
          setTagAnimation(true);
          animationTimeoutRef.current = setTimeout(() => setTagAnimation(false), 500);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Tag error:', err);

        // Fallback to local tag if server unavailable
        if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
          const result = tagPlayer(nearestPlayer.id);
          if (result.success) {
            playSound('tag');
            vibrate([100, 50, 200]);
            setTagAnimation(true);
            animationTimeoutRef.current = setTimeout(() => setTagAnimation(false), 500);
          }
        } else {
          setTagError(err.message || 'Failed to tag');
          playSound('error');
          vibrate([100, 50, 100]);
          errorTimeoutRef.current = setTimeout(() => setTagError(null), 3000);
        }
      } finally {
        setIsTagging(false);
      }
    }
  };

  const handleEndGame = async () => {
    if (isEnding) return;

    setIsEnding(true);
    const gameToEnd = { ...currentGame };

    try {
      // Try to end via API
      const { game, summary } = await api.endGame(currentGame.id);
      setEndedGame(game);
      setShowEndSummary(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('End game error:', err);

      // Fallback to local end
      endGame(isIt ? null : user?.id);
      setEndedGame(gameToEnd);
      setShowEndSummary(true);
    } finally {
      setIsEnding(false);
    }
  };
  
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatInterval = (ms) => {
    if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))}m`;
    if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))}h`;
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))}d`;
  };
  
  const userLocation = user?.location || { lat: 37.7749, lng: -122.4194 };
  const noTagZones = currentGame.settings?.noTagZones || [];
  
  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <div className="relative z-10 bg-dark-900/90 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/50" />
                <span className="font-mono text-lg font-bold">{formatTime(gameTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/50" />
                <span>{currentGame.players?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/40">
                <span>GPS: {formatInterval(currentGame.settings?.gpsInterval)}</span>
              </div>
            </div>
            
            <button onClick={() => setShowEndConfirm(true)} className="p-2 hover:bg-white/10 rounded-lg">
              <Flag className="w-5 h-5 text-white/50" />
            </button>
          </div>
          
          {/* No-Tag Status Banners */}
          {(noTagStatus.inTime || noTagStatus.inZone) && (
            <div className="mt-2 flex gap-2">
              {noTagStatus.inTime && (
                <div className="flex-1 flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400">No-Tag Time Active</span>
                </div>
              )}
              {noTagStatus.inZone && (
                <div className="flex-1 flex items-center gap-2 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">In Safe Zone</span>
                </div>
              )}
            </div>
          )}
          
          {/* Game Mode Badge */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg">{modeConfig.icon}</span>
            <span className="text-sm font-medium text-white/70">{modeConfig.name}</span>
            
            {/* Mode-specific stats */}
            {gameMode === 'freezeTag' && (
              <span className="text-xs text-blue-400 ml-auto">
                <Snowflake className="w-3 h-3 inline mr-1" />
                {frozenCount} frozen
              </span>
            )}
            {gameMode === 'infection' && (
              <span className="text-xs text-green-400 ml-auto">
                🧟 {infectedCount} infected • {survivorCount} survivors
              </span>
            )}
            {gameMode === 'teamTag' && (
              <span className="text-xs ml-auto">
                <span className="text-red-400">🔴 {redTeamAlive}</span>
                <span className="mx-1">vs</span>
                <span className="text-blue-400">🔵 {blueTeamAlive}</span>
              </span>
            )}
            {gameMode === 'hotPotato' && isIt && (
              <span className={`text-xs ml-auto font-mono font-bold ${potatoTimeLeft < 10000 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                🥔 {Math.ceil(potatoTimeLeft / 1000)}s
              </span>
            )}
          </div>
          
          {/* Hide and Seek - Hiding Phase Banner */}
          {isHidingPhase && (
            <div className="mt-2 p-3 bg-pink-500/20 border border-pink-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👀</span>
                  <span className="font-bold text-pink-400">
                    {isIt ? 'Close your eyes!' : 'Hide now!'}
                  </span>
                </div>
                <span className="font-mono font-bold text-pink-400">
                  {formatTime(hideTimeLeft)}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                {isIt ? 'Seeking begins when timer ends' : 'Find a good hiding spot!'}
              </p>
            </div>
          )}
          
          {/* Player Status - Frozen/Eliminated */}
          {isFrozen && (
            <div className="mt-2 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-3">
              <Snowflake className="w-6 h-6 text-blue-400 animate-pulse" />
              <div>
                <p className="font-bold text-blue-400">YOU'RE FROZEN!</p>
                <p className="text-xs text-white/50">Wait for a teammate to unfreeze you</p>
              </div>
            </div>
          )}
          
          {isEliminated && (
            <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <Skull className="w-6 h-6 text-red-400" />
              <div>
                <p className="font-bold text-red-400">ELIMINATED!</p>
                <p className="text-xs text-white/50">Watch the remaining players</p>
              </div>
            </div>
          )}
          
          {/* Team indicator for team tag */}
          {gameMode === 'teamTag' && !isEliminated && (
            <div className={`mt-2 p-3 rounded-xl flex items-center justify-between ${
              playerTeam === 'red' 
                ? 'bg-red-500/20 border border-red-500/30' 
                : 'bg-blue-500/20 border border-blue-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{playerTeam === 'red' ? '🔴' : '🔵'}</span>
                <div>
                  <p className={`font-bold ${playerTeam === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                    Team {playerTeam === 'red' ? 'Red' : 'Blue'}
                  </p>
                  <p className="text-xs text-white/50">Tag the opposing team!</p>
                </div>
              </div>
            </div>
          )}
          
          {/* IT Status - Classic modes */}
          {!isHidingPhase && !isEliminated && gameMode !== 'teamTag' && (
            <div className={`mt-3 p-3 rounded-xl flex items-center justify-between ${
              isIt 
                ? 'bg-neon-orange/20 border border-neon-orange/30' 
                : 'bg-neon-cyan/10 border border-neon-cyan/30'
            }`}>
              <div className="flex items-center gap-3">
                {isIt ? (
                  <>
                    <Target className="w-6 h-6 text-neon-orange animate-pulse" />
                    <div>
                      <p className="font-display font-bold text-neon-orange">
                        {gameMode === 'infection' ? "YOU'RE INFECTED!" : 
                         gameMode === 'hotPotato' ? "YOU HAVE THE POTATO!" :
                         gameMode === 'manhunt' ? "YOU'RE THE HUNTER!" :
                         gameMode === 'freezeTag' ? "YOU'RE IT!" :
                         gameMode === 'hideAndSeek' ? "YOU'RE THE SEEKER!" :
                         "YOU'RE IT!"}
                      </p>
                      <p className="text-xs text-white/50">
                        {gameMode === 'infection' ? 'Spread the infection!' :
                         gameMode === 'hotPotato' ? 'Pass it before time runs out!' :
                         gameMode === 'manhunt' ? 'Hunt down the runners!' :
                         gameMode === 'freezeTag' ? 'Freeze the other players!' :
                         gameMode === 'hideAndSeek' ? 'Find the hiders!' :
                         'Tag someone to pass it on!'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-neon-cyan" />
                    <div>
                      <p className="font-display font-bold text-neon-cyan">
                        {gameMode === 'infection' ? `${infectedCount} infected!` :
                         gameMode === 'manhunt' ? `${itPlayer?.name} is hunting!` :
                         `${itPlayer?.name} is IT!`}
                      </p>
                      <p className="text-xs text-white/50">
                        {gameMode === 'freezeTag' && isFrozen ? 'Wait for rescue!' :
                         gameMode === 'freezeTag' ? 'Avoid IT or unfreeze teammates!' :
                         'Run and hide!'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Tag Error Message */}
          {tagError && (
            <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-slide-down">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{tagError}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapController center={userLocation} />
          
          {/* No-Tag Zones */}
          {noTagZones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 5',
              }}
            >
              <Popup>
                <div className="text-center">
                  <Shield className="w-4 h-4 mx-auto text-green-500 mb-1" />
                  <p className="font-medium">{zone.name}</p>
                  <p className="text-xs text-gray-500">Safe Zone - No Tagging</p>
                </div>
              </Popup>
            </Circle>
          ))}
          
          {/* Tag radius for IT */}
          {isIt && user?.location && (
            <Circle
              center={[user.location.lat, user.location.lng]}
              radius={currentGame.settings?.tagRadius || 20}
              pathOptions={{
                color: noTagStatus.inTime || noTagStatus.inZone ? '#666' : '#f97316',
                fillColor: noTagStatus.inTime || noTagStatus.inZone ? '#666' : '#f97316',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}
          
          {/* User marker */}
          {user?.location && (
            <Marker
              position={[user.location.lat, user.location.lng]}
              icon={createIcon(
                isFrozen ? '#60a5fa' :
                isEliminated ? '#666' :
                noTagStatus.inZone ? '#22c55e' : 
                playerTeam === 'red' ? '#ef4444' :
                playerTeam === 'blue' ? '#3b82f6' :
                isIt ? '#f97316' : '#00f5ff',
                isIt && !noTagStatus.inZone && !isFrozen && !isEliminated,
                isFrozen ? '🧊' : isEliminated ? '💀' : user.avatar || '🏃'
              )}
            >
              <Popup>
                You 
                {isIt ? ' (IT!)' : ''} 
                {isFrozen ? ' (Frozen)' : ''} 
                {isEliminated ? ' (Out)' : ''} 
                {playerTeam ? ` (${playerTeam})` : ''}
                {noTagStatus.inZone ? ' (Safe)' : ''}
              </Popup>
            </Marker>
          )}
          
          {/* Other players */}
          {otherPlayers.map((player) => {
            if (!player.location) return null;
            // Hide non-IT player locations during hide and seek hiding phase if you're the seeker
            if (isHidingPhase && isIt && !player.isIt) return null;
            
            const isPlayerIt = gameMode === 'infection' 
              ? player.isIt 
              : player.id === currentGame.itPlayerId;
            const playerInZone = isInNoTagZone(player.location, noTagZones);
            const isPlayerFrozen = player.isFrozen;
            const isPlayerEliminated = player.isEliminated;
            
            // Determine marker color based on game mode
            let markerColor;
            if (isPlayerFrozen) markerColor = '#60a5fa';
            else if (isPlayerEliminated) markerColor = '#666';
            else if (playerInZone) markerColor = '#22c55e';
            else if (gameMode === 'teamTag') markerColor = player.team === 'red' ? '#ef4444' : '#3b82f6';
            else if (gameMode === 'infection' && player.isIt) markerColor = '#22c55e'; // Infected = green/zombie
            else if (isPlayerIt) markerColor = '#f97316';
            else markerColor = '#22c55e';
            
            return (
              <Marker
                key={player.id}
                position={[player.location.lat, player.location.lng]}
                icon={createIcon(
                  markerColor,
                  isPlayerIt && !playerInZone && !isPlayerFrozen && !isPlayerEliminated,
                  isPlayerFrozen ? '🧊' : 
                  isPlayerEliminated ? '💀' : 
                  (gameMode === 'infection' && player.isIt) ? '🧟' :
                  player.avatar || '🏃'
                )}
              >
                <Popup>
                  {player.name} 
                  {isPlayerIt ? ' (IT!)' : ''} 
                  {isPlayerFrozen ? ' (Frozen)' : ''} 
                  {isPlayerEliminated ? ' (Out)' : ''} 
                  {player.team ? ` (${player.team})` : ''}
                  {playerInZone ? ' (Safe)' : ''}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Nearest Player Info */}
        {isIt && nearestPlayer && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {nearestPlayer.isFrozen ? '🧊' : 
                   nearestPlayer.team === 'red' ? '🔴' :
                   nearestPlayer.team === 'blue' ? '🔵' :
                   nearestPlayer.avatar || '🏃'}
                </span>
                <div>
                  <p className="font-medium text-sm">{nearestPlayer.name}</p>
                  <p className="text-xs text-white/50">
                    {isInNoTagZone(nearestPlayer.location, noTagZones) ? '🛡️ In Safe Zone' : 
                     nearestPlayer.isFrozen ? '🧊 Frozen - touch to unfreeze' :
                     gameMode === 'teamTag' ? `Team ${nearestPlayer.team}` :
                     'Nearest target'}
                  </p>
                </div>
              </div>
              <div className={`text-right ${inTagRange && tagCheck.allowed ? 'text-neon-orange' : ''}`}>
                <p className="font-bold">
                  {nearestDistance < 1000 
                    ? `${Math.round(nearestDistance)}m` 
                    : `${(nearestDistance / 1000).toFixed(1)}km`}
                </p>
                {inTagRange && tagCheck.allowed && (
                  <p className="text-xs text-neon-orange animate-pulse">In range!</p>
                )}
                {inTagRange && !tagCheck.allowed && (
                  <p className="text-xs text-yellow-400">Protected</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Freeze tag: Show unfreeze button for non-IT players near frozen teammates */}
        {gameMode === 'freezeTag' && !isIt && nearestPlayer?.isFrozen && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="card p-3 flex items-center justify-between bg-blue-500/20 border-blue-500/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🧊</span>
                <div>
                  <p className="font-medium text-sm">{nearestPlayer.name}</p>
                  <p className="text-xs text-blue-400">Touch to unfreeze!</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-400">
                  {nearestDistance < 1000 
                    ? `${Math.round(nearestDistance)}m` 
                    : `${(nearestDistance / 1000).toFixed(1)}km`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Button - varies by game mode */}
      {!isEliminated && !isFrozen && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10">
          {/* TAG Button for IT players / Team Tag / Freeze Tag unfreeze */}
          {(isIt || (gameMode === 'teamTag' && nearestPlayer) || (gameMode === 'freezeTag' && !isIt && nearestPlayer?.isFrozen)) && (
            <button
              onClick={handleTag}
              disabled={!inTagRange || isTagging || isHidingPhase}
              className={`w-32 h-32 rounded-full font-display font-bold text-2xl transition-all transform ${
                isHidingPhase
                  ? 'bg-pink-500/50 text-pink-200'
                  : canTag && !isTagging
                  ? gameMode === 'freezeTag' && !isIt
                    ? 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg shadow-blue-400/50 animate-pulse hover:scale-105 active:scale-95'
                    : gameMode === 'hotPotato'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/50 animate-pulse hover:scale-105 active:scale-95'
                    : 'bg-gradient-to-br from-neon-orange to-red-500 shadow-lg shadow-neon-orange/50 animate-pulse hover:scale-105 active:scale-95'
                  : inTagRange && !tagCheck.allowed
                  ? 'bg-yellow-500/50 text-yellow-200'
                  : 'bg-white/10 text-white/30'
              } ${tagAnimation ? 'scale-110' : ''}`}
            >
              {isTagging ? (
                <Loader2 className="w-10 h-10 animate-spin mx-auto" />
              ) : isHidingPhase ? (
                '👀'
              ) : !inTagRange ? (
                gameMode === 'freezeTag' && !isIt ? '❄️' :
                gameMode === 'hotPotato' ? '🥔' :
                gameMode === 'infection' ? '🧟' :
                'TAG!'
              ) : !tagCheck.allowed ? (
                '🛡️'
              ) : (
                gameMode === 'freezeTag' && !isIt ? 'FREE!' :
                gameMode === 'freezeTag' && isIt ? 'FREEZE!' :
                gameMode === 'hotPotato' ? 'PASS!' :
                gameMode === 'infection' ? 'INFECT!' :
                'TAG!'
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Distance to IT (non-IT players in classic modes) */}
      {!isIt && !isEliminated && !isFrozen && itPlayer?.location && user?.location && gameMode !== 'teamTag' && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-neon-orange" />
              <span className="font-medium">
                {gameMode === 'infection' ? `${infectedCount} infected` :
                 gameMode === 'manhunt' ? `${itPlayer.name} hunting` :
                 `${itPlayer.name} is IT`}
              </span>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                {(() => {
                  const dist = getDistance(
                    user.location.lat, user.location.lng,
                    itPlayer.location.lat, itPlayer.location.lng
                  );
                  const tagRadius = currentGame.settings?.tagRadius || 20;
                  const danger = dist <= tagRadius * 2;
                  return (
                    <span className={danger && !noTagStatus.inZone && !noTagStatus.inTime ? 'text-neon-orange animate-pulse' : ''}>
                      {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                    </span>
                  );
                })()}
              </p>
              <p className="text-xs text-white/50">
                {noTagStatus.inZone || noTagStatus.inTime ? '🛡️ Protected' : 'away'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* End Game Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="card-glow p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">End Game?</h2>
            <p className="text-white/60 mb-6">This will end the game for all players.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { setShowEndConfirm(false); handleEndGame(); }} className="btn-primary flex-1 bg-red-500">End Game</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Game End Summary */}
      {showEndSummary && endedGame && (
        <GameEndSummary game={endedGame} onClose={() => { setShowEndSummary(false); navigate('/'); }} />
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default ActiveGame;
