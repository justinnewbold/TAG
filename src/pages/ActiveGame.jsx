import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Target, Users, Clock, X, Zap, AlertTriangle, Flag } from 'lucide-react';
import { useStore, useSounds } from '../store';
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

// Map controller to follow user
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
  const { currentGame, user, tagPlayer, endGame, updatePlayerLocation, games } = useStore();
  const { playSound, vibrate } = useSounds();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEndSummary, setShowEndSummary] = useState(false);
  const [endedGame, setEndedGame] = useState(null);
  const [gameTime, setGameTime] = useState(0);
  const [tagAnimation, setTagAnimation] = useState(false);
  const intervalRef = useRef(null);
  const prevItRef = useRef(null);
  
  // Update game timer
  useEffect(() => {
    if (currentGame?.startedAt) {
      intervalRef.current = setInterval(() => {
        setGameTime(Date.now() - currentGame.startedAt);
      }, 1000);
      
      return () => clearInterval(intervalRef.current);
    }
  }, [currentGame?.startedAt]);
  
  // Detect when IT changes (someone got tagged)
  useEffect(() => {
    if (currentGame?.itPlayerId && prevItRef.current !== null) {
      if (prevItRef.current !== currentGame.itPlayerId) {
        // Someone got tagged!
        if (currentGame.itPlayerId === user?.id) {
          // You got tagged!
          playSound('tagged');
          vibrate([200, 100, 200, 100, 400]);
        } else if (prevItRef.current === user?.id) {
          // You tagged someone!
          playSound('tag');
          vibrate([100, 50, 200]);
          setTagAnimation(true);
          setTimeout(() => setTagAnimation(false), 500);
        }
      }
    }
    prevItRef.current = currentGame?.itPlayerId;
  }, [currentGame?.itPlayerId, user?.id]);
  
  // Simulate other players moving
  useEffect(() => {
    const moveInterval = setInterval(() => {
      if (!currentGame || !user?.location) return;
      
      currentGame.players?.forEach((player) => {
        if (player.id !== user.id && player.id.startsWith('demo') && player.location) {
          const newLat = player.location.lat + (Math.random() - 0.5) * 0.0002;
          const newLng = player.location.lng + (Math.random() - 0.5) * 0.0002;
          updatePlayerLocation(player.id, { lat: newLat, lng: newLng });
        }
      });
    }, currentGame?.settings?.gpsInterval || 10000);
    
    return () => clearInterval(moveInterval);
  }, [currentGame, user]);
  
  // Check game duration
  useEffect(() => {
    if (currentGame?.settings?.duration && currentGame?.startedAt) {
      const remaining = currentGame.settings.duration - (Date.now() - currentGame.startedAt);
      if (remaining <= 0) {
        handleEndGame();
      }
    }
  }, [gameTime]);
  
  if (!currentGame || currentGame.status !== 'active') {
    // Check if game just ended
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
  
  // Calculate distance between two coordinates
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
  
  // Find nearest player that can be tagged
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
  const canTag = isIt && nearestPlayer && nearestDistance <= (currentGame.settings?.tagRadius || 20);
  
  const handleTag = () => {
    if (canTag && nearestPlayer) {
      tagPlayer(nearestPlayer.id);
    }
  };
  
  const handleEndGame = () => {
    const gameToEnd = { ...currentGame };
    endGame(isIt ? null : user?.id);
    setEndedGame(gameToEnd);
    setShowEndSummary(true);
  };
  
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const userLocation = user?.location || { lat: 37.7749, lng: -122.4194 };
  
  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <div className="relative z-10 bg-dark-900/90 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Game Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/50" />
                <span className="font-mono text-lg font-bold">{formatTime(gameTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/50" />
                <span>{currentGame.players?.length || 0}</span>
              </div>
            </div>
            
            {/* End Game */}
            <button
              onClick={() => setShowEndConfirm(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Flag className="w-5 h-5 text-white/50" />
            </button>
          </div>
          
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
        </div>
      </div>
      
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <MapController center={userLocation} />
          
          {/* Tag radius for IT */}
          {isIt && user?.location && (
            <Circle
              center={[user.location.lat, user.location.lng]}
              radius={currentGame.settings?.tagRadius || 20}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}
          
          {/* User marker */}
          {user?.location && (
            <Marker
              position={[user.location.lat, user.location.lng]}
              icon={createIcon(isIt ? '#f97316' : '#00f5ff', isIt, user.avatar || '🏃')}
            >
              <Popup>You {isIt ? '(IT!)' : ''}</Popup>
            </Marker>
          )}
          
          {/* Other players */}
          {otherPlayers.map((player) => {
            if (!player.location) return null;
            const isPlayerIt = player.id === currentGame.itPlayerId;
            return (
              <Marker
                key={player.id}
                position={[player.location.lat, player.location.lng]}
                icon={createIcon(
                  isPlayerIt ? '#f97316' : '#22c55e',
                  isPlayerIt,
                  player.avatar || '🏃'
                )}
              >
                <Popup>
                  {player.name} {isPlayerIt ? '(IT!)' : ''}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Nearest Player Info (for IT) */}
        {isIt && nearestPlayer && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{nearestPlayer.avatar || '🏃'}</span>
                <div>
                  <p className="font-medium text-sm">{nearestPlayer.name}</p>
                  <p className="text-xs text-white/50">Nearest target</p>
                </div>
              </div>
              <div className={`text-right ${nearestDistance <= (currentGame.settings?.tagRadius || 20) ? 'text-neon-orange' : ''}`}>
                <p className="font-bold">
                  {nearestDistance < 1000 
                    ? `${Math.round(nearestDistance)}m` 
                    : `${(nearestDistance / 1000).toFixed(1)}km`}
                </p>
                {canTag && (
                  <p className="text-xs text-neon-orange animate-pulse">In range!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* TAG Button (for IT) */}
      {isIt && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10">
          <button
            onClick={handleTag}
            disabled={!canTag}
            className={`w-32 h-32 rounded-full font-display font-bold text-2xl transition-all transform ${
              canTag
                ? 'bg-gradient-to-br from-neon-orange to-red-500 shadow-lg shadow-neon-orange/50 animate-pulse hover:scale-105 active:scale-95'
                : 'bg-white/10 text-white/30'
            } ${tagAnimation ? 'scale-110' : ''}`}
          >
            TAG!
          </button>
        </div>
      )}
      
      {/* Distance to IT (for non-IT) */}
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
                    <span className={danger ? 'text-neon-orange animate-pulse' : ''}>
                      {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                    </span>
                  );
                })()}
              </p>
              <p className="text-xs text-white/50">away</p>
            </div>
          </div>
        </div>
      )}
      
      {/* End Game Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="card-glow p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">End Game?</h2>
            <p className="text-white/60 mb-6">
              Are you sure you want to end this game? This will end the game for all players.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  handleEndGame();
                }}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Game End Summary */}
      {showEndSummary && endedGame && (
        <GameEndSummary
          game={endedGame}
          onClose={() => {
            setShowEndSummary(false);
            navigate('/');
          }}
        />
      )}
      
      {/* CSS for pulse animation */}
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
