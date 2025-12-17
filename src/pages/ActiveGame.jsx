import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Target, Users, Clock, X, Zap, AlertTriangle, Flag, Shield, Calendar, Loader2 } from 'lucide-react';
import { useStore, useSounds, isInNoTagTime, isInNoTagZone, canTagNow } from '../store';
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
          setTimeout(() => setTagAnimation(false), 500);
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
  
  if (!currentGame || currentGame.status !== 'active') {
    const lastGame = games.filter(g => g.status === 'ended').sort((a, b) => b.endedAt - a.endedAt)[0];
    if (lastGame && Date.now() - lastGame.endedAt < 5000) {
      return <GameEndSummary game={lastGame} onClose={() => navigate('/')} />;
    }
    navigate('/');
    return null;
  }
  
  const isIt = currentGame.itPlayerId === user?.id;
  const itPlayer = currentGame.players?.find((p) => p.id === currentGame.itPlayerId);
  const otherPlayers = currentGame.players?.filter((p) => p.id !== user?.id) || [];
  
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
    if (!isIt || !user?.location) return { player: null, distance: Infinity };
    
    let nearest = null;
    let nearestDist = Infinity;
    
    otherPlayers.forEach((player) => {
      if (player.location) {
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
      setTimeout(() => setTagError(null), 3000);
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
          setTimeout(() => setTagAnimation(false), 500);
        }
      } catch (err) {
        console.error('Tag error:', err);

        // Fallback to local tag if server unavailable
        if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
          const result = tagPlayer(nearestPlayer.id);
          if (result.success) {
            playSound('tag');
            vibrate([100, 50, 200]);
            setTagAnimation(true);
            setTimeout(() => setTagAnimation(false), 500);
          }
        } else {
          setTagError(err.message || 'Failed to tag');
          playSound('error');
          vibrate([100, 50, 100]);
          setTimeout(() => setTagError(null), 3000);
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
      console.error('End game error:', err);

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
          
          {/* IT Status */}
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
                    <p className="font-display font-bold text-neon-orange">YOU'RE IT!</p>
                    <p className="text-xs text-white/50">Tag someone to pass it on!</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-neon-cyan" />
                  <div>
                    <p className="font-display font-bold text-neon-cyan">{itPlayer?.name} is IT!</p>
                    <p className="text-xs text-white/50">Run and hide!</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
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
                noTagStatus.inZone ? '#22c55e' : (isIt ? '#f97316' : '#00f5ff'),
                isIt && !noTagStatus.inZone,
                user.avatar || '🏃'
              )}
            >
              <Popup>You {isIt ? '(IT!)' : ''} {noTagStatus.inZone ? '(Safe)' : ''}</Popup>
            </Marker>
          )}
          
          {/* Other players */}
          {otherPlayers.map((player) => {
            if (!player.location) return null;
            const isPlayerIt = player.id === currentGame.itPlayerId;
            const playerInZone = isInNoTagZone(player.location, noTagZones);
            return (
              <Marker
                key={player.id}
                position={[player.location.lat, player.location.lng]}
                icon={createIcon(
                  playerInZone ? '#22c55e' : (isPlayerIt ? '#f97316' : '#22c55e'),
                  isPlayerIt && !playerInZone,
                  player.avatar || '🏃'
                )}
              >
                <Popup>
                  {player.name} {isPlayerIt ? '(IT!)' : ''} {playerInZone ? '(Safe)' : ''}
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
                <span className="text-xl">{nearestPlayer.avatar || '🏃'}</span>
                <div>
                  <p className="font-medium text-sm">{nearestPlayer.name}</p>
                  <p className="text-xs text-white/50">
                    {isInNoTagZone(nearestPlayer.location, noTagZones) ? '🛡️ In Safe Zone' : 'Nearest target'}
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
      </div>
      
      {/* TAG Button */}
      {isIt && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10">
          <button
            onClick={handleTag}
            disabled={!inTagRange || isTagging}
            className={`w-32 h-32 rounded-full font-display font-bold text-2xl transition-all transform ${
              canTag && !isTagging
                ? 'bg-gradient-to-br from-neon-orange to-red-500 shadow-lg shadow-neon-orange/50 animate-pulse hover:scale-105 active:scale-95'
                : inTagRange && !tagCheck.allowed
                ? 'bg-yellow-500/50 text-yellow-200'
                : 'bg-white/10 text-white/30'
            } ${tagAnimation ? 'scale-110' : ''}`}
          >
            {isTagging ? (
              <Loader2 className="w-10 h-10 animate-spin mx-auto" />
            ) : !inTagRange ? 'TAG!' : !tagCheck.allowed ? '🛡️' : 'TAG!'}
          </button>
        </div>
      )}
      
      {/* Distance to IT (non-IT players) */}
      {!isIt && itPlayer?.location && user?.location && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-neon-orange" />
              <span className="font-medium">{itPlayer.name} is IT</span>
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
