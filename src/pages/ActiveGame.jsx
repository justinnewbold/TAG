import React, { useEffect, useState, useRef, lazy, Suspense, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Target, Users, Clock, Flag, Shield, Loader2, MessageCircle, Gift } from 'lucide-react';
import { useStore, useSounds, isInNoTagTime, isInNoTagZone, canTagNow, GAME_MODES } from '../store';
import { getDistance, formatTime } from '../../shared/utils.js';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import GameEndSummary from '../components/GameEndSummary';
import { useSwipe } from '../hooks/useGestures';

// Game sub-components
import { GameHUD, TagButton, NearestPlayerCard, SwipeProgressOverlay } from '../components/game';

// Lazy load feature components
const SafetyControls = lazy(() => import('../components/SafetyControls'));
const GameChat = lazy(() => import('../components/GameChat'));
const PowerupInventory = lazy(() => import('../components/PowerupInventory'));
const SpectatorMode = lazy(() => import('../components/SpectatorMode'));
const QuickActionMenu = lazy(() => import('../components/QuickActionMenu'));

// AI Components
const SmartQuickChat = lazy(() => import('../components/AI/SmartQuickChat'));
const AICommentator = lazy(() => import('../components/AI/AICommentator'));

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
  const { currentGame, user, tagPlayer, endGame, updatePlayerLocation, syncGameState, games, powerupInventory, pauseGame, resumeGame, usePowerup } = useStore();
  const [spectating, setSpectating] = useState(false);
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
  const [commentaryEvent, setCommentaryEvent] = useState(null);
  const [showSmartChat, setShowSmartChat] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showPowerups, setShowPowerups] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [hudExpanded, setHudExpanded] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const intervalRef = useRef(null);
  const prevItRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const lastProximityZoneRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showCountdownWarning, setShowCountdownWarning] = useState(false);

  // Swipe-to-tag gesture handler
  const { handlers: swipeHandlers, swiping, swipeDistance } = useSwipe({
    onSwipeUp: ({ distance, velocity }) => {
      // Swipe up to tag when in range
      if (inTagRange && tagCheck.allowed && !isTagging && distance > 80) {
        handleTag();
      }
    },
    onSwipeMove: ({ y }) => {
      // Show progress indicator when swiping up to tag
      if (inTagRange && tagCheck.allowed && y < 0) {
        setSwipeProgress(Math.min(Math.abs(y) / 100, 1));
      }
    },
    onSwipeEnd: () => {
      setSwipeProgress(0);
    },
    threshold: 60,
    preventScroll: true
  });

  // Get GPS accuracy quality level - memoized
  const getGpsQuality = useCallback((accuracy) => {
    if (!accuracy) return { level: 'unknown', color: 'text-white/40', label: 'GPS...' };
    if (accuracy <= 10) return { level: 'excellent', color: 'text-green-400', label: `±${accuracy}m` };
    if (accuracy <= 25) return { level: 'good', color: 'text-neon-cyan', label: `±${accuracy}m` };
    if (accuracy <= 50) return { level: 'fair', color: 'text-yellow-400', label: `±${accuracy}m` };
    return { level: 'poor', color: 'text-red-400', label: `±${Math.round(accuracy)}m` };
  }, []);

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

  // Check game duration with countdown warnings
  useEffect(() => {
    if (!currentGame?.settings?.duration || !currentGame?.startedAt) return;

    const checkDuration = () => {
      const remaining = currentGame.settings.duration - (Date.now() - currentGame.startedAt);
      setTimeRemaining(remaining);
      
      // Show warning when under 1 minute
      setShowCountdownWarning(remaining <= 60000 && remaining > 0);
      
      // Countdown beeps in final 10 seconds
      if (remaining <= 10000 && remaining > 0) {
        const secondsLeft = Math.ceil(remaining / 1000);
        if (secondsLeft <= 5) {
          playSound('countdown');
          vibrate([100]);
        }
      }
      
      if (remaining <= 0) {
        handleEndGame();
      }
    };

    // Check immediately and then every second for accurate countdown
    checkDuration();
    const intervalId = setInterval(checkDuration, 1000);

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

  // Memoize game mode derived values
  const gameMode = useMemo(() => currentGame?.gameMode || 'classic', [currentGame?.gameMode]);
  const modeConfig = useMemo(() => GAME_MODES[gameMode] || GAME_MODES.classic, [gameMode]);

  // Memoize current player state
  const currentPlayer = useMemo(() =>
    currentGame?.players?.find(p => p.id === user?.id),
    [currentGame?.players, user?.id]
  );

  const isIt = useMemo(() => {
    if (gameMode === 'teamTag') return true;
    if (gameMode === 'infection') return currentPlayer?.isIt;
    return currentGame?.itPlayerId === user?.id;
  }, [gameMode, currentPlayer?.isIt, currentGame?.itPlayerId, user?.id]);

  const isFrozen = currentPlayer?.isFrozen;
  const isEliminated = currentPlayer?.isEliminated;
  const playerTeam = currentPlayer?.team;

  const itPlayer = useMemo(() =>
    currentGame?.players?.find(p => p.id === currentGame?.itPlayerId),
    [currentGame?.players, currentGame?.itPlayerId]
  );

  const otherPlayers = useMemo(() =>
    currentGame?.players?.filter(p => p.id !== user?.id) || [],
    [currentGame?.players, user?.id]
  );

  // Memoize game mode counts
  const { frozenCount, infectedCount, survivorCount, redTeamAlive, blueTeamAlive } = useMemo(() => ({
    frozenCount: currentGame?.players?.filter(p => p.isFrozen && !p.isIt).length || 0,
    infectedCount: currentGame?.players?.filter(p => p.isIt).length || 0,
    survivorCount: currentGame?.players?.filter(p => !p.isIt && !p.isEliminated).length || 0,
    redTeamAlive: currentGame?.players?.filter(p => p.team === 'red' && !p.isEliminated).length || 0,
    blueTeamAlive: currentGame?.players?.filter(p => p.team === 'blue' && !p.isEliminated).length || 0,
  }), [currentGame?.players]);

  // Memoize hot potato and hide/seek timers
  const potatoTimeLeft = useMemo(() =>
    currentGame?.potatoExpiresAt ? Math.max(0, currentGame.potatoExpiresAt - Date.now()) : 0,
    [currentGame?.potatoExpiresAt]
  );

  const isHidingPhase = currentGame?.status === 'hiding';
  const hideTimeLeft = useMemo(() =>
    currentGame?.hidePhaseEndAt ? Math.max(0, currentGame.hidePhaseEndAt - Date.now()) : 0,
    [currentGame?.hidePhaseEndAt]
  );

  const noTagZones = useMemo(() =>
    currentGame?.settings?.noTagZones || [],
    [currentGame?.settings?.noTagZones]
  );

  // Memoized function to find nearest taggable player
  const getNearestTaggable = useCallback(() => {
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
  }, [user?.location, otherPlayers, gameMode, playerTeam, isIt]);

  // Memoize nearest player calculation result
  const { player: nearestPlayer, distance: nearestDistance } = useMemo(
    () => getNearestTaggable(),
    [getNearestTaggable]
  );
  const inTagRange = isIt && nearestPlayer && nearestDistance <= (currentGame.settings?.tagRadius || 20);
  
  // Check if tagging is allowed
  const tagCheck = canTagNow(currentGame, user?.location, nearestPlayer?.location);
  const canTag = inTagRange && tagCheck.allowed;

  // Proximity haptic feedback - escalating vibration as IT gets closer
  // This effect must be after isIt and nearestDistance are defined
  useEffect(() => {
    if (!isIt || noTagStatus.inZone || noTagStatus.inTime) return;
    
    // Determine proximity zone
    let zone = null;
    if (nearestDistance <= 10) zone = 'critical';
    else if (nearestDistance <= 25) zone = 'close';
    else if (nearestDistance <= 50) zone = 'near';
    else if (nearestDistance <= 100) zone = 'approaching';
    
    // Only vibrate when entering a new zone
    if (zone && zone !== lastProximityZoneRef.current) {
      switch (zone) {
        case 'critical':
          vibrate([50, 30, 50, 30, 100]); // Rapid pulses
          break;
        case 'close':
          vibrate([80, 40, 80]); // Strong double pulse
          break;
        case 'near':
          vibrate([60, 60]); // Medium pulse
          break;
        case 'approaching':
          vibrate([40]); // Light pulse
          break;
      }
    }
    lastProximityZoneRef.current = zone;
  }, [isIt, nearestDistance, noTagStatus.inZone, noTagStatus.inTime, vibrate]);
  
  const handleTag = useCallback(async () => {
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
  }, [inTagRange, isTagging, tagCheck, nearestPlayer, currentGame?.id, playSound, vibrate, tagPlayer]);

  const handleEndGame = useCallback(async () => {
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
  }, [isEnding, currentGame, endGame, isIt, user?.id]);

  // Memoize user location with fallback
  const userLocation = useMemo(() =>
    user?.location || { lat: 37.7749, lng: -122.4194 },
    [user?.location]
  );

  // Memoize quick action menu items
  const quickActions = useMemo(() => [
    { id: 'chat', icon: MessageCircle, label: 'Chat', onAction: () => setShowChat(true) },
    { id: 'safety', icon: Shield, label: 'Safety', onAction: () => setShowSafety(true) },
    ...(powerupInventory?.length > 0 ? [{ id: 'powerups', icon: Gift, label: 'Powerups', onAction: () => setShowPowerups(true) }] : []),
    { id: 'end', icon: Flag, label: 'End Game', onAction: () => setShowEndConfirm(true) },
  ], [powerupInventory?.length]);
  
  return (
    <div className="fixed inset-0 flex flex-col" {...(isIt && inTagRange ? swipeHandlers : {})}>
      {/* Swipe-to-tag progress indicator */}
      <SwipeProgressOverlay
        swipeProgress={swipeProgress}
        isIt={isIt}
        inTagRange={inTagRange}
      />

      {/* Collapsible Header HUD */}
      <GameHUD
        gameTime={gameTime}
        playerCount={currentGame?.players?.length || 0}
        gpsAccuracy={user?.location?.accuracy}
        hudExpanded={hudExpanded}
        setHudExpanded={setHudExpanded}
        showQuickMenu={showQuickMenu}
        setShowQuickMenu={setShowQuickMenu}
        noTagStatus={noTagStatus}
        showCountdownWarning={showCountdownWarning}
        timeRemaining={timeRemaining}
        gameMode={gameMode}
        modeConfig={modeConfig}
        frozenCount={frozenCount}
        infectedCount={infectedCount}
        survivorCount={survivorCount}
        redTeamAlive={redTeamAlive}
        blueTeamAlive={blueTeamAlive}
        formatTime={formatTime}
        getGpsQuality={getGpsQuality}
      />

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
        <NearestPlayerCard
          gameMode={gameMode}
          isIt={isIt}
          nearestPlayer={nearestPlayer}
          nearestDistance={nearestDistance}
          inTagRange={inTagRange}
          tagCheck={tagCheck}
          noTagZones={noTagZones}
        />
      </div>
      
      {/* Bottom Action Zone - Thumb Friendly */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe">
        {/* Distance/Status Bar for non-IT */}
        {!isIt && !isEliminated && !isFrozen && itPlayer?.location && user?.location && gameMode !== 'teamTag' && (
          <div className="mx-4 mb-3 card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-neon-orange" />
              <span className="text-sm font-medium">
                {gameMode === 'infection' ? `${infectedCount} infected` :
                 gameMode === 'manhunt' ? `Hunting you` :
                 `${itPlayer.name?.split(' ')[0]} is IT`}
              </span>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-high-contrast">
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
            </div>
          </div>
        )}
        
        {/* TAG Button Zone - Large touch target */}
        {!isEliminated && !isFrozen && (
          <div className="flex justify-center pb-4">
            <TagButton
              gameMode={gameMode}
              isIt={isIt}
              isTagging={isTagging}
              isHidingPhase={isHidingPhase}
              inTagRange={inTagRange}
              canTag={canTag}
              tagCheck={tagCheck}
              tagAnimation={tagAnimation}
              nearestPlayer={nearestPlayer}
              nearestDistance={nearestDistance}
              onTag={handleTag}
            />
          </div>
        )}
      </div>
      
      {/* Quick Action Menu */}
      {showQuickMenu && (
        <Suspense fallback={null}>
          <QuickActionMenu 
            isOpen={showQuickMenu}
            onClose={() => setShowQuickMenu(false)}
            actions={quickActions}
            position="right"
          />
        </Suspense>
      )}
      
      {/* Chat Panel */}
      {showChat && (
        <Suspense fallback={<div className="fixed bottom-20 right-4 z-50 card p-4">Loading chat...</div>}>
          <div className="fixed bottom-20 right-4 z-50 w-80">
            <GameChat 
              gameId={currentGame?.id}
              onClose={() => setShowChat(false)}
            />
          </div>
        </Suspense>
      )}
      
      {/* Powerups Panel */}
      {showPowerups && powerupInventory?.length > 0 && (
        <Suspense fallback={<div className="fixed bottom-20 right-4 z-50 card p-4">Loading powerups...</div>}>
          <div className="fixed bottom-20 right-4 z-50">
            <PowerupInventory
              powerups={powerupInventory}
              onUsePowerup={(id) => {
                usePowerup(id);
                playSound('powerup');
                vibrate([50, 30, 100]);
              }}
              onClose={() => setShowPowerups(false)}
            />
          </div>
        </Suspense>
      )}
      
      {/* Safety Controls Panel */}
      {showSafety && (
        <Suspense fallback={<div className="fixed bottom-20 left-4 right-4 z-50 card p-4">Loading safety...</div>}>
          <div className="fixed bottom-20 left-4 right-4 z-50">
            <SafetyControls 
              onPause={() => {
                pauseGame();
                setIsPaused(true);
                playSound('pause');
                vibrate([100, 50, 100]);
              }}
              onResume={() => {
                resumeGame();
                setIsPaused(false);
                playSound('resume');
                vibrate([100]);
              }}
              isPaused={isPaused}
              gameId={currentGame?.id}
              onClose={() => setShowSafety(false)}
            />
          </div>
        </Suspense>
      )}
      
      {/* Spectator Mode Overlay (for eliminated players) */}
      {isEliminated && spectating && (
        <Suspense fallback={<div className="absolute inset-0 z-40 bg-dark-900/90 flex items-center justify-center">Loading spectator mode...</div>}>
          <SpectatorMode 
            game={currentGame}
            players={currentGame?.players || []}
            onClose={() => setSpectating(false)}
          />
        </Suspense>
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
      
      {/* AI Commentator - shows game events */}
      <Suspense fallback={null}>
        <AICommentator event={commentaryEvent} />
      </Suspense>

      {/* Smart Quick Chat Toggle Button */}
      {!showSmartChat && (
        <button
          onClick={() => setShowSmartChat(true)}
          className="fixed bottom-40 left-4 z-30 p-3 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full shadow-lg"
          title="AI Quick Chat"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Smart Quick Chat Panel */}
      {showSmartChat && (
        <Suspense fallback={null}>
          <SmartQuickChat
            isIt={currentGame?.players?.find(p => p.id === user?.id)?.isIt}
            gameState={
              tagAnimation ? 'just_tagged' : 
              noTagStatus.inTime ? 'just_escaped' :
              currentGame?.players?.find(p => p.id === user?.id)?.isIt ? 'chasing' : 'running'
            }
            onClose={() => setShowSmartChat(false)}
            onSend={(msg) => {
              socketService.sendChatMessage(currentGame.id, msg);
              setShowSmartChat(false);
            }}
          />
        </Suspense>
      )}

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

