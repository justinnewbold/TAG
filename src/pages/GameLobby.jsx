import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Check, Play, UserPlus, Clock, Target, MapPin, Shield, Calendar, Share2, Loader2, Wifi, WifiOff, Zap, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useStore, useSounds, GAME_MODES } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import InviteModal from '../components/InviteModal';
import BottomSheet from '../components/BottomSheet';
import { SkeletonLobbyPlayer } from '../components/Skeleton';

function GameLobby() {
  const navigate = useNavigate();
  const { currentGame, user, startGame, leaveGame, syncGameState } = useStore();
  const { playSound, vibrate } = useSounds();
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Refs for cleanup
  const countdownIntervalRef = useRef(null);
  const gameStartedRef = useRef(false);

  const isHost = currentGame?.host === user?.id;
  const playerCount = currentGame?.players?.length || 0;
  const gameMode = currentGame?.gameMode || 'classic';
  const modeConfig = GAME_MODES[gameMode] || GAME_MODES.classic;
  const minPlayers = modeConfig.minPlayers || 2;
  const canStart = playerCount >= minPlayers;

  // Clean up countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Listen for game started event (for non-host players)
  useEffect(() => {
    const handleGameStarted = ({ game }) => {
      playSound('gameStart');
      vibrate([100, 100, 100, 100, 100, 100, 300]);
      syncGameState(game);
      navigate('/game');
    };

    socketService.on('game:started', handleGameStarted);

    return () => {
      socketService.off('game:started', handleGameStarted);
    };
  }, [navigate, playSound, vibrate, syncGameState]);

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentGame?.code || '');
      } else {
        // Fallback for non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = currentGame?.code || '';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      vibrate([50]);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Copy failed:', err);
    }
  };

  const handleStartGame = async () => {
    if (!canStart || isStarting || gameStartedRef.current) return;

    setIsStarting(true);
    setError('');
    setCountdown(3);
    playSound('gameStart');
    vibrate([100, 100, 100, 100, 100, 100, 300]);

    // Countdown animation
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          // Actually start the game after countdown (only once)
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
      // Try to start via API
      const { game } = await api.startGame(currentGame.id);
      syncGameState(game);
      navigate('/game');
    } catch (err) {
      if (import.meta.env.DEV) console.error('Start game error:', err);

      // Fallback to local-only mode
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        startGame();
        navigate('/game');
      } else {
        // Reset flag so user can retry
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
      // Try to leave via API
      await api.leaveGame();
      socketService.leaveGameRoom(currentGame.id);
    } catch (err) {
      console.error('Leave game error:', err);
      // Continue with local leave even if API fails
    }

    leaveGame();
    navigate('/');
  };
  
  if (!currentGame) {
    navigate('/');
    return null;
  }
  
  const formatInterval = (ms) => {
    if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))} min`;
    if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} hour${ms >= 2 * 60 * 60 * 1000 ? 's' : ''}`;
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))} day${ms >= 2 * 24 * 60 * 60 * 1000 ? 's' : ''}`;
  };
  
  const formatDuration = (ms) => {
    if (!ms) return 'Unlimited';
    if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} hours`;
    if (ms < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(ms / (24 * 60 * 60 * 1000))} days`;
    return `${Math.floor(ms / (7 * 24 * 60 * 60 * 1000))} week${ms >= 2 * 7 * 24 * 60 * 60 * 1000 ? 's' : ''}`;
  };
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowLeaveConfirm(true)} 
            className="touch-target-48 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display font-bold truncate">
              {currentGame.settings?.gameName || 'Game Lobby'}
            </h1>
            <p className="text-xs text-white/50">
              {playerCount}/{currentGame.settings?.maxPlayers} players
            </p>
          </div>
          {/* Quick settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="touch-target-48 flex items-center justify-center bg-white/5 rounded-xl"
          >
            <ChevronDown className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>
      
      {/* Game Code - Compact, tappable */}
      <div className="px-4 py-3 border-b border-white/5">
        <button
          onClick={handleCopyCode}
          className="w-full card-glow p-4 flex items-center justify-between bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl font-display font-bold tracking-widest text-neon-cyan">
              {currentGame.code}
            </span>
            {copied && <span className="text-xs text-green-400">Copied!</span>}
          </div>
          <div className="flex items-center gap-2">
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5 text-white/50" />
            )}
          </div>
        </button>
      </div>

      {/* Game Mode Badge */}
      {currentGame.gameMode && GAME_MODES[currentGame.gameMode] && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <span className="text-3xl">{GAME_MODES[currentGame.gameMode].icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">{GAME_MODES[currentGame.gameMode].name}</h3>
              <p className="text-xs text-white/50 truncate">{GAME_MODES[currentGame.gameMode].description}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Players List - Main content */}
      <div className="flex-1 overflow-y-auto px-4 pb-36">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Players
          </h3>
          <button
            onClick={() => setShowInvite(true)}
            className="touch-target-48 flex items-center gap-2 text-neon-cyan text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        </div>
        
        <div className="space-y-2">
          {currentGame.players?.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                player.id === user?.id 
                  ? 'bg-neon-cyan/10 border-2 border-neon-cyan/30' 
                  : 'bg-white/5'
              }`}
            >
              <div className="text-3xl">{player.avatar || '👤'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {player.name}
                  {player.id === user?.id && <span className="text-neon-cyan ml-2">(You)</span>}
                </p>
                <p className="text-xs text-white/40">
                  {player.id === currentGame.host ? '👑 Host' : 'Player'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {player.location ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                    <MapPin className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full">
                    <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-xs text-amber-400">GPS...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Empty slots */}
          {playerCount < minPlayers && [...Array(minPlayers - playerCount)].map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => setShowInvite(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border-2 border-dashed border-white/10 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl text-white/30">+</div>
              <div className="flex-1 text-left">
                <p className="text-white/40 font-medium">Invite player</p>
                <p className="text-xs text-white/20">Tap to share invite</p>
              </div>
            </button>
          ))}
        </div>
        
        {playerCount < minPlayers && (
          <p className="text-center text-sm text-amber-400/80 mt-6 py-4 px-6 bg-amber-500/10 rounded-xl">
            ⚠️ Need {minPlayers - playerCount} more player{minPlayers - playerCount > 1 ? 's' : ''} to start
          </p>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={!canStart || isStarting}
            className={`w-full h-16 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${
              canStart && !isStarting
                ? 'bg-gradient-to-r from-neon-cyan to-neon-purple'
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
                <Play className="w-7 h-7" />
                Start Game
              </>
            ) : (
              <span className="text-base">Waiting for {minPlayers - playerCount} more...</span>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3 h-16 bg-white/5 rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            <p className="text-white/60">Waiting for host to start...</p>
          </div>
        )}
      </div>
      
      {/* Game Settings Bottom Sheet */}
      <BottomSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Game Settings"
      >
        <div className="space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-neon-cyan mb-2" />
              <p className="text-xs text-white/50">GPS Update</p>
              <p className="font-bold">{formatInterval(currentGame.settings?.gpsInterval)}</p>
            </div>
            <div className="card p-4 text-center">
              <Target className="w-6 h-6 mx-auto text-neon-purple mb-2" />
              <p className="text-xs text-white/50">Tag Radius</p>
              <p className="font-bold">{currentGame.settings?.tagRadius}m</p>
            </div>
            <div className="card p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-neon-orange mb-2" />
              <p className="text-xs text-white/50">Max Players</p>
              <p className="font-bold">{currentGame.settings?.maxPlayers}</p>
            </div>
            <div className="card p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-amber-400 mb-2" />
              <p className="text-xs text-white/50">Duration</p>
              <p className="font-bold">{formatDuration(currentGame.settings?.duration)}</p>
            </div>
          </div>
          
          {/* Safe Zones */}
          {currentGame.settings?.noTagZones?.length > 0 && (
            <div className="card p-4">
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
          
          {/* Time Restrictions */}
          {currentGame.settings?.noTagTimes?.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-blue-400">Protected Times</span>
              </div>
              {currentGame.settings.noTagTimes.map((time) => (
                <div key={time.id} className="text-sm text-white/70">
                  {time.name}: {time.startTime} - {time.endTime}
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>
      
      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="card-glow p-6 w-full max-w-md animate-slide-up rounded-t-3xl pb-safe">
            <h2 className="text-xl font-bold mb-2 text-center">Leave Game?</h2>
            <p className="text-white/60 mb-6 text-center">
              {isHost ? "You're the host. The game will be cancelled." : "You can rejoin with the code."}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleLeave}
                disabled={isLeaving}
                className="touch-target-48 btn-primary w-full h-14 text-lg font-bold bg-red-500"
              >
                {isLeaving ? 'Leaving...' : 'Leave Game'}
              </button>
              <button 
                onClick={() => setShowLeaveConfirm(false)} 
                className="touch-target-48 btn-secondary w-full h-14 text-lg"
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
