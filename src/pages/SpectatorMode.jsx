import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import {
  ArrowLeft, Eye, EyeOff, Radio, TrendingUp, Coins, Users,
  Zap, Target, Crown, Timer, Video, MessageCircle, Volume2,
  VolumeX, Camera, RefreshCw, ChevronDown
} from 'lucide-react';
import { useStore } from '../store';
import { spectatorService, ViewMode, PredictionType, GAME_EVENT_TYPES } from '../services/spectatorService';
import { liveCommentaryService } from '../services/liveCommentaryService';
import LiveCommentary from '../components/LiveCommentary';
import { formatDistance } from '../../shared/utils';

// Auto-pan map component
function MapController({ focus, players }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;

    if (focus.mode === 'chase' && focus.it?.location && focus.target?.location) {
      const bounds = [
        [focus.it.location.lat, focus.it.location.lng],
        [focus.target.location.lat, focus.target.location.lng],
      ];
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    } else if (focus.mode === 'follow' && focus.player?.location) {
      map.setView([focus.player.location.lat, focus.player.location.lng], 17, { animate: true });
    } else if (focus.mode === 'overview' && players.length > 0) {
      const validPlayers = players.filter(p => p.location);
      if (validPlayers.length > 0) {
        const bounds = validPlayers.map(p => [p.location.lat, p.location.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [focus, players, map]);

  return null;
}

// Excitement meter
function ExcitementMeter({ level }) {
  const getGradient = () => {
    if (level >= 80) return 'from-red-500 via-orange-500 to-yellow-500';
    if (level >= 60) return 'from-orange-500 to-yellow-500';
    if (level >= 40) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-cyan-500';
  };

  return (
    <div className="flex items-center gap-2">
      <Zap className={`w-5 h-5 ${level >= 70 ? 'text-orange-400 animate-pulse' : 'text-white/40'}`} />
      <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getGradient()} transition-all duration-500`}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className={`text-sm font-bold ${level >= 80 ? 'text-orange-400 animate-pulse' : ''}`}>
        {level >= 90 ? '🔥' : level >= 70 ? '⚡' : level >= 50 ? '👀' : '😌'}
      </span>
    </div>
  );
}

// Prediction card
function PredictionCard({ prediction, onBet, userPoints }) {
  const [betAmount, setBetAmount] = useState(10);

  const getIcon = () => {
    switch (prediction.type) {
      case PredictionType.NEXT_TAG: return <Target className="w-5 h-5" />;
      case PredictionType.WINNER: return <Crown className="w-5 h-5" />;
      case PredictionType.TAG_TIME: return <Timer className="w-5 h-5" />;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (prediction.type) {
      case PredictionType.NEXT_TAG: return 'Next Tagged';
      case PredictionType.WINNER: return 'Winner';
      case PredictionType.TAG_TIME: return 'Tag Timing';
      default: return 'Prediction';
    }
  };

  return (
    <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/60">
          {getIcon()}
          <span className="text-sm">{getTypeLabel()}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <span className="text-lg font-bold">{prediction.odds}x</span>
        </div>
      </div>

      <p className="text-xl font-bold text-neon-cyan mb-1">{prediction.prediction}</p>
      <p className="text-xs text-white/40 mb-3">{prediction.reasoning}</p>

      <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple"
            style={{ width: `${prediction.confidence}%` }}
          />
        </div>
        <span className="text-xs font-medium">{prediction.confidence}%</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 flex items-center gap-1 bg-dark-900 rounded-lg px-2 py-1">
          <Coins className="w-4 h-4 text-amber-400" />
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, Math.min(userPoints, parseInt(e.target.value) || 0)))}
            className="w-12 bg-transparent text-center text-sm font-bold"
            min="1"
            max={userPoints}
          />
        </div>
        <button
          onClick={() => onBet(prediction.type, prediction.prediction, betAmount)}
          disabled={userPoints < betAmount}
          className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-sm font-bold disabled:opacity-50"
        >
          Bet {betAmount}
        </button>
      </div>
    </div>
  );
}

// Event feed item
function EventFeedItem({ event }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
        {event.type === GAME_EVENT_TYPES.TAG ? '🎯' :
         event.type === GAME_EVENT_TYPES.NEAR_MISS ? '😰' :
         event.type === GAME_EVENT_TYPES.STREAK ? '🔥' :
         event.type === GAME_EVENT_TYPES.POWER_UP ? '⚡' : '📍'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{event.commentary || event.type}</p>
        <p className="text-xs text-white/40">{new Date(event.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

function SpectatorMode() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const { games, settings } = useStore();
  const useImperial = settings?.useImperial ?? false;

  // Find game (demo mode uses first active/ended game)
  const game = useMemo(() => {
    return games.find(g => g.id === gameId) ||
           games.find(g => g.status === 'active') ||
           games.filter(g => g.status === 'ended')[0];
  }, [games, gameId]);

  const [isSpectating, setIsSpectating] = useState(false);
  const [excitement, setExcitement] = useState(50);
  const [predictions, setPredictions] = useState([]);
  const [eventFeed, setEventFeed] = useState([]);
  const [viewMode, setViewMode] = useState(ViewMode.DRAMA_CAM);
  const [dramaFocus, setDramaFocus] = useState(null);
  const [userStats, setUserStats] = useState({ points: 100, totalBets: 0, wins: 0, accuracy: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [showPredictions, setShowPredictions] = useState(true);

  // Subscribe to spectator service
  useEffect(() => {
    const unsubscribe = spectatorService.on('predictions', setPredictions);
    const unsubExcitement = spectatorService.on('excitement', setExcitement);
    const unsubCamera = spectatorService.on('camera', setDramaFocus);
    const unsubEvent = spectatorService.on('event', (event) => {
      setEventFeed(prev => [event, ...prev.slice(0, 19)]);
    });

    return () => {
      unsubscribe();
      unsubExcitement();
      unsubCamera();
      unsubEvent();
    };
  }, []);

  // Start spectating when game available
  useEffect(() => {
    if (game && !isSpectating) {
      spectatorService.startSpectating(game.id).catch(() => {
        // Demo mode - simulate locally
        setIsSpectating(true);
      });
      setIsSpectating(true);
    }

    return () => {
      spectatorService.stopSpectating();
    };
  }, [game]);

  // Simulate game updates (in real app, this would come from socket)
  useEffect(() => {
    if (!game || !isSpectating) return;

    const interval = setInterval(() => {
      spectatorService.analyzeAndPredict(game);
      setUserStats(spectatorService.getBettingStats());
    }, 2000);

    return () => clearInterval(interval);
  }, [game, isSpectating]);

  const handleBet = useCallback((type, choice, points) => {
    const bet = spectatorService.placeBet(type, choice, points);
    if (bet) {
      setUserStats(spectatorService.getBettingStats());
    }
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    spectatorService.setViewMode(mode);
  }, []);

  // Map center
  const mapCenter = useMemo(() => {
    if (!game?.players?.[0]?.location) return [37.7749, -122.4194];
    const locs = game.players.filter(p => p.location);
    if (locs.length === 0) return [37.7749, -122.4194];
    return [
      locs.reduce((s, p) => s + p.location.lat, 0) / locs.length,
      locs.reduce((s, p) => s + p.location.lng, 0) / locs.length,
    ];
  }, [game]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Games to Spectate</h2>
          <p className="text-white/50 mb-4">Wait for active games or view replays</p>
          <button onClick={() => navigate('/history')} className="btn-primary">
            View Past Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider">Live Spectating</span>
            </div>
            <p className="text-xs text-white/50">{game.players?.length || 0} players</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400">{userStats.points}</span>
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-white/10 rounded-xl"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white/40" /> : <Volume2 className="w-5 h-5 text-neon-cyan" />}
          </button>
        </div>

        {/* Excitement meter */}
        <div className="px-4 pb-3">
          <ExcitementMeter level={excitement} />
        </div>
      </div>

      {/* Map */}
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
          <MapController focus={dramaFocus} players={game.players || []} />

          {/* Player markers */}
          {game.players?.map(player => {
            if (!player.location) return null;
            const isIt = player.id === game.itPlayerId;

            return (
              <CircleMarker
                key={player.id}
                center={[player.location.lat, player.location.lng]}
                radius={isIt ? 14 : 10}
                fillColor={isIt ? '#ef4444' : '#00f5ff'}
                fillOpacity={0.9}
                color={isIt ? '#fca5a5' : '#67e8f9'}
                weight={3}
              >
                <Popup>
                  <div className="text-center">
                    <span className="text-2xl">{player.avatar || '👤'}</span>
                    <p className="font-bold text-sm">{player.name}</p>
                    {isIt && <p className="text-xs text-red-500">IT</p>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Camera mode selector */}
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { mode: ViewMode.DRAMA_CAM, icon: <Video className="w-4 h-4" />, label: 'Drama Cam' },
              { mode: ViewMode.FOLLOW_IT, icon: <Target className="w-4 h-4" />, label: 'Follow IT' },
              { mode: ViewMode.OVERVIEW, icon: <Users className="w-4 h-4" />, label: 'Overview' },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  viewMode === mode
                    ? 'bg-neon-cyan text-dark-900'
                    : 'bg-dark-800/80 backdrop-blur-sm'
                }`}
              >
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Commentary overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <LiveCommentary compact />
        </div>
      </div>

      {/* Predictions panel */}
      <div className="bg-dark-800 border-t border-white/10">
        <button
          onClick={() => setShowPredictions(!showPredictions)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-purple" />
            <span className="font-bold">AI Predictions</span>
            <span className="text-xs bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full">
              {predictions.length} active
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${showPredictions ? 'rotate-180' : ''}`} />
        </button>

        {showPredictions && (
          <div className="px-4 pb-4">
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div className="bg-white/5 rounded-lg px-2 py-2">
                <p className="text-lg font-bold text-amber-400">{userStats.points}</p>
                <p className="text-[10px] text-white/40">Points</p>
              </div>
              <div className="bg-white/5 rounded-lg px-2 py-2">
                <p className="text-lg font-bold">{userStats.totalBets}</p>
                <p className="text-[10px] text-white/40">Bets</p>
              </div>
              <div className="bg-white/5 rounded-lg px-2 py-2">
                <p className="text-lg font-bold text-green-400">{userStats.wins}</p>
                <p className="text-[10px] text-white/40">Wins</p>
              </div>
              <div className="bg-white/5 rounded-lg px-2 py-2">
                <p className="text-lg font-bold">{userStats.accuracy}%</p>
                <p className="text-[10px] text-white/40">Accuracy</p>
              </div>
            </div>

            {/* Predictions */}
            {predictions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {predictions.map((pred, i) => (
                  <PredictionCard
                    key={`${pred.type}-${i}`}
                    prediction={pred}
                    onBet={handleBet}
                    userPoints={userStats.points}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Analyzing game state...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event feed (collapsible) */}
      {eventFeed.length > 0 && (
        <div className="bg-dark-900 border-t border-white/10 max-h-40 overflow-y-auto">
          <div className="px-4 py-2">
            <p className="text-xs text-white/40 mb-2">Recent Events</p>
            {eventFeed.slice(0, 5).map((event, i) => (
              <EventFeedItem key={event.timestamp + i} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpectatorMode;
