import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Play, X, Repeat, Camera, Zap } from 'lucide-react';
import { useStore } from '../store';

// Create player marker
const createPlayerMarker = (emoji, color, isIt) => L.divIcon({
  className: 'player-marker',
  html: `
    <div style="
      width: ${isIt ? '36px' : '30px'};
      height: ${isIt ? '36px' : '30px'};
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${isIt ? '18px' : '14px'};
      box-shadow: 0 0 ${isIt ? '15px' : '10px'} ${color};
      ${isIt ? 'animation: pulse 1s infinite;' : ''}
    ">
      ${emoji}
    </div>
  `,
  iconSize: [isIt ? 36 : 30, isIt ? 36 : 30],
  iconAnchor: [isIt ? 18 : 15, isIt ? 18 : 15],
});

export default function TagCam({ tagEvent, onClose }) {
  const { user } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showImpact, setShowImpact] = useState(false);
  const animationRef = useRef(null);

  // Tag event should have: tagger, tagged, taggerPath, taggedPath, tagLocation, tagRadius
  const {
    tagger,
    tagged,
    taggerPath = [],
    taggedPath = [],
    tagLocation,
    tagRadius = 20,
    timestamp,
  } = tagEvent || {};

  // Calculate map center
  const center = tagLocation || (taggerPath.length > 0 
    ? taggerPath[taggerPath.length - 1] 
    : { lat: 0, lng: 0 });

  // Play replay animation
  useEffect(() => {
    if (!isPlaying) return;

    const totalFrames = Math.max(taggerPath.length, taggedPath.length);
    
    animationRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= totalFrames - 1) {
          setIsPlaying(false);
          setShowImpact(true);
          return prev;
        }
        return prev + 1;
      });
    }, 100); // 10fps playback

    return () => clearInterval(animationRef.current);
  }, [isPlaying, taggerPath.length, taggedPath.length]);

  // Start replay
  const playReplay = () => {
    setCurrentFrame(0);
    setShowImpact(false);
    setIsPlaying(true);
  };

  // Get current positions
  const getTaggerPosition = () => {
    if (taggerPath.length === 0) return null;
    const frame = Math.min(currentFrame, taggerPath.length - 1);
    return [taggerPath[frame].lat, taggerPath[frame].lng];
  };

  const getTaggedPosition = () => {
    if (taggedPath.length === 0) return null;
    const frame = Math.min(currentFrame, taggedPath.length - 1);
    return [taggedPath[frame].lat, taggedPath[frame].lng];
  };

  // Get path up to current frame
  const getTaggerTrail = () => {
    return taggerPath.slice(0, currentFrame + 1).map(p => [p.lat, p.lng]);
  };

  const getTaggedTrail = () => {
    return taggedPath.slice(0, currentFrame + 1).map(p => [p.lat, p.lng]);
  };

  const isUserTagger = tagger?.id === user?.id;
  const isUserTagged = tagged?.id === user?.id;

  if (!tagEvent) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                TAG CAM
                <span className="px-2 py-0.5 rounded bg-red-500 text-xs animate-pulse">REPLAY</span>
              </h3>
              <p className="text-sm text-white/60">
                {tagger?.username || 'Player'} tagged {tagged?.username || 'Player'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={18}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />

        {/* Tag radius circle */}
        {tagLocation && (
          <Circle
            center={[tagLocation.lat, tagLocation.lng]}
            radius={tagRadius}
            pathOptions={{
              color: showImpact ? '#ef4444' : '#ffffff40',
              fillColor: showImpact ? '#ef444440' : '#ffffff10',
              fillOpacity: 0.3,
              weight: showImpact ? 3 : 1,
            }}
          />
        )}

        {/* Tagger trail */}
        {getTaggerTrail().length > 1 && (
          <Polyline
            positions={getTaggerTrail()}
            pathOptions={{
              color: '#ef4444',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5',
            }}
          />
        )}

        {/* Tagged player trail */}
        {getTaggedTrail().length > 1 && (
          <Polyline
            positions={getTaggedTrail()}
            pathOptions={{
              color: '#22d3ee',
              weight: 3,
              opacity: 0.8,
            }}
          />
        )}

        {/* Tagger marker */}
        {getTaggerPosition() && (
          <Marker
            position={getTaggerPosition()}
            icon={createPlayerMarker(
              tagger?.avatar || '🏃',
              '#ef4444',
              true
            )}
          />
        )}

        {/* Tagged player marker */}
        {getTaggedPosition() && (
          <Marker
            position={getTaggedPosition()}
            icon={createPlayerMarker(
              tagged?.avatar || '👤',
              '#22d3ee',
              false
            )}
          />
        )}

        {/* Impact effect */}
        {showImpact && tagLocation && (
          <>
            <Circle
              center={[tagLocation.lat, tagLocation.lng]}
              radius={5}
              pathOptions={{
                color: '#fbbf24',
                fillColor: '#fbbf24',
                fillOpacity: 1,
                weight: 0,
              }}
              className="animate-ping"
            />
          </>
        )}
      </MapContainer>

      {/* Impact overlay */}
      {showImpact && (
        <div className="absolute inset-0 pointer-events-none z-[500] flex items-center justify-center">
          <div className="text-center animate-impact">
            <div className="text-8xl mb-2">💥</div>
            <div className="text-4xl font-black text-white drop-shadow-lg">
              {isUserTagger ? 'YOU GOT THEM!' : isUserTagged ? 'TAGGED!' : 'TAG!'}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-gradient-to-t from-black/80 to-transparent p-6">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{
                width: `${(currentFrame / Math.max(taggerPath.length, taggedPath.length, 1)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={playReplay}
            disabled={isPlaying}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
              ${isPlaying
                ? 'bg-white/10 text-white/50'
                : 'bg-red-500 text-white hover:bg-red-600'
              }
            `}
          >
            {isPlaying ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Playing...
              </>
            ) : (
              <>
                <Repeat className="w-5 h-5" />
                Replay
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            Continue
          </button>
        </div>

        {/* Player info */}
        <div className="flex justify-center gap-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-white text-sm">{tagger?.username || 'Tagger'}</span>
            {isUserTagger && <span className="text-xs text-white/40">(You)</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-400" />
            <span className="text-white text-sm">{tagged?.username || 'Tagged'}</span>
            {isUserTagged && <span className="text-xs text-white/40">(You)</span>}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes impact {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-impact {
          animation: impact 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
