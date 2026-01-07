import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Share2, Flame, Clock, Target, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { replayService, ReplayEventType, PlaybackSpeed } from '../services/replayService';
import { formatDistance } from '../../shared/utils';
import Avatar from '../components/Avatar';

// Animated player marker that updates position during replay
function AnimatedMarker({ position, player, isIt, showTrail, trail }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <>
      {/* Trail */}
      {showTrail && trail.length > 1 && (
        <Polyline
          positions={trail.map(p => [p.lat, p.lng])}
          color={isIt ? '#ef4444' : '#00f5ff'}
          weight={3}
          opacity={0.6}
          dashArray="5, 10"
        />
      )}
      {/* Player marker */}
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={isIt ? 14 : 10}
        fillColor={isIt ? '#ef4444' : '#00f5ff'}
        fillOpacity={0.9}
        color={isIt ? '#fca5a5' : '#67e8f9'}
        weight={3}
      >
        <Popup>
          <div className="text-center">
            <span className="text-2xl">{player?.avatar || '👤'}</span>
            <p className="font-bold text-sm">{player?.name}</p>
            {isIt && <p className="text-xs text-red-500">IT</p>}
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

// Tag event marker
function TagMarker({ position, taggerName, taggedName, timestamp }) {
  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={8}
      fillColor="#f97316"
      fillOpacity={0.8}
      color="#fdba74"
      weight={2}
    >
      <Popup>
        <div className="text-center text-xs">
          <p className="font-bold">{taggerName} tagged {taggedName}</p>
          <p className="text-gray-500">{new Date(timestamp).toLocaleTimeString()}</p>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function GameReplay() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const { games, settings, user } = useStore();
  const useImperial = settings?.useImperial ?? false;

  // Find the game
  const game = useMemo(() => {
    return games.find(g => g.id === gameId) || games.filter(g => g.status === 'ended')[0];
  }, [games, gameId]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(PlaybackSpeed.NORMAL);
  const [showTrails, setShowTrails] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Reconstruct positions from game data
  const [playerPositions, setPlayerPositions] = useState({});
  const [playerTrails, setPlayerTrails] = useState({});
  const [tagEvents, setTagEvents] = useState([]);
  const [duration, setDuration] = useState(0);

  // Initialize replay data from game
  useEffect(() => {
    if (!game) return;

    const gameDuration = game.endedAt ? game.endedAt - game.startedAt : 300000;
    setDuration(gameDuration);

    // Initialize player positions from game data
    const initialPositions = {};
    const initialTrails = {};
    game.players?.forEach(player => {
      if (player.location) {
        initialPositions[player.id] = player.location;
        initialTrails[player.id] = [player.location];
      }
    });
    setPlayerPositions(initialPositions);
    setPlayerTrails(initialTrails);

    // Get tag events
    setTagEvents(game.tags || []);
  }, [game]);

  // Simulate playback (in real implementation, would use replayService)
  useEffect(() => {
    if (!isPlaying || !game) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + (100 * speed);
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, speed, duration, game]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    setCurrentTime(Math.floor(percent * duration));
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 2, 4];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (!game?.players?.[0]?.location) {
      return [37.7749, -122.4194];
    }
    const lats = game.players.filter(p => p.location).map(p => p.location.lat);
    const lngs = game.players.filter(p => p.location).map(p => p.location.lng);
    return [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];
  }, [game]);

  // Get current IT player
  const currentItId = useMemo(() => {
    if (!game?.tags) return game?.itPlayerId;

    const tagsBeforeNow = game.tags.filter(t => {
      const tagTime = t.timestamp - game.startedAt;
      return tagTime <= currentTime;
    });

    if (tagsBeforeNow.length === 0) return game.itPlayerId;
    return tagsBeforeNow[tagsBeforeNow.length - 1].taggedId;
  }, [game, currentTime]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Play className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Game to Replay</h2>
          <p className="text-white/50 mb-4">Play some games first!</p>
          <button onClick={() => navigate('/history')} className="btn-primary">
            View History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold">Game Replay</h1>
            <p className="text-xs text-white/50">
              {game.settings?.gameName || `Game ${game.code}`} - {formatTime(duration)}
            </p>
          </div>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`p-2 rounded-xl transition-colors ${showHeatmap ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-white/10'}`}
          >
            <Flame className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Game Replay',
                  text: `Check out this TAG game replay!`,
                });
              }
            }}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Player markers */}
          {game.players?.map(player => (
            <AnimatedMarker
              key={player.id}
              position={playerPositions[player.id]}
              player={player}
              isIt={player.id === currentItId}
              showTrail={showTrails}
              trail={playerTrails[player.id] || []}
            />
          ))}

          {/* Tag events that have occurred */}
          {tagEvents
            .filter(tag => (tag.timestamp - game.startedAt) <= currentTime)
            .map((tag, i) => {
              const tagger = game.players?.find(p => p.id === tag.taggerId);
              const tagged = game.players?.find(p => p.id === tag.taggedId);
              const position = tagged?.location || tagger?.location;
              if (!position) return null;
              return (
                <TagMarker
                  key={i}
                  position={position}
                  taggerName={tagger?.name || 'Unknown'}
                  taggedName={tagged?.name || 'Unknown'}
                  timestamp={tag.timestamp}
                />
              );
            })}
        </MapContainer>

        {/* Player List Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {game.players?.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(selectedPlayer === player.id ? null : player.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  player.id === currentItId
                    ? 'bg-red-500/80 text-white'
                    : selectedPlayer === player.id
                    ? 'bg-neon-cyan/80 text-dark-900'
                    : 'bg-dark-800/80 backdrop-blur-sm'
                }`}
              >
                <span className="text-lg">{player.avatar || '👤'}</span>
                <span className="text-sm font-medium">{player.name}</span>
                {player.id === currentItId && <span className="text-xs">(IT)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-gradient-to-t from-dark-900 via-dark-900/95 to-transparent pt-8 pb-4 px-4">
          {/* Progress Bar */}
          <div
            className="relative h-2 bg-white/10 rounded-full mb-4 cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Tag event markers */}
            {tagEvents.map((tag, i) => {
              const tagProgress = ((tag.timestamp - game.startedAt) / duration) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full border-2 border-dark-900"
                  style={{ left: `${tagProgress}%` }}
                  title={`Tag at ${formatTime(tag.timestamp - game.startedAt)}`}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTime(Math.max(0, currentTime - 10000))}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-neon-cyan rounded-full text-dark-900"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={() => setCurrentTime(Math.min(duration, currentTime + 10000))}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button
                onClick={handleSpeedChange}
                className="px-3 py-1 bg-white/10 rounded-lg text-sm font-medium"
              >
                {speed}x
              </button>
              <button
                onClick={() => setShowTrails(!showTrails)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  showTrails ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/10'
                }`}
              >
                Trails
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Stats Footer */}
      <div className="bg-dark-800 border-t border-white/10 px-4 py-3">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-neon-cyan">{game.players?.length || 0}</p>
            <p className="text-xs text-white/50">Players</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-400">{game.tags?.length || 0}</p>
            <p className="text-xs text-white/50">Tags</p>
          </div>
          <div>
            <p className="text-lg font-bold text-neon-purple">{formatTime(duration)}</p>
            <p className="text-xs text-white/50">Duration</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-400">
              {game.players?.find(p => p.id === game.winnerId)?.name?.slice(0, 6) || '-'}
            </p>
            <p className="text-xs text-white/50">Winner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameReplay;
