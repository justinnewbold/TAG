import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Target, Users, Clock, X, Zap } from 'lucide-react';
import { useStore } from '../store';

// Custom marker icons
const createIcon = (color, isIt = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${isIt ? '40px' : '32px'};
        height: ${isIt ? '40px' : '32px'};
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 ${isIt ? '20px' : '10px'} ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isIt ? '20px' : '16px'};
      ">
        ${isIt ? '🏃' : '📍'}
      </div>
    `,
    iconSize: [isIt ? 40 : 32, isIt ? 40 : 32],
    iconAnchor: [isIt ? 20 : 16, isIt ? 20 : 16],
  });
};

// Map component to follow user
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
  const { currentGame, user, tagPlayer, endGame, updatePlayerLocation } = useStore();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const intervalRef = useRef(null);
  
  // Update game timer
  useEffect(() => {
    if (currentGame?.startedAt) {
      intervalRef.current = setInterval(() => {
        setGameTime(Date.now() - currentGame.startedAt);
      }, 1000);
      
      return () => clearInterval(intervalRef.current);
    }
  }, [currentGame?.startedAt]);
  
  // Simulate other players moving (demo)
  useEffect(() => {
    const moveInterval = setInterval(() => {
      if (!currentGame || !user?.location) return;
      
      currentGame.players.forEach((player) => {
        if (player.id !== user.id && player.location) {
          // Random movement within ~20m
          const newLat = player.location.lat + (Math.random() - 0.5) * 0.0002;
          const newLng = player.location.lng + (Math.random() - 0.5) * 0.0002;
          updatePlayerLocation(player.id, { lat: newLat, lng: newLng });
        }
      });
    }, currentGame?.settings.gpsInterval || 10000);
    
    return () => clearInterval(moveInterval);
  }, [currentGame, user]);
  
  if (!currentGame || currentGame.status !== 'active') {
    navigate('/');
    return null;
  }
  
  const isIt = currentGame.itPlayerId === user?.id;
  const itPlayer = currentGame.players.find((p) => p.id === currentGame.itPlayerId);
  const otherPlayers = currentGame.players.filter((p) => p.id !== user?.id);
  
  // Calculate distance between two coordinates
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
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
    if (!isIt || !user?.location) return null;
    
    let nearest = null;
    let nearestDist = Infinity;
    
    otherPlayers.forEach((player) => {
      if (player.location) {
        const dist = getDistance(
          user.location.lat, user.location.lng,
          player.location.lat, player.location.lng
        );
        if (dist < nearestDist && dist <= currentGame.settings.tagRadius) {
          nearest = player;
          nearestDist = dist;
        }
      }
    });
    
    return { player: nearest, distance: nearestDist };
  };
  
  const nearestTaggable = getNearestTaggable();
  const canTag = nearestTaggable?.player !== null;
  
  const handleTag = () => {
    if (canTag && nearestTaggable?.player) {
      tagPlayer(nearestTaggable.player.id);
    }
  };
  
  const handleEndGame = () => {
    endGame(isIt ? null : user?.id);
    navigate('/');
  };
  
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const defaultCenter = user?.location || { lat: 40.7128, lng: -74.006 };
  
  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="card p-3 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIt ? 'bg-neon-orange/20' : 'bg-neon-green/20'}`}>
              {isIt ? '🏃' : '😎'}
            </div>
            <div>
              <p className={`font-bold ${isIt ? 'text-neon-orange' : 'text-neon-green'}`}>
                {isIt ? "You're IT!" : 'Run!'}
              </p>
              <p className="text-xs text-white/50">
                {isIt ? 'Tag someone!' : `${itPlayer?.name || 'Someone'} is hunting`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-white/50">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(gameTime)}</span>
            </div>
            <p className="text-xs text-white/50">{currentGame.players.length} players</p>
          </div>
        </div>
      </div>
      
      {/* Map */}
      <div className="flex-1">
        {user?.location ? (
          <MapContainer
            center={[defaultCenter.lat, defaultCenter.lng]}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController center={user.location} />
            
            {/* Tag radius for IT player */}
            {isIt && user.location && (
              <Circle
                center={[user.location.lat, user.location.lng]}
                radius={currentGame.settings.tagRadius}
                pathOptions={{
                  color: '#f97316',
                  fillColor: '#f97316',
                  fillOpacity: 0.1,
                }}
              />
            )}
            
            {/* Current user marker */}
            {user.location && (
              <Marker
                position={[user.location.lat, user.location.lng]}
                icon={createIcon(isIt ? '#f97316' : '#00f5ff', isIt)}
              >
                <Popup>
                  <strong>You</strong>
                  {isIt && <p>You're IT! Tag someone!</p>}
                </Popup>
              </Marker>
            )}
            
            {/* Other players */}
            {otherPlayers.map((player) => {
              if (!player.location) return null;
              const playerIsIt = player.id === currentGame.itPlayerId;
              
              return (
                <Marker
                  key={player.id}
                  position={[player.location.lat, player.location.lng]}
                  icon={createIcon(playerIsIt ? '#f97316' : '#22c55e', playerIsIt)}
                >
                  <Popup>
                    <strong>{player.name}</strong>
                    {playerIsIt && <p>🏃 IT</p>}
                    {user.location && (
                      <p>
                        {Math.round(getDistance(
                          user.location.lat, user.location.lng,
                          player.location.lat, player.location.lng
                        ))}m away
                      </p>
                    )}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-dark-800">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white/60">Getting your location...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pb-28">
        <div className="max-w-md mx-auto space-y-3">
          {/* Player list */}
          <div className="card p-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {otherPlayers.map((player) => {
                const playerIsIt = player.id === currentGame.itPlayerId;
                const distance = user?.location && player.location
                  ? getDistance(user.location.lat, user.location.lng, player.location.lat, player.location.lng)
                  : null;
                
                return (
                  <div
                    key={player.id}
                    className={`flex-shrink-0 p-2 rounded-xl ${
                      playerIsIt ? 'bg-neon-orange/20' : 'bg-dark-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{player.avatar || '😎'}</span>
                      <div>
                        <p className="text-sm font-medium">{player.name}</p>
                        <p className="text-xs text-white/50">
                          {distance !== null ? `${Math.round(distance)}m` : '...'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* TAG button (only for IT) */}
          {isIt && (
            <button
              onClick={handleTag}
              disabled={!canTag}
              className={`w-full py-6 rounded-2xl font-bold text-2xl transition-all ${
                canTag
                  ? 'bg-gradient-to-r from-neon-orange to-red-500 animate-pulse-glow'
                  : 'bg-dark-700 text-white/30'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <Zap className="w-8 h-8" />
                {canTag ? `TAG ${nearestTaggable?.player?.name}!` : 'Get closer to tag!'}
              </div>
              {nearestTaggable?.distance && nearestTaggable.distance <= currentGame.settings.tagRadius && (
                <p className="text-sm font-normal mt-1 opacity-80">
                  {Math.round(nearestTaggable.distance)}m away
                </p>
              )}
            </button>
          )}
          
          {/* End game button */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="btn-danger w-full flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            End Game
          </button>
        </div>
      </div>
      
      {/* End game confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="card-glow p-6 w-full max-w-sm animate-slide-up">
            <h2 className="text-xl font-bold mb-4">End Game?</h2>
            <p className="text-white/60 mb-6">
              This will end the game for all players. Are you sure?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleEndGame} className="btn-danger flex-1">
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveGame;
